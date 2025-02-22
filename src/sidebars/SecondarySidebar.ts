import * as vscode from 'vscode';
import * as path from "path";

export class SecondarySidebar implements vscode.WebviewViewProvider {
    public static readonly viewType = 'code-documentation.secondarySidebar';

    private _view?: vscode.WebviewView;

    constructor(private readonly context: vscode.ExtensionContext) {}

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
        setTimeout(() => {
            webviewView.webview.postMessage({ type: "setSidebar", sidebar: "secondary" });
        }, 100);
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
}
