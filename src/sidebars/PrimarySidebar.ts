import * as vscode from 'vscode';
import * as path from 'path';
import { BackendService } from '../services/BackendService';

export class PrimarySidebar implements vscode.WebviewViewProvider {
    public static readonly viewType = 'code-documentation.primarySidebar';
    private _view?: vscode.WebviewView;

    constructor(private readonly context: vscode.ExtensionContext) {}

    public resolveWebviewView(webviewView: vscode.WebviewView) {
        this._view = webviewView;
        webviewView.webview.options = { 
            enableScripts: true,
            localResourceRoots: [vscode.Uri.file(this.context.extensionPath)]
        };
    
        // Retrieve stored API key and file path
        const apiKey = this.context.globalState.get<string>('apiKey') || '';
        const documentationFile = this.context.globalState.get<string>('documentationFile') || '';
        const documentationFilePath = this.context.globalState.get<string>('documentationFilePath') || '';
    
        // Ensure the paths are correct
        const svelteAppUri = webviewView.webview.asWebviewUri(
            vscode.Uri.file(path.join(this.context.extensionPath, 'webview-ui', 'public', 'index.html'))
        );
        
        const svelteAppUriJS = webviewView.webview.asWebviewUri(
            vscode.Uri.file(path.join(this.context.extensionPath, 'webview-ui', 'public', 'build', 'bundle.js'))
        );
        
        const svelteAppUriCSS = webviewView.webview.asWebviewUri(
            vscode.Uri.file(path.join(this.context.extensionPath, 'webview-ui', 'public', 'build', 'bundle.css'))
        );
    
        // Load the Svelte app and send saved data
        webviewView.webview.html = this.getHtmlContent(svelteAppUri, svelteAppUriJS, svelteAppUriCSS);
    
        // Send saved settings to Svelte on Webview load
        webviewView.webview.onDidReceiveMessage(async message => {
            switch (message.type) {
                case 'getSettings':
                    webviewView.webview.postMessage({
                        type: 'loadSettings',
                        apiKey,
                        documentationFile,
                        documentationFilePath
                    });
                    break;
    
                case 'saveSettings':
                    await this.context.globalState.update('apiKey', message.apiKey);
                    await this.context.globalState.update('documentationFile', message.documentationFile);
                    await this.context.globalState.update('documentationFilePath', message.documentationFilePath);
                    vscode.window.showInformationMessage('Settings saved successfully!');
                    break;
            }
        });
    }

    private getHtmlContent(svelteAppUri: vscode.Uri, svelteAppUriJS: vscode.Uri, svelteAppUriCSS: vscode.Uri): string {
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
                <script src="${svelteAppUriJS}"></script>
            </body>
            </html>
        `;
    }
}