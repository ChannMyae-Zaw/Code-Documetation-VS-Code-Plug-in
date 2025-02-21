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
    input {
        width: 80%;
        padding: 0.5rem;
        margin-bottom: 1rem;
    }
    button {
        padding: 0.5rem;
        background-color: var(--vscode-button-background);
        color: var(--vscode-button-foreground);
        border: none;
        cursor: pointer;
    }
    button:hover {
        background-color: var(--vscode-button-hoverBackground);
    }
</style>

<div class="container">
    <h2>Athena Profile Settings</h2>
    
    <div>
        <label for="apiKey">OpenAI API Key:</label>
        <input 
            id="apiKey"
            bind:value={apiKey} 
            placeholder="Enter your API key" 
        />
    </div>

    <div>
        <label for="fileUpload">Upload Coding Standard (PDF):</label>
        <input 
            id="fileUpload"
            type="file" 
            accept=".pdf" 
            on:change={handleFileUpload} 
        />
        {#if fileName}
            <p class="file-name">Selected: {fileName}</p>
        {/if}
    </div>

    <button on:click={saveSettings}>Save Settings</button>
</div>