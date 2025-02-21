import * as vscode from 'vscode';
import * as path from 'path';

export class PrimarySidebar implements vscode.WebviewViewProvider {
    public static readonly viewType = 'code-documentation.primarySidebar';

    private _view?: vscode.WebviewView;

    constructor(private readonly context: vscode.ExtensionContext) {
        this.context = context;
    }

    public resolveWebviewView(webviewView: vscode.WebviewView) {
        this._view = webviewView;
        webviewView.webview.options = { enableScripts: true };

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

        // Load the Svelte app HTML and link the JS and CSS
        webviewView.webview.html = this.getHtmlContent(svelteAppUri, svelteAppUriJS, svelteAppUriCSS);
        setTimeout(() => {
            webviewView.webview.postMessage({ type: "setSidebar", sidebar: "primary" });
        }, 100);
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
