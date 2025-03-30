import * as vscode from 'vscode';
import axios from 'axios';
import FormData from 'form-data';
import * as fs from 'fs';
import { DiffService } from './DiffService';
import { CommentService } from './CommentService';
import * as path from 'path';
import { InputUtils } from '../utils/InputUtils';

export class BackendService {
    static async gatherDataAndSendToBackend(context: vscode.ExtensionContext, args?: any) {
        const editor = vscode.window.activeTextEditor;
        if (!editor) return;

        const code = await InputUtils.getCodeFromUser();
        if (!code) return;

        // Get settings from globalState!!!
        const apiKey = context.globalState.get<string>('apiKey');
        const documentationFilePath = context.globalState.get<string>('documentationFilePath');
        const detailLevel = context.globalState.get<string>('detailLevel') || 'Basic';
        const featureType = args?.featureType || context.globalState.get<string>('featureType') || 'Comments';
        
        if (!apiKey) {
            vscode.window.showErrorMessage("API key is not set. Please configure it in the Primary Sidebar.");
            return;
        }

        // Verify file exists
        if (!documentationFilePath || !fs.existsSync(documentationFilePath)) {
            vscode.window.showErrorMessage("Documentation file not found. Please upload a file in the Primary Sidebar.");
            return;
        }

        // Prepare request data
        const formData = new FormData();
        try {
            // Use the correct file path from globalState
            formData.append('file', fs.createReadStream(documentationFilePath), path.basename(documentationFilePath));
            formData.append('prompt', code);
            formData.append('apiKey', apiKey);
            formData.append('detailLevel', detailLevel);
            formData.append('featureType', featureType);

            const response = await axios.post('http://localhost:5000/api/chat', formData, {
                headers: formData.getHeaders(),
            });

            if (response.data?.response) {
                // Logic for appropriate service based on featureType user selected
                switch(featureType) {
                    case 'Comments':
                        await CommentService.processCommentGeneration(response.data.response);
                        break;
                    case 'Rename':
                        await DiffService.processResponse(response.data.response);
                        break;
                    case 'Both':
                        await CommentService.processCommentGeneration(response.data.response);
                        await this.handleBothFeatures(context, code, apiKey, documentationFilePath, detailLevel);
                        break;
                    default:
                        vscode.window.showErrorMessage(`Unknown feature type: ${featureType}`);
                }
            } else {
                vscode.window.showErrorMessage("No response from backend.");
            }
        } catch (error: any) {
            if (error.code === 'ENOENT') {
                vscode.window.showErrorMessage(`File not found: ${documentationFilePath}`);
            } else {
                vscode.window.showErrorMessage(`Error: ${error.message}`);
            }
            console.error('Backend service error:', error);
        }
    }

    private static async handleBothFeatures(
        context: vscode.ExtensionContext, 
        code: string, 
        apiKey: string, 
        documentationFilePath: string,
        detailLevel: string
    ) {
        const formData = new FormData();
        formData.append('file', fs.createReadStream(documentationFilePath), path.basename(documentationFilePath));
        formData.append('prompt', code);
        formData.append('apiKey', apiKey);
        formData.append('detailLevel', detailLevel);
        formData.append('featureType', 'Rename'); 

        try {
            const response = await axios.post('http://localhost:5000/api/chat', formData, {
                headers: formData.getHeaders(),
            });

            if (response.data?.response) {
                await DiffService.processResponse(response.data.response);
            }
        } catch (error: any) {
            vscode.window.showErrorMessage(`Error processing variable renaming: ${error.message}`);
        }
    }
}