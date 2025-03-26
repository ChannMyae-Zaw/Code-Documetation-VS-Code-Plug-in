import * as vscode from 'vscode';
import * as path from "path";
import { DiffService } from '../services/DiffService';

export class SecondarySidebar implements vscode.WebviewViewProvider {
    public static readonly viewType = 'code-documentation.secondarySidebar';

    private _view?: vscode.WebviewView;

    constructor(private readonly context: vscode.ExtensionContext) {}

    changes = {
        classes: { "Message": "TextMessage" },
        methods: {
            "method1": "printContent",
            "method2": "printSender",
            "method3": "printReceiver"
        },
    };

    public resolveWebviewView(webviewView: vscode.WebviewView) {
        this._view = webviewView;
        webviewView.webview.options = { enableScripts: true };

        const svelteAppUri = webviewView.webview.asWebviewUri(
            vscode.Uri.file(path.join(this.context.extensionPath, 'webview-ui', 'public', 'index.html'))
        );

        const svelteAppUriJS = webviewView.webview.asWebviewUri(
            vscode.Uri.file(path.join(this.context.extensionPath, 'webview-ui', 'public', 'build', 'bundle.js'))
        );

        const svelteAppUriCSS = webviewView.webview.asWebviewUri(
            vscode.Uri.file(path.join(this.context.extensionPath, 'webview-ui', 'public', 'build', 'bundle.css'))
        );

        webviewView.webview.html = this.getHtmlContent(svelteAppUri, svelteAppUriJS, svelteAppUriCSS, 'secondary');

        webviewView.webview.onDidReceiveMessage(async message => {
            console.log("Received message in TS: ", message);
            switch (message.type) {
                case 'getChanges':
                    this.sendRenamedSymbols();
                    break;

                case 'applyChanges':
                    console.log("Applying variable changes...");
                    await this.applyChangesToFiles();
                    break;

                case 'rejectChanges':
                    console.log("Rejecting variable changes...");
                    await this.rejectChanges();
                    break;

                case 'scrollToLineInDiffView':
                    const originalLineNumber = message.originalLineNumber;
                    const modifiedLineNumber = message.modifiedLineNumber;
                    await this.scrollToLineInDiffView(originalLineNumber, modifiedLineNumber);
                    break;
            }
        });
    }

    private getHtmlContent(svelteAppUri: vscode.Uri, svelteAppUriJS: vscode.Uri, svelteAppUriCSS: vscode.Uri, sidebartype: string): string {
        return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Secondary Sidebar</title>
                <link rel="stylesheet" href="${svelteAppUriCSS}">
            </head>
            <body>
                <div id="svelte-root"></div>
                <script>
                window.sidebarType = "secondary";
                </script>
                <script src="${svelteAppUriJS}"></script>
            </body>
            </html>
        `;
    }

    private async applyChangesToFiles() {
        const workspaceEdit = new vscode.WorkspaceEdit();
        const renamedSymbolsMap = DiffService.getRenamedSymbols();
        console.log("Apply These Changes:", renamedSymbolsMap);
    
        if (renamedSymbolsMap.size === 0) {
            vscode.window.showInformationMessage("No renamed symbols found.");
            await this.cleanupAndHideSidebar();
            return;
        }
    
        const originalUri = DiffService.getOriginalUri();
        if (!originalUri) {
            vscode.window.showErrorMessage("No original file context available.");
            await this.cleanupAndHideSidebar();
            return;
        }
    
        const doc = await vscode.workspace.openTextDocument(originalUri);
        let text = doc.getText();
    
        // More comprehensive replacement strategy
        for (const [oldSymbol, newSymbol] of renamedSymbolsMap.entries()) {
            let oldName = oldSymbol.name;
            let newName = newSymbol.name;
    
            if (!oldName || !newName || oldName === newName) {
                console.log("Skipping due to invalid names or no change.");
                continue;
            }
    
            // More robust replacement patterns
            const replacements = [
                // HTML Opening Tags
                { regex: new RegExp(`<${oldName}(>|\\s+[^>]*)>`, 'g'), replace: `<${newName}$1>` },
                
                // HTML Closing Tags
                { regex: new RegExp(`</${oldName}>`, 'g'), replace: `</${newName}>` },
                
                // Word boundaries with careful matching
                { regex: new RegExp(`\\b${oldName}\\b(?![-_])`, 'g'), replace: newName },
                
                // Potential method/function call scenarios
                { regex: new RegExp(`${oldName}\\s*\\(`, 'g'), replace: `${newName}(` }
            ];
    
            replacements.forEach(({ regex, replace }) => {
                text = text.replace(regex, replace);
            });
        }
    
        // Apply workspace edit if text changed
        if (text !== doc.getText()) {
            const fullRange = new vscode.Range(
                doc.positionAt(0),
                doc.positionAt(doc.getText().length)
            );
            workspaceEdit.replace(originalUri, fullRange, text);
    
            const success = await vscode.workspace.applyEdit(workspaceEdit);
            if (success) {
                await doc.save();
                vscode.window.showInformationMessage("Variable changes applied successfully.");
                await this.cleanupAndHideSidebar();
            } else {
                console.error("Edit application failed.");
                vscode.window.showErrorMessage("Failed to apply variable changes.");
                await this.cleanupAndHideSidebar();
            }
        } else {
            console.log("No text changes detected.");
            vscode.window.showInformationMessage("No changes to apply.");
            await this.cleanupAndHideSidebar();
        }
    }
        
    private async rejectChanges() {
        vscode.window.showInformationMessage("Variable rename changes rejected.");
        await this.cleanupAndHideSidebar();
    }

    private async cleanupAndHideSidebar() {
        await DiffService.cleanupDiffView();
        await vscode.commands.executeCommand('setContext', 'code-documentation.showSecondarySidebar', false);
        console.log("Sidebar hidden and diff view cleaned up.");
    }

    private sendRenamedSymbols() {
        const renamedSymbolsMap = DiffService.getRenamedSymbols();
        const renamedSymbolsKeys = Array.from(renamedSymbolsMap.keys());
        const renamedSymbolsArray = Array.from(renamedSymbolsMap.values());

        console.log("Sending to Svelte:", { keys: renamedSymbolsKeys, data: renamedSymbolsArray });

        this._view?.webview.postMessage({
            type: 'sendChanges',
            changes: {
                keys: renamedSymbolsKeys,
                data: renamedSymbolsArray
            }
        });
    }

    private async scrollToLineInDiffView(originalLineNumber: number, modifiedLineNumber: number) {
        const editors = vscode.window.visibleTextEditors;

        editors.forEach(editor => {
            if (editor.document.uri.scheme === 'untitled' || editor.document.uri.toString().includes('diff')) {
                if (editor.document.uri.toString().includes('modified')) {
                    const position = new vscode.Position(modifiedLineNumber, 0);
                    const range = new vscode.Range(position, position);
                    editor.revealRange(range, vscode.TextEditorRevealType.InCenter);
                } else {
                    const position = new vscode.Position(originalLineNumber, 0);
                    const range = new vscode.Range(position, position);
                    editor.revealRange(range, vscode.TextEditorRevealType.InCenter);
                }
            }
        });
    }
}