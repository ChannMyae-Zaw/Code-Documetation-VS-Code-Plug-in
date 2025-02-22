<script>
    import { onMount, tick } from "svelte";
    import PrimarySidebar from "./components/PrimarySidebar.svelte";
    import SecondarySidebar from "./components/SecondarySidebar.svelte";

    let sidebarType = null; // Will be set via message from VS Code

    onMount(async () => {
        await tick(); // Ensure DOM updates before accessing window.sidebarType
        sidebarType = window.sidebarType; // ✅ Read from injected script
        console.log("Sidebar Type:", sidebarType);
    });
    
</script>

{#if sidebarType === "primary"}
<PrimarySidebar />
{:else if sidebarType === "secondary"}
<SecondarySidebar />
{:else}
    <p>Loading...</p>
{/if}
