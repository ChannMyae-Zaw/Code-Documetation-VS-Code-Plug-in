import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
import FormData from 'form-data';

// Step 1: Get File from User (Optional)
async function getFileFromUser(): Promise<{ filePath: string, fileName: string } | null> {
    const selectedFile = await vscode.window.showOpenDialog({
        canSelectMany: false,
        filters: {
            'PDF Files': ['pdf'],
            'Text Files': ['txt'],
        }
    });

    if (!selectedFile || selectedFile.length === 0) {
        return null;
    }

    return {
        filePath: selectedFile[0].fsPath,
        fileName: path.basename(selectedFile[0].fsPath)
    };
}

// Step 2: Get Code from User (Required)
async function getCodeFromUser(): Promise<string | null> {
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

// Step 3: Get API Key from User (Required)
async function getApiKeyFromUser(): Promise<string | null> {
    const apiKey = await vscode.window.showInputBox({
        placeHolder: 'Enter your OpenAI API key',
        ignoreFocusOut: true
    });

    if (!apiKey) {
        vscode.window.showErrorMessage('API key is required.');
        return null;
    }

    return apiKey;
}

// Step 4: Get Detail Level from User (Required)
async function getDetailLevelFromUser(): Promise<string | null> {
    return await vscode.window.showQuickPick(
        ['basic', 'intermediate', 'advanced'],
        { placeHolder: 'Select the level of detail', ignoreFocusOut: true }
    ) || null;
}

// Step 5: Process Backend Response and Show Diff View (GitHub Merge Resolver Style)
async function processResponse(responseText: string) {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;

    const document = editor.document;
    const selection = editor.selection;

    if (selection.isEmpty) {
        vscode.window.showErrorMessage("No code selected.");
        return;
    }

    const originalCode = document.getText(); // Get full document text
    const selectedText = document.getText(selection);
    const modifiedCode = responseText.trim();

    if (selectedText === modifiedCode) {
        vscode.window.showInformationMessage("No changes detected.");
        return;
    }

    // Construct a version of the document with the modified selection
    const updatedCode =
        originalCode.substring(0, document.offsetAt(selection.start)) + 
        modifiedCode + 
        originalCode.substring(document.offsetAt(selection.end));

    // Create virtual document URI for modified content
    const modifiedUri = vscode.Uri.parse(`untitled:${document.fileName}-modified`);

    // Open the modified document in-memory
    const modifiedDoc = await vscode.workspace.openTextDocument(modifiedUri);
    const edit = new vscode.WorkspaceEdit();
    edit.insert(modifiedUri, new vscode.Position(0, 0), updatedCode);
    await vscode.workspace.applyEdit(edit);

    // Show the diff view with full document context
    await vscode.commands.executeCommand('vscode.diff', document.uri, modifiedUri, 'Code Changes');

    // Ask the user to accept or reject the changes
    const result = await vscode.window.showQuickPick(['Accept', 'Reject'], {
        placeHolder: 'Do you want to accept the changes?',
        ignoreFocusOut: true
    });

    if (result === 'Accept') {
        // Apply the changes to the document
        const applyEdit = new vscode.WorkspaceEdit();
        applyEdit.replace(editor.document.uri, selection, modifiedCode);
        await vscode.workspace.applyEdit(applyEdit);
        vscode.window.showInformationMessage("Code updated successfully.");
    } else {
        // Reject the changes
        vscode.window.showInformationMessage("Code update rejected.");
    }
}

// Step 6: Gather Data and Send to Backend
async function gatherDataAndSendToBackend() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;

    const code = await getCodeFromUser();
    if (!code) return;

    const apiKey = await getApiKeyFromUser();
    if (!apiKey) return;

    const detailLevel = await getDetailLevelFromUser();
    if (!detailLevel) return;

    // Optional: Ask if the user wants to attach a file
    const attachFile = await vscode.window.showQuickPick(['Yes', 'No'], {
        placeHolder: 'Do you want to attach a file?',
        ignoreFocusOut: true
    });

    let fileData = null;
    if (attachFile === 'Yes') {
        fileData = await getFileFromUser();
    }

    // Prepare form data
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

        const responseData = response.data;
        if (responseData && responseData.response) {
            await processResponse(responseData.response);
        } else {
            vscode.window.showErrorMessage("No response from backend.");
        }
    } catch (error: any) {
        vscode.window.showErrorMessage(`Error: ${error.message}`);
    }
}

// Activate the extension
export function activate(context: vscode.ExtensionContext) {
    let disposable = vscode.commands.registerCommand('code-documentation.sendToBackend', async function () {
        await gatherDataAndSendToBackend();
    });

    context.subscriptions.push(disposable);
}

// Deactivate the extension
export function deactivate() {}
