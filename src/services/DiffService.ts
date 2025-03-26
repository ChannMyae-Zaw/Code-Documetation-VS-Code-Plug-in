import * as vscode from 'vscode';
import * as os from 'os';
import { SymbolExtractor } from './SymbolExtractor';
import path from 'path';

export class DiffService {
    private static renamedSymbolsMap: Map<any, any> = new Map();
    private static commentsAdded: boolean = false;
    private static originalCode: string = '';
    private static renamedCode: string = '';
    private static commentedCode: string = '';
    private static originalUri: vscode.Uri | null = null;
    private static modifiedUri: vscode.Uri | null = null;
    private static modifiedCode: string = ''; 

    static async processResponse(response: { originalCode: string, renamedCode: string, commentedCode: string }) {
        const editor = vscode.window.activeTextEditor;
        if (!editor) return;

        const { document, selection } = editor;
        if (selection.isEmpty) {
            vscode.window.showErrorMessage("No code selected.");
            return;
        }

        this.originalCode = response.originalCode;
        this.renamedCode = response.renamedCode;
        this.commentedCode = response.commentedCode;
        this.originalUri = document.uri;

        this.modifiedCode = this.mergeCode(this.renamedCode, this.commentedCode);
        console.log("Merged Code (Selection Only):", this.modifiedCode);

        // Apply comments directly, secondary sidebar DOES NOT pop up if only user only chose to add comments
        if (this.commentedCode !== this.originalCode) {
            const edit = new vscode.WorkspaceEdit();
            edit.replace(this.originalUri, selection, this.commentedCode);
            const success = await vscode.workspace.applyEdit(edit);
            if (success) {
                await document.save();
                vscode.window.showInformationMessage("Comments applied successfully. Please use Ctrl+Z to undo if needed.");
            } else {
                vscode.window.showErrorMessage("Failed to apply comments automatically.");
            }
        }

        const originalSymbols = await SymbolExtractor.getSymbols(document);
        const originalContent = document.getText();
        const timestamp = Date.now();
        const tempFilePath = path.join(os.tmpdir(), `tempFile_${timestamp}.${document.fileName.split('.').pop()}`);
        const tempFileUri = vscode.Uri.file(tempFilePath);

        const newContent =
            originalContent.substring(0, document.offsetAt(selection.start)) + 
            this.modifiedCode + 
            originalContent.substring(document.offsetAt(selection.end));
        
        await vscode.workspace.fs.writeFile(tempFileUri, Buffer.from(newContent, 'utf8'));
        const tempDoc = await vscode.workspace.openTextDocument(tempFileUri);
        
        const modifiedSymbols = await SymbolExtractor.getSymbols(tempDoc);

        this.commentsAdded = this.detectCommentsAdded(this.originalCode, this.commentedCode);
        this.renamedSymbolsMap = await this.findRenamedSymbols(originalSymbols, modifiedSymbols);

        // Only show diff view and sidebar if user chose to rename variables!!
        if (this.renamedSymbolsMap.size > 0) {
            await this.showDiffView(document, selection);
        } else {
            await this.cleanupTempFile(tempFileUri);
        }
    }

    //for the case of user choosing both rename and comment
    private static mergeCode(renamedCode: string, commentedCode: string): string {
        if (renamedCode === this.originalCode) return commentedCode;
        if (commentedCode === this.originalCode) return renamedCode;
        const renamedLines = renamedCode.split('\n');
        const commentedLines = commentedCode.split('\n');
        let result = '';
        for (let i = 0; i < Math.max(renamedLines.length, commentedLines.length); i++) {
            const rLine = renamedLines[i] || '';
            const cLine = commentedLines[i] || '';
            if (cLine.startsWith('<!--') && !rLine.startsWith('<!--')) {
                result += cLine + '\n' + rLine + '\n';
            } else if (cLine.includes('<!--') && !rLine.includes('<!--')) {
                result += rLine + ' ' + cLine.substring(cLine.indexOf('<!--')) + '\n';
            } else {
                result += rLine + '\n';
            }
        }
        return result.trimEnd();
    }

    //for comments obvion
    private static detectCommentsAdded(originalText: string, commentedText: string): boolean {
        const originalLines = originalText.split('\n').length;
        const commentedLines = commentedText.split('\n').length;
        const hasCommentMarkers = /#|\/\/|\/\*|\*/.test(commentedText) && !/#|\/\/|\/\*|\*/.test(originalText);
        return commentedLines > originalLines || hasCommentMarkers;
    }

    private static async findRenamedSymbols(originalSymbols: any[], modifiedSymbols: any[]): Promise<Map<any, any>> {
        const renamedMap = new Map();
        for (let i = 0; i < originalSymbols.length; i++) {
            const origSymbol = originalSymbols[i];
            const modSymbol = modifiedSymbols[i];
            if (origSymbol && modSymbol && origSymbol.kind === modSymbol.kind) {
                if (origSymbol.name !== modSymbol.name) {
                    renamedMap.set(origSymbol, modSymbol);
                }
                if (origSymbol.children && modSymbol.children) {
                    const childRenames = await this.findRenamedSymbols(origSymbol.children, modSymbol.children);
                    childRenames.forEach((value, key) => renamedMap.set(key, value));
                }
            }
        }
        return renamedMap;
    }

    //getters 
    static getRenamedSymbols(): Map<any, any> {
        return this.renamedSymbolsMap;
    }

    static getCommentsAdded(): boolean {
        return this.commentsAdded;
    }

    static getOriginalCode(): string {
        return this.originalCode;
    }

    static getRenamedCode(): string {
        return this.renamedCode;
    }

    static getCommentedCode(): string {
        return this.commentedCode;
    }

    static getOriginalUri(): vscode.Uri | null {
        return this.originalUri;
    }

    static getModifiedCode(): string {
        return this.modifiedCode; 
    }

    private static async showDiffView(document: vscode.TextDocument, selection: vscode.Selection) {
        this.modifiedUri = vscode.Uri.parse(`untitled:${document.fileName}-modified`);
        const modifiedDoc = await vscode.workspace.openTextDocument(this.modifiedUri);
    
        const selectedText = document.getText(selection);
        const fullModifiedContent = document.getText().replace(selectedText, this.modifiedCode);
    
        const edit = new vscode.WorkspaceEdit();
        edit.insert(this.modifiedUri, new vscode.Position(0, 0), fullModifiedContent);
        await vscode.workspace.applyEdit(edit);
    
        await vscode.commands.executeCommand('vscode.diff', document.uri, this.modifiedUri, 'Code Changes');
        await vscode.commands.executeCommand('setContext', 'code-documentation.showSecondarySidebar', true);
    }

    static async cleanupDiffView() {
        if (this.modifiedUri) {
            const modifiedEditors = vscode.window.visibleTextEditors.filter(e => e.document.uri.toString() === this.modifiedUri!.toString());
            for (const editor of modifiedEditors) {
                await vscode.window.showTextDocument(editor.document, { preview: false });
                await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
            }
            this.modifiedUri = null;
        }
    }

    private static async checkIfFileExists(uri: vscode.Uri): Promise<boolean> {
        try {
            await vscode.workspace.fs.stat(uri);
            return true;
        } catch (error) {
            return false;
        }
    }

    private static async cleanupTempFile(tempFileUri: vscode.Uri) {
        const fileExists = await this.checkIfFileExists(tempFileUri);
        if (fileExists) {
            const tempDoc = await vscode.workspace.openTextDocument(tempFileUri);
            const tempEditor = vscode.window.visibleTextEditors.find(editor => editor.document.uri.toString() === tempDoc.uri.toString());
            if (tempEditor) {
                await vscode.window.showTextDocument(tempDoc, { preview: false });
                await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
            }
            await vscode.workspace.fs.delete(tempFileUri, { recursive: true });
        }
    }
}