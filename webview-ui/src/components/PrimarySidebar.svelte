<script>
    import { onMount } from 'svelte';
    let apiKey = '';
    let file = null;
    let fileName = '';
    let filePath = '';

    const vscode = acquireVsCodeApi();

    onMount(() => {
        window.addEventListener("message", (event) => {
            const message = event.data;
            if (message.type === 'loadSettings') {
                apiKey = message.apiKey || '';
                fileName = message.documentationFile || '';
                filePath = message.documentationFilePath || '';
            }
        });

        vscode.postMessage({ type: 'getSettings' });
    });

    async function handleFileUpload(event) {
        file = event.target.files[0];
        if (file) {
            fileName = file.name;
            
            // Read file and send to VS Code
            const reader = new FileReader();
            reader.onload = async () => {
                vscode.postMessage({
                    type: 'handleFileUpload',
                    fileContent: reader.result,
                    fileName: fileName
                });
            };
            reader.readAsArrayBuffer(file);
        }
    }

    function saveSettings() {
        if (!apiKey) {
            alert("Please enter an API key.");
            return;
        }

        vscode.postMessage({
            type: 'saveSettings',
            apiKey,
            documentationFile: fileName,
            documentationFilePath: filePath
        });
    }
</script>

<style>
    :global(body) {
        padding: 1rem;
    }
    .container {
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }
    label {
        display: block;
        margin-bottom: 0.5rem;
    }
    .input-wrapper {
        padding: auto;
        width: 100%;
    }
    input {
        width: 100%;
        padding: 0.5rem;
        margin-bottom: 1rem;
        box-sizing: border-box;
    }
    button {
        width: 100%;
        padding: 0.5rem;
        background-color: var(--vscode-button-background);
        color: var(--vscode-button-foreground);
        border: none;
        cursor: pointer;
        box-sizing: border-box;
    }
    button:hover {
        background-color: var(--vscode-button-hoverBackground);
    }
    .file-upload {
        position: relative;
        display: block;
        width: 100%;
    }
    .file-upload-input {
        position: absolute;
        width: 100%;
        height: 100%;
        opacity: 0;
        cursor: pointer;
        z-index: 2;
    }
    .file-upload-button {
        display: block;
        width: 100%;
        padding: 0.5rem;
        background-color: var(--vscode-button-background);
        color: var(--vscode-button-foreground);
        border: none;
        cursor: pointer;
        text-align: center;
        box-sizing: border-box;
    }
    .file-upload-button:hover {
        background-color: var(--vscode-button-hoverBackground);
    }
    .file-name {
        margin-top: 0.5rem;
        font-size: 0.9em;
        color: var(--vscode-foreground);
    }
</style>

<div class="container">
    <h2>Athena Profile Settings</h2>
    
    <div class="input-wrapper">
        <label for="apiKey">OpenAI API Key:</label>
        <input 
            id="apiKey"
            bind:value={apiKey} 
            placeholder="Enter your API key" 
        />
    </div>

    <div class="input-wrapper">
        <label>Upload Coding Standard (PDF):</label>
        <div class="file-upload">
            <input 
                class="file-upload-input"
                type="file" 
                accept=".pdf" 
                on:change={handleFileUpload} 
            />
            <div class="file-upload-button">
                {fileName ? fileName : 'Choose PDF File'}
            </div>
        </div>
    </div>

    <button on:click={saveSettings}>Save Settings</button>
</div>