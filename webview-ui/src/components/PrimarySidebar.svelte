<script>
    import { onMount } from 'svelte';
    let apiKey = '';
    let file = null;
    let fileName = '';
    let filePath = '';
    let detailLevel = 'Basic'; //by default

    const vscode = acquireVsCodeApi();

    onMount(() => {
        window.addEventListener("message", (event) => {
            const message = event.data;
            if (message.type === 'loadSettings') {
                apiKey = message.apiKey || '';
                fileName = message.documentationFile || '';
                filePath = message.documentationFilePath || '';
                detailLevel = message.detailLevel || 'Basic'; //load the default level
            }
        });

        vscode.postMessage({ type: 'getSettings' });
    });

    function sendToBackend() {
        vscode.postMessage({ type: 'sendToBackend' });
    }

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

    function deleteFile() {
        vscode.postMessage({ type: 'deleteFile' });
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
            documentationFilePath: filePath,
            detailLevel
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
        height: 95vh;
    }
    .content {
        flex: 1;
        overflow-y: auto; 
    }
    .footer {
        margin-top: auto;
        display: flex;
        justify-content: space-between;
    }
    label {
        display: block;
        margin-bottom: 0.5rem;
    }
    .input-wrapper {
        width: 100%;
    }
    input, select {
        width: 100%;
        padding: 0.5rem;
        margin-bottom: 1rem;
        box-sizing: border-box;
    }
    select { 
        background-color: var(--vscode-button-foreground);
        color: var(--vscode-editor-background);
        border: none;
        cursor: pointer;
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
        flex-grow: 1;
        margin-bottom: 1rem;
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
        display: inline-block;
        width: 100%;
        padding: 0.5rem;
        background-color: var(--vscode-button-foreground);
        color: var(--vscode-editor-background);
        border: none;
        cursor: pointer;
        text-align: center;
        box-sizing: border-box;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
    .file-upload-button:hover {
        background-color: var(--vscode-button-hoverBackground);
    }
    .delete-button {
        width: 100%;
        padding: 0.5rem;
        box-sizing: border-box;
        background-color: var(--vscode-errorForeground, #f44336);
    }
    .delete-button:hover {
        background-color: var(--vscode-errorForeground, #d32f2f);
        opacity: 0.9;
    }
    .key-value {
        color: var(--vscode-editor-background);
    }
</style>

<div class="container">
    <h2>Athena Profile Settings</h2>

    <div class="content">    
        <div class="input-wrapper">
            <label for="apiKey">OpenAI API Key:</label>
            <input
                class="key-value" 
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
                {#if fileName}
                    <button class="delete-button" on:click={deleteFile}>
                        Delete
                    </button>
                {/if}
        </div>

        <div class="input-wrapper">
            <label for="detailLevel">Detail Level:</label>
            <select id="detailLevel" bind:value={detailLevel}>
                <option value="Basic">Basic</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced</option>
            </select>
        </div>
    <button on:click={saveSettings}>Save Settings</button>
</div>

<div class="footer">
        <button on:click={sendToBackend}>Generate Documentation</button>
    </div>
</div>
