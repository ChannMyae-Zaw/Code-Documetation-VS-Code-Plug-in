import * as vscode from 'vscode';

export class DiffService {
    static async processResponse(responseText: string) {
        const editor = vscode.window.activeTextEditor;
        if (!editor) return;

        const document = editor.document;
        const selection = editor.selection;

        if (selection.isEmpty) {
            vscode.window.showErrorMessage("No code selected.");
            return;
        }

        const originalCode = document.getText();
        const selectedText = document.getText(selection);
        const modifiedCode = responseText.trim();

        if (selectedText === modifiedCode) {
            vscode.window.showInformationMessage("No changes detected.");
            return;
        }

        // Create a new document with modified content
        const modifiedUri = vscode.Uri.parse(`untitled:${document.fileName}-modified`);
        const modifiedDoc = await vscode.workspace.openTextDocument(modifiedUri);
        const edit = new vscode.WorkspaceEdit();
        edit.insert(modifiedUri, new vscode.Position(0, 0), originalCode.replace(selectedText, modifiedCode));
        await vscode.workspace.applyEdit(edit);

        // Show diff view
        await vscode.commands.executeCommand('vscode.diff', document.uri, modifiedUri, 'Code Changes');
        await vscode.commands.executeCommand('setContext', 'code-documentation.showSecondarySidebar', true);


        // Prompt user for action
        const result = await vscode.window.showQuickPick(['Accept', 'Reject'], {
            placeHolder: 'Do you want to accept the changes?',
            ignoreFocusOut: true
        });

        if (result === 'Accept') {
            const applyEdit = new vscode.WorkspaceEdit();
            applyEdit.replace(document.uri, selection, modifiedCode);
            await vscode.workspace.applyEdit(applyEdit);
            vscode.window.showInformationMessage("Code updated successfully.");
        } else {
            vscode.window.showInformationMessage("Code update rejected.");
        }
        await vscode.commands.executeCommand('workbench.action.closeActiveEditor'); 

        // Close the secondary sidebar
        await vscode.commands.executeCommand('setContext', 'code-documentation.showSecondarySidebar', false);
    }
}
