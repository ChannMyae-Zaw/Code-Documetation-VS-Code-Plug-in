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

        // Use extension context to get settings
        const apiKey = context.globalState.get<string>('apiKey');
        const documentationFile = context.globalState.get<string>('documentationFile');
        
        if (!apiKey) {
            vscode.window.showErrorMessage("API key is not set. Please configure it in the Primary Sidebar.");
            return;
        }

        const detailLevel = await InputUtils.getDetailLevelFromUser();
        if (!detailLevel) return;

        // Prepare request data
        const formData = new FormData();
        if (documentationFile) {
            formData.append('file', fs.createReadStream(documentationFile), path.basename(documentationFile));
        }
        formData.append('prompt', code);
        formData.append('apiKey', apiKey);
        formData.append('detailLevel', detailLevel);

        try {
            const response = await axios.post('http://localhost:5000/api/chat', formData, {
                headers: formData.getHeaders(),
            });

            if (response.data?.response) {
                await DiffService.processResponse(response.data.response);
            } else {
                vscode.window.showErrorMessage("No response from backend.");
            }
        } catch (error: any) {
            vscode.window.showErrorMessage(`Error: ${error.message}`);
        }
    }
}

