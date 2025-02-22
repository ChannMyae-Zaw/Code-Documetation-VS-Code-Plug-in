import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

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
        webviewView.webview.html = this.getHtmlContent(svelteAppUri, svelteAppUriJS, svelteAppUriCSS, 'primary');
    
        // Send saved settings to Svelte on Webview load
        webviewView.webview.onDidReceiveMessage(async message => {
            switch (message.type) {
                case 'getSettings':
                    webviewView.webview.postMessage({
                        type: 'loadSettings',
                        apiKey: this.context.globalState.get('apiKey'),
                        documentationFile: this.context.globalState.get('documentationFile'),
                        documentationFilePath: this.context.globalState.get('documentationFilePath')
                    });
                    break;

                case 'handleFileUpload':
                    try {
                        // Create a directory for storing uploaded files if it doesn't exist
                        const storageDir = path.join(this.context.globalStorageUri.fsPath, 'uploads');
                        if (!fs.existsSync(storageDir)) {
                            fs.mkdirSync(storageDir, { recursive: true });
                        }
    
                        // Save the file
                        const filePath = path.join(storageDir, message.fileName);
                        fs.writeFileSync(filePath, Buffer.from(message.fileContent));
    
                        // Update the file path in the webview
                        await this.context.globalState.update('documentationFile', message.fileName);
                        await this.context.globalState.update('documentationFilePath', filePath);

                        webviewView.webview.postMessage({
                            type: 'loadSettings',
                            apiKey: this.context.globalState.get('apiKey'),
                            documentationFile: message.fileName,
                            documentationFilePath: filePath
                        });
    
                        vscode.window.showInformationMessage(`File saved successfully: ${message.fileName}`);
                    } catch (error) {
                        console.error('Error handling file upload:', error);
                        if (error instanceof Error) {
                            vscode.window.showErrorMessage(`Failed to save file: ${error.message}`);
                        } else {
                            vscode.window.showErrorMessage('Failed to save file: Unknown error');
                        }
                    }
                    break;

                case 'deleteFile':
                    try {
                        const filePath = this.context.globalState.get<string>('documentationFilePath');
                        if (filePath && fs.existsSync(filePath)) {
                            fs.unlinkSync(filePath);
                            await this.context.globalState.update('documentationFile', '');
                            await this.context.globalState.update('documentationFilePath', '');
                            
                            webviewView.webview.postMessage({
                                type: 'loadSettings',
                                apiKey: this.context.globalState.get('apiKey'),
                                documentationFile: '',
                                documentationFilePath: ''
                            });
                            
                            vscode.window.showInformationMessage('File deleted successfully');
                        }
                    } catch (error) {
                        console.error('Error deleting file:', error);
                        if (error instanceof Error) {
                            vscode.window.showErrorMessage(`Failed to delete file: ${error.message}`);
                        } else {
                            vscode.window.showErrorMessage('Failed to delete file: Unknown error');
                        }
                    }
                    break;
    
                case 'saveSettings':
                    try {
                        await this.context.globalState.update('apiKey', message.apiKey);
                        await this.context.globalState.update('documentationFile', message.documentationFile);
                        await this.context.globalState.update('documentationFilePath', message.documentationFilePath);
    
                        const savedPath = this.context.globalState.get('documentationFilePath');
                        console.log("Saved documentation file path:", savedPath);
    
                        if (savedPath && typeof savedPath === 'string' && !fs.existsSync(savedPath)) {
                            throw new Error(`File not found at path: ${savedPath}`);
                        }
    
                        vscode.window.showInformationMessage('Settings saved successfully!');
                    } catch (error) {
                        console.error('Error saving settings:', error);
                        if (error instanceof Error) {
                            vscode.window.showErrorMessage(`Failed to save settings: ${error.message}`);
                        } else {
                            vscode.window.showErrorMessage('Failed to save settings: Unknown error');
                        }
                    }
                    break;
            }
        });
    }

    private getHtmlContent(svelteAppUri: vscode.Uri, svelteAppUriJS: vscode.Uri, svelteAppUriCSS: vscode.Uri, sidebarType: string): string {
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
                window.sidebarType = "primary"; // ✅ Inject as a global variable
                </script>
                <script src="${svelteAppUriJS}"></script>
            </body>
            </html>
        `;
    }
}