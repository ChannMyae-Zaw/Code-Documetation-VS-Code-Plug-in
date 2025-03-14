import * as vscode from 'vscode';
import * as os from 'os';
import { SymbolExtractor } from './SymbolExtractor';
import path from 'path';

export class DiffService {

    private static renamedSymbolsMap: Map<any, any> = new Map();

    static async processResponse(responseText: string) {
        const editor = vscode.window.activeTextEditor;
        if (!editor) return;

        const { document, selection } = editor;
        if (selection.isEmpty) {
            vscode.window.showErrorMessage("No code selected.");
            return;
        }

        const selectedText = document.getText(selection);

        const originalSymbols = await SymbolExtractor.getSymbols(document);
        console.log("Original Symbols:", originalSymbols);

        const modifiedCode = responseText.trim();

        if (selectedText === modifiedCode) {
            vscode.window.showInformationMessage("No changes detected.");
            return;
        }

        // Create a temporary document to extract symbols from AI-modified code
        const originalContent = document.getText(); // Full content of the file
        const originalLanguage = document.languageId; // Get language of original file
        const timestamp = Date.now();
        const tempFilePath = path.join(os.tmpdir(), `tempFile_${timestamp}.${document.fileName.split('.').pop()}`);
        const tempFileUri = vscode.Uri.file(tempFilePath);
        
        // Replace selection with AI response
        const newContent =
            originalContent.substring(0, document.offsetAt(selection.start)) + 
            modifiedCode + 
            originalContent.substring(document.offsetAt(selection.end));
        
        await vscode.workspace.fs.writeFile(tempFileUri, Buffer.from(newContent, 'utf8'));
        const tempDoc = await vscode.workspace.openTextDocument(tempFileUri);
        
        console.log("Temp File Path:", tempFileUri.path);
        const fileExists = await this.checkIfFileExists(tempFileUri);
        console.log("File exists:", fileExists);
        console.log("Temp File Language:", tempDoc.languageId);
        console.log("Temp File Content:", tempDoc.getText());
        
        const modifiedSymbols = await SymbolExtractor.getSymbols(tempDoc);
        console.log("Modified Symbols:", modifiedSymbols);

        // Compare and find renamed symbols
        this.renamedSymbolsMap = await this.findRenamedSymbols(originalSymbols, modifiedSymbols);
        console.log("Renamed Symbols Map:", this.renamedSymbolsMap);
        console.log("Keys:", Array.from(this.renamedSymbolsMap.keys()));

        await vscode.workspace.fs.delete(tempFileUri, { recursive: true});

        await this.cleanupTempFile(tempFileUri);

        await this.showDiffView(document, selection, modifiedCode);
        //await this.handleUserChoice(document, selection, modifiedCode);
        //this.renamedSymbolsMap.clear();
        await this.cleanup();
    }

    // New function to compare and find renamed symbols
    private static async findRenamedSymbols(originalSymbols: any[], modifiedSymbols: any[]): Promise<Map<any, any>> {
        const renamedMap = new Map();

        // Compare symbols between the original and modified code
        for (let i = 0; i < originalSymbols.length; i++) {
            const origSymbol = originalSymbols[i];
            const modSymbol = modifiedSymbols[i];

            // If both symbols are non-null and have the same kind, check for renames
            if (origSymbol && modSymbol && origSymbol.kind === modSymbol.kind) {
                console.log(`Comparing symbols: ${origSymbol.name} (Original) vs ${modSymbol.name} (Modified)`);

                // If names are different, we consider it as renamed
                if (origSymbol.name !== modSymbol.name) {
                    renamedMap.set(origSymbol, modSymbol);
                }

                // If the symbol has children, recursively compare them
                if (origSymbol.children && modSymbol.children) {
                    const childRenames = await this.findRenamedSymbols(origSymbol.children, modSymbol.children);
                    childRenames.forEach((value, key) => renamedMap.set(key, value));
                }
            }
        }

        return renamedMap;
    }

    // Function to pass the renamedSymbolsMap to SecondarySidebar
    static getRenamedSymbols(): Map<any, any> {
        return this.renamedSymbolsMap;
    }

    private static async showDiffView(document: vscode.TextDocument, selection: vscode.Selection, modifiedCode: string) {
        const modifiedUri = vscode.Uri.parse(`untitled:${document.fileName}-modified`);
        const modifiedDoc = await vscode.workspace.openTextDocument(modifiedUri);
    
        const selectedText = document.getText(selection);
    
        const edit = new vscode.WorkspaceEdit();
        edit.insert(modifiedUri, new vscode.Position(0, 0), document.getText().replace(selectedText, modifiedCode));
        await vscode.workspace.applyEdit(edit);
    
        await vscode.commands.executeCommand('vscode.diff', document.uri, modifiedUri, 'Code Changes');
        await vscode.commands.executeCommand('setContext', 'code-documentation.showSecondarySidebar', true);
    }

    /**private static async handleUserChoice(document: vscode.TextDocument, selection: vscode.Selection, modifiedCode: string) {
        const result = await vscode.window.showQuickPick(['Accept', 'Reject'], {
            placeHolder: 'Do you want to accept the changes?',
            ignoreFocusOut: true
        });

        if (result === 'Accept') {
            await this.applyChanges(document, selection, modifiedCode);
        } else {
            vscode.window.showInformationMessage("Code update rejected.");
            
        }
        this.renamedSymbolsMap.clear();
        await this.cleanup();
    }

    private static async applyChanges(document: vscode.TextDocument, selection: vscode.Selection, modifiedCode: string) {
        const applyEdit = new vscode.WorkspaceEdit();
        applyEdit.replace(document.uri, selection, modifiedCode);
        await vscode.workspace.applyEdit(applyEdit);
        vscode.window.showInformationMessage("Code updated successfully.");
    }**/

    private static async checkIfFileExists(uri: vscode.Uri): Promise<boolean> {
        try {
            await vscode.workspace.fs.stat(uri);
            return true; // File exists
        } catch (error) {
            return false; // File doesn't exist
        }
    }

    // Function to cleanup temporary file
    private static async cleanupTempFile(tempFileUri: vscode.Uri) {
        const fileExists = await this.checkIfFileExists(tempFileUri);
        console.log("fileExists: ", fileExists)
        if (fileExists) {
            // Close the temporary document if it's open
            const tempDoc = await vscode.workspace.openTextDocument(tempFileUri);
            const tempEditor = vscode.window.visibleTextEditors.find(editor => editor.document.uri.toString() === tempDoc.uri.toString());
            if (tempEditor) {
                await vscode.window.showTextDocument(tempDoc, { preview: false });
                await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
            }
    
            await vscode.workspace.fs.delete(tempFileUri, { recursive: true });
            console.log("Temp file deleted:", tempFileUri.path);
        } else {
            console.log("Temp file not found for deletion:", tempFileUri.path);
        }
    }

    private static async cleanup() {

        
    }
}
