<script>
    import { onMount } from 'svelte';
    let apiKey = '';
    let file = null;
    let fileName = '';
    let filePath = '';
    let detailLevel = 'Basic';

    const vscode = acquireVsCodeApi();

    onMount(() => {
        window.addEventListener("message", (event) => {
            const message = event.data;
            if (message.type === 'loadSettings') {
                apiKey = message.apiKey || '';
                fileName = message.documentationFile || '';
                filePath = message.documentationFilePath || '';
                detailLevel = message.detailLevel || 'Basic';
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
        document.getElementById('fileInput').value = '';
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
        padding: 0.5rem;
        font-family: var(--vscode-font-family);
    }

    .container {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
        height: 95vh;
        padding: 0.5rem;
        border-radius: 10px;
        background-color: var(--vscode-editor-background);
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
        overflow: hidden; 
    }


    h2 {
        font-size: 1.8rem;
        font-weight: bold;
        background: linear-gradient(90deg, #4EA8DE, #80ED99);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        text-align: center;
        margin-bottom: 1.5rem;
    }

    .input-wrapper input {
        width: 100%;
        padding: 0.6rem;
        margin-top: 0.2rem;
        border-radius: 5px;
        border: none;
        background-color: var(--vscode-input-background);
        color: var(--vscode-editor-foreground);;
        box-sizing: border-box;
    }

    .input-wrapper {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        margin-bottom: 0.5rem; 
    }

    .input-wrapper label {
        font-weight: bold;
        margin-bottom: 0.5rem; 
    }

    input, select {
        width: 100%;
        padding: 0.6rem;
        border-radius: 5px;
        border: none;
        background-color: var(--vscode-dropdown-background);
        color: var(--vscode-editor-foreground);
    }


    .upload-button, .delete-button, .save-button, .generate-button {
        padding: 0.7rem;
        border-radius: 5px;
        border: none;
        font-weight: bold;
        cursor: pointer;
        text-align: center;
        transition: background 0.3s ease-in-out;
    }

    .save-button {
        width: 100%;
        background: linear-gradient(90deg, #4EA8DE, #80ED99);
        color: white;
    }

    .save-button:hover {
        opacity: 0.8;
    }

    .footer {
        margin-top: auto; 
    }

    .generate-button {
        width: 100%;
        background: #4EA8DE;
        color: white;
    }

    .generate-button:hover {
        background: #3B82F6;
    }

    .file-upload-wrapper {
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }

    .file-name-display {
        flex: 1;
        padding: 0.6rem;
        background: transparent;
        color: #E0E1DD;
        font-size: 1rem;
        outline: none;
        border-bottom: 2px solid #4EA8DE;
        cursor: pointer;
    }

    .upload-button {
        background: linear-gradient(90deg, #4EA8DE, #80ED99);
        color: white;
    }

    .delete-button {
        background: #F44336;
        color: white;
    }

    .delete-button:hover {
        background: #D32F2F;
    }

    .hidden-file-input {
        display: none;
    }
</style>

<div class="container">
    <h2>Athena Settings</h2>

    <div class="input-wrapper">
        <label for="apiKey">OpenAI API Key:</label>
        <input id="apiKey" bind:value={apiKey} placeholder="Enter your API key" />
    </div>

    <div class="input-wrapper">
        <label>Upload Coding Standard (PDF):</label>
        <div class="file-upload-wrapper">
            <input class="file-name-display" type="text" readonly bind:value={fileName} />
            {#if !fileName}
                <button class="upload-button" on:click={() => document.getElementById('fileInput').click()}>Upload</button>
            {/if}
            {#if fileName}
                <button class="delete-button" on:click={deleteFile}>Delete</button>
            {/if}
            <input id="fileInput" class="hidden-file-input" type="file" accept=".pdf" on:change={handleFileUpload} />
        </div>
    </div>

    <div class="input-wrapper">
        <label for="detailLevel">Detail Level:</label>
        <select id="detailLevel" bind:value={detailLevel}>
            <option value="Basic">Basic</option>
            <option value="Intermediate">Intermediate</option>
            <option value="Advanced">Advanced</option>
        </select>
    </div>

    <button class="save-button" on:click={saveSettings}>Save Settings</button>

    <div class="footer">
        <button class="generate-button" on:click={sendToBackend}>Generate Documentation</button>
    </div>
</div>
