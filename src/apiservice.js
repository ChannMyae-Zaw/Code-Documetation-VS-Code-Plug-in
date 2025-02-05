const vscode = require('vscode');
const axios = require('axios');
const path = require('path');

async function sendDetailsToBackend() {
    // Open file dialog for selecting a PDF or text file
    const selectedFile = await vscode.window.showOpenDialog({
        canSelectMany: false,
        filters: {
            'PDF Files': ['pdf'],
            'Text Files': ['txt'],
        }
    });

    if (!selectedFile || selectedFile.length === 0) {
        vscode.window.showErrorMessage('No file selected.');
        return;
    }

    const filePath = selectedFile[0].fsPath;
    const fileName = path.basename(filePath);

    // Ask the user for additional details
    const code = await vscode.window.showInputBox({ placeHolder: 'Enter the code to be processed' });
    if (!code) {
        vscode.window.showErrorMessage('Code is required.');
        return;
    }

    const apiKey = await vscode.window.showInputBox({ placeHolder: 'Enter your OpenAI API key' });
    if (!apiKey) {
        vscode.window.showErrorMessage('API key is required.');
        return;
    }

    const detailLevel = await vscode.window.showQuickPick(
        ['basic', 'intermediate', 'advanced'],
        { placeHolder: 'Select the level of detail' }
    );
    if (!detailLevel) {
        vscode.window.showErrorMessage('Detail level is required.');
        return;
    }

    // Create form data
    const formData = new FormData();
    formData.append('file', fs.createReadStream(filePath), fileName);
    formData.append('prompt', code);
    formData.append('apiKey', apiKey);
    formData.append('detailLevel', detailLevel);

    // Send data to backend API
    try {
        const response = await axios.post('http://localhost:5000/api/chat', formData, {
            headers: {
                ...formData.getHeaders(),
            }
        });

        // Handle the response
        const responseData = response.data;
        if (responseData && responseData.response) {
            vscode.window.showInformationMessage('Response received: ' + responseData.response);
        } else {
            vscode.window.showErrorMessage('No response from backend.');
        }
    } catch (error) {
        vscode.window.showErrorMessage('Error sending request: ' + error.message);
    }
}
