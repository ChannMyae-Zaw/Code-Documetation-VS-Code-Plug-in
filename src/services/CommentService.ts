import * as vscode from 'vscode';

export class CommentService {
    static async processCommentGeneration(responseText: string) {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage("No active editor found.");
            return;
        }

        const { document, selection } = editor;
        if (selection.isEmpty) {
            vscode.window.showErrorMessage("No code selected.");
            return;
        }

        const selectedText = document.getText(selection);
        const modifiedCode = responseText.trim();

        if (selectedText === modifiedCode) {
            vscode.window.showInformationMessage("No changes detected in the code.");
            return;
        }

        // Apply the changes directly, it will not be shown on diff view or secondary sidebar~
        const edit = new vscode.WorkspaceEdit();
        edit.replace(document.uri, selection, modifiedCode);
        
        const success = await vscode.workspace.applyEdit(edit);
        if (success) {
            vscode.window.showInformationMessage("Comments generated and applied successfully. Please use Ctrl+Z to undo if needed.");
        } else {
            vscode.window.showErrorMessage("Failed to apply comments to the code.");
        }
    }
}