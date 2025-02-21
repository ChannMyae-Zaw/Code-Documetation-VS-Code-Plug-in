import * as vscode from 'vscode';
import { BackendService } from './services/BackendService';
import { PrimarySidebar } from './sidebars/PrimarySidebar';

export function activate(context: vscode.ExtensionContext) {

    // Reset global states on each new debug session
    // Just remove the following lines if resetting is not needed
    context.globalState.update('apiKey', undefined);
    context.globalState.update('documentationFile', undefined);
    context.globalState.update('documentationFilePath', undefined);
    
    const primarySidebar = new PrimarySidebar(context);

    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(
            PrimarySidebar.viewType, 
            primarySidebar
        )
    );

    let disposable = vscode.commands.registerCommand('code-documentation.sendToBackend', async () => {
        await BackendService.gatherDataAndSendToBackend(context);
    });

    context.subscriptions.push(disposable);
}

export function deactivate() {}