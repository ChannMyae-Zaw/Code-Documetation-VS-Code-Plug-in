<script>
    import { onMount } from "svelte";
    import PrimarySidebar from "./components/PrimarySidebar.svelte";
    import SecondarySidebar from "./components/SecondarySidebar.svelte";

    let sidebarType = null; // Will be set via message from VS Code

    onMount(() => {
        const vscode = acquireVsCodeApi();

        // Listen for messages from the webview
        window.addEventListener("message", (event) => {
            if (event.data.type === "setSidebar") {
                sidebarType = event.data.sidebar; // "primary" or "secondary"
            }
        });

        // Request sidebar type from VS Code immediately
        vscode.postMessage({ type: "requestSidebarType" });
    });
</script>

{#if sidebarType === "primary"}
    <PrimarySidebar />
{:else if sidebarType === "secondary"}
    <SecondarySidebar />
{:else}
    <p>Loading...</p>
{/if}
