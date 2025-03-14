<script>
    console.log("script working!!")
    import { onMount } from 'svelte';
    
    let msg = "Hello from Secondary Sidebar!";
    //let changes = null;
    let renamedSymbols = { keys: [], data: []};

    const vscode = acquireVsCodeApi();

    onMount(() => {
        console.log("onMount working");

        window.addEventListener("message", (event) => {
           /** const message = event.data;
            console.log("message: ", message);
            console.log("changes: ", message.changes);

            if (message.type === 'sendChanges') {
                changes = {...message.changes};  // ❌ Won't trigger UI update
                changes = { ...changes }; // ✅ Triggers reactivity
            }*/
            if (event.data.type === "sendChanges") {
            renamedSymbols = event.data.changes;
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
</script>

<h1>{msg}</h1>
{#if renamedSymbols.keys.length > 0}
    <h2>Renamed Symbols</h2>
    <ul>
        {#each renamedSymbols.keys as key, i}
            <li on:click={() => onSymbolClick(key.line, renamedSymbols.data[i].line)}>
                <strong>{key.name}</strong> → {renamedSymbols.data[i].name} 
                ({key.kind} at line {key.line})
            </li>
        {/each}
    </ul>
{/if}
<button on:click={applyChanges}>Apply Changes to Other Files</button>
<button on:click={rejectChanges} style="margin-left: 10px; background-color: red; color: white;">Reject Changes</button>
