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

    const originalCode = editor.document.getText(editor.selection);
    const modifiedCode = responseText.trim();

    // Compare the original and modified code to see if there's a change
    if (originalCode === modifiedCode) {
        vscode.window.showInformationMessage("No changes detected.");
        return;
    }

    // Create two virtual documents to display both original and modified code
    const originalUri = vscode.Uri.parse('untitled:OriginalCode');
    const modifiedUri = vscode.Uri.parse('untitled:ModifiedCode');

    // Write the contents into the virtual documents
    const originalDoc = await vscode.workspace.openTextDocument(originalUri);
    const modifiedDoc = await vscode.workspace.openTextDocument(modifiedUri);

    const originalEdit = new vscode.WorkspaceEdit();
    originalEdit.insert(originalUri, new vscode.Position(0, 0), originalCode);
    await vscode.workspace.applyEdit(originalEdit);

    const modifiedEdit = new vscode.WorkspaceEdit();
    modifiedEdit.insert(modifiedUri, new vscode.Position(0, 0), modifiedCode);
    await vscode.workspace.applyEdit(modifiedEdit);

    // Show the diff view (side-by-side comparison)
    await vscode.commands.executeCommand('vscode.diff', originalUri, modifiedUri, 'Code Changes');

    // Ask user for confirmation to accept or reject changes
    const userChoice = await vscode.window.showQuickPick(["Accept", "Reject"], {
        placeHolder: "Do you want to accept the changes?",
        ignoreFocusOut: true
    });

    if (userChoice === "Accept") {
        // Apply the modified code to the active editor if accepted
        const edit = new vscode.WorkspaceEdit();
        edit.replace(editor.document.uri, editor.selection, modifiedCode);
        await vscode.workspace.applyEdit(edit);
        vscode.window.showInformationMessage("Code updated successfully.");
    } else {
        vscode.window.showInformationMessage("Code update rejected.");
        // No changes to the active document (no edit applied)
        // Optionally, you can do nothing here or restore to original code if needed
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
