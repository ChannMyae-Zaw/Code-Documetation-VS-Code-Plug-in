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
        // Define default documentation file path
        const defaultDocPath = context.asAbsolutePath('src/resources/default_documentation.pdf');

        const apiKey = context.globalState.get<string>('apiKey');
        const apiKeyType = context.globalState.get<string>('apiKeyType') || 'OpenAI'; 
        const documentationFilePath = context.globalState.get<string>('documentationFilePath');
        const detailLevel = context.globalState.get<string>('detailLevel') || 'Basic';
        const featureType = args?.featureType || context.globalState.get<string>('featureType') || 'Comments';
        
        if (!apiKey) {
            vscode.window.showErrorMessage("API key is not set. Please configure it in the Primary Sidebar.");
            return;
        }

        // Verify file exists
        let docPathToUse = documentationFilePath;
        if (!docPathToUse || !fs.existsSync(docPathToUse)) {
            if (fs.existsSync(defaultDocPath)) {
                docPathToUse = defaultDocPath;
                vscode.window.showInformationMessage("Using default documentation file.");
            } else {
                vscode.window.showErrorMessage("No documentation file found. Please upload one or ensure the default file exists.");
                return;
            }
        }

        // Prepare request data
        const formData = new FormData();
        try {
            // Use the correct file path from globalState
            formData.append('file', fs.createReadStream(docPathToUse), path.basename(docPathToUse));
            formData.append('prompt', code);
            formData.append('apiKey', apiKey);
            formData.append('apiKeyType', apiKeyType); 
            formData.append('detailLevel', detailLevel);
            formData.append('featureType', featureType);

            const response = await axios.post('https://backend-vs-plug-in.onrender.com/api/chat', formData, {
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
                        await this.handleBothFeatures(context, code, apiKey, apiKeyType, docPathToUse, detailLevel);
                        break;
                    default:
                        vscode.window.showErrorMessage(`Unknown feature type: ${featureType}`);
                }
            } else {
                vscode.window.showErrorMessage("No response from backend.");
            }
        } catch (error: any) {
            if (error.code === 'ENOENT') {
                vscode.window.showErrorMessage(`File not found: ${docPathToUse}`);
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
        apiKeyType: string, 
        documentationFilePath: string,
        detailLevel: string
    ) {
        const formData = new FormData();
        formData.append('file', fs.createReadStream(documentationFilePath), path.basename(documentationFilePath));
        formData.append('prompt', code);
        formData.append('apiKey', apiKey);
        formData.append('apiKeyType', apiKeyType); 
        formData.append('detailLevel', detailLevel);
        formData.append('featureType', 'Rename'); 

        try {
            const response = await axios.post('https://backend-vs-plug-in.onrender.com/api/chat', formData, {
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