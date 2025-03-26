<script>
    import { onMount } from 'svelte';
    
    let msg = "Changes Made To Your Source Code";
    let renamedSymbols = { keys: [], data: []};
    let isLoading = true;

    const vscode = acquireVsCodeApi();

    onMount(() => {
        window.addEventListener("message", (event) => {
            if (event.data.type === "sendChanges") {
                renamedSymbols = event.data.changes;
                isLoading = false;
                console.log("Received in Svelte:", renamedSymbols);
            }
        });

        vscode.postMessage({ type: "getChanges" });
    });

    function applyChanges() {
        if (vscode) {
            vscode.postMessage({ type: "applyChanges" });
        }
    }

    function rejectChanges() {
        if (vscode) {
            vscode.postMessage({ type: "rejectChanges" });
        }
    }

    function onSymbolClick(originalLine, modifiedLine) {
        vscode.postMessage({
            type: 'scrollToLineInDiffView',
            originalLineNumber: originalLine,
            modifiedLineNumber: modifiedLine
        });
    }
    
    // Group symbols by their kind; constants, methods, classes, etc.
    $: groupedSymbols = renamedSymbols.keys.reduce((acc, key, i) => {
        const kind = key.kind || 'Other';
        if (!acc[kind]) acc[kind] = [];
        acc[kind].push({ key, data: renamedSymbols.data[i] });
        return acc;
    }, {});
</script>

<div class="sidebar-container">
    <header>
        <h1>{msg}</h1>
    </header>
    
    {#if isLoading}
        <div class="loading">
            <div class="spinner"></div>
            <p>Loading renamed symbols...</p>
        </div>
    {:else if renamedSymbols.keys.length > 0}
        <div class="content">
            <div class="summary">
                <div class="count">{renamedSymbols.keys.length}</div>
                <p>symbols renamed</p>
            </div>
            
            {#each Object.entries(groupedSymbols) as [kind, symbols]}
                <div class="symbol-group">
                    <h2>{kind}s ({symbols.length})</h2>
                    <ul>
                        {#each symbols as {key, data}}
                            <li class="symbol-item" on:click={() => onSymbolClick(key.range.start.line+1, data.range.start.line+1)}>
                                <div class="symbol-header">
                                    <span class="old-name">{key.name}</span>
                                    <span class="arrow">→</span>
                                    <span class="new-name">{data.name}</span>
                                </div>
                                <div class="symbol-details">
                                    <span class="kind-tag">{key.kind}</span>
                                    <span class="line-number">Line {key.range.start.line + 1}</span>
                                </div>
                            </li>
                        {/each}
                    </ul>
                </div>
            {/each}
        </div>
    {:else}
        <div class="empty-state">
            <p>No renamed symbols detected.</p>
        </div>
    {/if}
    
    <footer>
        <button class="apply-btn" on:click={applyChanges}>Apply Changes</button>
        <button class="reject-btn" on:click={rejectChanges}>Reject Changes</button>
    </footer>
</div>

<style>
    .sidebar-container {
        display: flex;
        flex-direction: column;
        height: 100%;
        font-family: var(--vscode-font-family);
        color: var(--vscode-foreground);
        padding: 0;
    }
    
    header {
        padding: 10px 15px;
        border-bottom: 1px solid var(--vscode-panel-border);
    }
    
    h1 {
        font-size: 18px;
        margin: 0;
        font-weight: 500;
    }
    
    h2 {
        font-size: 14px;
        margin: 15px 0 10px;
        color: var(--vscode-descriptionForeground);
    }
    
    .content {
        flex: 1;
        overflow-y: auto;
        padding: 0 15px;
    }
    
    .summary {
        display: flex;
        align-items: center;
        margin: 15px 0;
        padding: 10px;
        border-radius: 4px;
        background-color: var(--vscode-editor-background);
    }
    
    .count {
        font-size: 24px;
        font-weight: bold;
        margin-right: 10px;
        color: var(--vscode-symbolIcon-numberForeground);
    }
    
    ul {
        list-style: none;
        padding: 0;
        margin: 0;
    }
    
    .symbol-item {
        padding: 8px 10px;
        margin-bottom: 8px;
        border-radius: 4px;
        background-color: var(--vscode-editor-background);
        cursor: pointer;
        transition: background-color 0.2s;
    }
    
    .symbol-item:hover {
        background-color: var(--vscode-list-hoverBackground);
    }
    
    .symbol-header {
        display: flex;
        align-items: center;
        margin-bottom: 5px;
    }
    
    .old-name {
        text-decoration: line-through;
        color: var(--vscode-errorForeground);
        margin-right: 5px;
        font-family: var(--vscode-editor-font-family);
    }
    
    .arrow {
        margin: 0 5px;
        color: var(--vscode-descriptionForeground);
    }
    
    .new-name {
        color: var(--vscode-symbolIcon-classForeground);
        font-weight: bold;
        font-family: var(--vscode-editor-font-family);
    }
    
    .symbol-details {
        display: flex;
        font-size: 12px;
        color: var(--vscode-descriptionForeground);
    }
    
    .kind-tag {
        background-color: var(--vscode-badge-background);
        color: var(--vscode-badge-foreground);
        padding: 2px 6px;
        border-radius: 3px;
        margin-right: 8px;
    }
    
    .line-number {
        color: var(--vscode-descriptionForeground);
    }
    
    footer {
        display: flex;
        padding: 15px;
        border-top: 1px solid var(--vscode-panel-border);
        gap: 10px;
    }
    
    button {
        padding: 8px 16px;
        border-radius: 4px;
        font-size: 13px;
        cursor: pointer;
        border: none;
        flex: 1;
    }
    
    .apply-btn {
        background-color: var(--vscode-button-background);
        color: var(--vscode-button-foreground);
    }
    
    .apply-btn:hover {
        background-color: var(--vscode-button-hoverBackground);
    }
    
    .reject-btn {
        background-color: var(--vscode-errorForeground);
        color: white;
    }
    
    .reject-btn:hover {
        opacity: 0.9;
    }
    
    .loading {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100%;
    }
    
    .spinner {
        border: 4px solid rgba(0, 0, 0, 0.1);
        border-radius: 50%;
        border-top: 4px solid var(--vscode-progressBar-background);
        width: 30px;
        height: 30px;
        animation: spin 1s linear infinite;
        margin-bottom: 10px;
    }
    
    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
    
    .empty-state {
        display: flex;
        justify-content: center;
        align-items: center;
        height: 100%;
        color: var(--vscode-descriptionForeground);
    }
</style>