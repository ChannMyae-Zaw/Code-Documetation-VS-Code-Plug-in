import * as vscode from 'vscode';
import axios from 'axios';
import FormData from 'form-data';
import * as fs from 'fs';
import { DiffService } from './DiffService';
import * as path from 'path';
import { InputUtils } from '../utils/InputUtils';

export class BackendService {
    static async gatherDataAndSendToBackend(context: vscode.ExtensionContext) {
        const editor = vscode.window.activeTextEditor;
        if (!editor) return;

        const code = await InputUtils.getCodeFromUser();
        if (!code) return;

        const apiKey = context.globalState.get<string>('apiKey');
        const documentationFilePath = context.globalState.get<string>('documentationFilePath');
        const detailLevel = context.globalState.get<string>('detailLevel') || 'Basic';
        const renameVariables = context.globalState.get<boolean>('renameVariables') || false;
        const addComments = context.globalState.get<boolean>('addComments') || false;

        if (!apiKey) {
            vscode.window.showErrorMessage("API key is not set. Please configure it in the Primary Sidebar.");
            return;
        }

        if (documentationFilePath && !fs.existsSync(documentationFilePath)) {
            vscode.window.showErrorMessage("Documentation file not found. Please upload a file in the Primary Sidebar.");
            return;
        }

        if (!renameVariables && !addComments) {
            vscode.window.showErrorMessage("Please select at least one transformation option in the Primary Sidebar.");
            return;
        }

        try {
            let renameResponse = '';
            let commentResponse = '';

            if (renameVariables) {
                const renameFormData = new FormData();
                if (documentationFilePath) {
                    renameFormData.append('file', fs.createReadStream(documentationFilePath), path.basename(documentationFilePath));
                }
                renameFormData.append('prompt', code);
                renameFormData.append('apiKey', apiKey);
                renameFormData.append('renameVariables', 'true');
                renameFormData.append('addComments', 'false');

                const renameResult = await axios.post('http://localhost:5000/api/chat', renameFormData, {
                    headers: renameFormData.getHeaders(),
                });
                renameResponse = renameResult.data?.response || code;
                console.log("Rename Response:", renameResponse);
            }

            if (addComments) {
                const commentFormData = new FormData();
                if (documentationFilePath) {
                    commentFormData.append('file', fs.createReadStream(documentationFilePath), path.basename(documentationFilePath));
                }
                commentFormData.append('prompt', code); // Only send selected code :/
                commentFormData.append('apiKey', apiKey);
                commentFormData.append('renameVariables', 'false');
                commentFormData.append('addComments', 'true');
                commentFormData.append('detailLevel', detailLevel);

                const commentResult = await axios.post('http://localhost:5000/api/chat', commentFormData, {
                    headers: commentFormData.getHeaders(),
                });
                commentResponse = commentResult.data?.response || code;
                console.log("Comment Response:", commentResponse);
            }

            await DiffService.processResponse({
                originalCode: code,
                renamedCode: renameVariables ? renameResponse : code,
                commentedCode: addComments ? commentResponse : code,
            });

        } catch (error: any) {
            if (error.code === 'ENOENT') {
                vscode.window.showErrorMessage(`File not found: ${documentationFilePath}`);
            } else {
                vscode.window.showErrorMessage(`Error: ${error.message}`);
            }
            console.error('Backend service error:', error);
        }
    }
}