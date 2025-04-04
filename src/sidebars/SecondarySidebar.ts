import * as vscode from 'vscode';
import * as path from "path";
import { DiffService } from '../services/DiffService';

export class SecondarySidebar implements vscode.WebviewViewProvider {
    public static readonly viewType = 'code-documentation.secondarySidebar';

    private _view?: vscode.WebviewView;

    constructor(private readonly context: vscode.ExtensionContext) {}

    changes = {
        classes: {
            "Message": "TextMessage"
        },
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

        // Load the Svelte app HTML and link the JS and CSS
        webviewView.webview.html = this.getHtmlContent(svelteAppUri, svelteAppUriJS, svelteAppUriCSS, 'secondary');

        webviewView.webview.onDidReceiveMessage(async message => {
            console.log("Received message in TS: ", message);
            switch (message.type) {
                case 'getChanges' :
                    /**console.log("changes in ts: ", this.changes)
                    webviewView.webview.postMessage({
                        type: 'sendChanges',
                        changes: this.changes,
                    });**/
                    this.sendRenamedSymbols();
                break;

                case 'applyChanges' :
                    console.log("apply changes working");
                    const totalChanges = 
                        Object.keys(this.changes.classes).length + 
                        Object.keys(this.changes.methods).length;
                    
                        this.applyChangesToFiles(message.selectedIndexes);
                break;

                case 'rejectChanges' :
                    console.log("Rejecting changes...");
                    vscode.window.showInformationMessage("Changes rejected.");
                    await vscode.commands.executeCommand('setContext', 'code-documentation.showSecondarySidebar', false);
                    await vscode.commands.executeCommand('workbench.action.closeActiveEditor'); 
                    break;

                case 'scrollToLineInDiffView' :
                    const originalLineNumber = message.originalLineNumber;
                    const modifiedLineNumber = message.modifiedLineNumber;
                    await this.scrollToLineInDiffView(originalLineNumber, modifiedLineNumber)
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
                    <title>Primary Sidebar</title>
                    <link rel="stylesheet" href="${svelteAppUriCSS}">
                </head>
                <body>
                    <div id="svelte-root"></div>
                    <script>
                    window.sidebarType = "secondary"; // ✅ Inject as a global variable
                    </script>
                    <script src="${svelteAppUriJS}"></script>
                </body>
                </html>
            `;
        }
        private async applyChangesToFiles(selectedIndexes: number[]) {
            const renamedSymbolsMap = DiffService.getRenamedSymbols();
            console.log("Apply These Changes Using Rename", renamedSymbolsMap);
        
            if (renamedSymbolsMap.size === 0) {
                vscode.window.showInformationMessage("No renamed symbols found.");
                return;
            }

            const renamedSymbolsKeys = Array.from(renamedSymbolsMap.keys());
            const renamedSymbolsArray = Array.from(renamedSymbolsMap.values());
        
            // 선택된 인덱스에 해당하는 심볼만 필터링
            const filteredChanges = selectedIndexes.map(index => ({
                oldSymbol: renamedSymbolsKeys[index],
                newSymbol: renamedSymbolsArray[index]
            }));
        
            if (filteredChanges.length === 0) {
                vscode.window.showInformationMessage("No selected symbols to rename.");
                return;
            }
           
            
            for (const { oldSymbol, newSymbol } of filteredChanges) {
                const oldName = oldSymbol.name;
                const newName = newSymbol.name.replace(/[()]/g, '');
                const position = oldSymbol.position; // Assuming this is a vscode.Position
                const fileUri = oldSymbol.uri;       // Assuming this is a vscode.Uri
        
                if (!oldName || !newName || oldName === newName || !position || !fileUri) {
                    console.warn(`Skipping invalid rename: ${oldName} -> ${newName}`);
                    continue;
                }
        
                try {
                    console.log("Changing the old name:", oldName);
        
                    // Execute the rename provider to get the WorkspaceEdit
                    const workspaceEdit = await vscode.commands.executeCommand<vscode.WorkspaceEdit>(
                        'vscode.executeDocumentRenameProvider',
                        fileUri,  // URI of the file containing the symbol
                        position, // Position of the symbol in the file
                        newName   // New name to apply
                    );
        
                    if (!workspaceEdit) {
                        console.warn(`No changes proposed for renaming ${oldName} to ${newName}`);
                        vscode.window.showWarningMessage(`No changes proposed for ${oldName} to ${newName}`);
                        continue;
                    }
        
                    // Apply the WorkspaceEdit to propagate the rename across the workspace
                    const success = await vscode.workspace.applyEdit(workspaceEdit);
                    if (success) {
                        console.log(`Successfully renamed ${oldName} to ${newName}`);
                    } else {
                        console.error(`Failed to apply rename for ${oldName} to ${newName}`);
                        vscode.window.showErrorMessage(`Failed to apply rename for ${oldName} to ${newName}`);
                    }
                } catch (error) {
                    console.error(`Failed to rename ${oldName} to ${newName}:`, error);
                    vscode.window.showErrorMessage(`Failed to rename ${oldName} to ${newName}: ${error}`);
                }
            }
        
            // Save all modified files
            await vscode.workspace.saveAll(false);
            vscode.window.showInformationMessage("Attempted rename across multiple files.");
        
            // Execute post-rename commands
            await vscode.commands.executeCommand('setContext', 'code-documentation.showSecondarySidebar', false);
            await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
        }       


        private sendRenamedSymbols() {
            const renamedSymbolsMap = DiffService.getRenamedSymbols();
            console.log("renamedSymbolsMap", renamedSymbolsMap)
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
            // Get all visible editors
            const editors = vscode.window.visibleTextEditors;
        
            editors.forEach(editor => {
                // Ensure the editor belongs to the diff view
                if (editor.document.uri.scheme === 'untitled' || editor.document.uri.toString().includes('diff')) {
                    if (editor.document.uri.toString().includes('modified')) {
                        // Scroll the modified file to the modified line number
                        const position = new vscode.Position(modifiedLineNumber, 0);
                        const range = new vscode.Range(position, position);
                        editor.revealRange(range, vscode.TextEditorRevealType.InCenter);
                    } else {
                        // Scroll the original file to the original line number
                        const position = new vscode.Position(originalLineNumber, 0);
                        const range = new vscode.Range(position, position);
                        editor.revealRange(range, vscode.TextEditorRevealType.InCenter);
                    }
                }
            });
        }
        
        
}
