<script lang="ts">
	let { children } = $props();
</script>

{@render children()}

<style>
	:global(html) {
		scroll-behavior: smooth;
	}
</style>
