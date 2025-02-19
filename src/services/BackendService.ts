import * as vscode from 'vscode';
import axios from 'axios';
import FormData from 'form-data';
import * as fs from 'fs';
import { DiffService } from './DiffService';
import { InputUtils } from '../utils/InputUtils';

export class BackendService {
    static async gatherDataAndSendToBackend() {
        const editor = vscode.window.activeTextEditor;
        if (!editor) return;

        const code = await InputUtils.getCodeFromUser();
        if (!code) return;

        const apiKey = await InputUtils.getApiKeyFromUser();
        if (!apiKey) return;

        const detailLevel = await InputUtils.getDetailLevelFromUser();
        if (!detailLevel) return;

        // Optional: File selection
        const attachFile = await vscode.window.showQuickPick(['Yes', 'No'], {
            placeHolder: 'Do you want to attach a file?',
            ignoreFocusOut: true
        });

        let fileData = null;
        if (attachFile === 'Yes') {
            fileData = await InputUtils.getFileFromUser();
        }

        // Prepare request data
        const formData = new FormData();
        if (fileData) {
            formData.append('file', fs.createReadStream(fileData.filePath), fileData.fileName);
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
