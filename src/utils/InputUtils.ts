import * as vscode from 'vscode';
import * as path from 'path';

export class InputUtils {
    static async getFileFromUser(): Promise<{ filePath: string, fileName: string } | null> {
        const selectedFile = await vscode.window.showOpenDialog({
            canSelectMany: false,
            filters: { 'PDF Files': ['pdf'], 'Text Files': ['txt'] }
        });

        if (!selectedFile || selectedFile.length === 0) return null;
        return { filePath: selectedFile[0].fsPath, fileName: path.basename(selectedFile[0].fsPath) };
    }

    static async getCodeFromUser(): Promise<string | null> {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active editor found.');
            return null;
        }

        const selectedText = editor.document.getText(editor.selection);
        if (!selectedText) {
            vscode.window.showErrorMessage('No code selected.');
            return null;
        }

        return selectedText;
    }

    static async getApiKeyFromUser(): Promise<string | null> {
        const apiKey = await vscode.window.showInputBox({ placeHolder: 'Enter your OpenAI API key', ignoreFocusOut: true });
        if (!apiKey) {
            vscode.window.showErrorMessage('API key is required.');
            return null;
        }
        return apiKey;
    }

    static async getDetailLevelFromUser(): Promise<string | null> {
        return await vscode.window.showQuickPick(['basic', 'intermediate', 'advanced'], { placeHolder: 'Select the level of detail', ignoreFocusOut: true }) || null;
    }
}
