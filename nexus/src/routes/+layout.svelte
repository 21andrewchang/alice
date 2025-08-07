<script lang="ts">
	import '../app.css';

	let { children } = $props();
</script>

{@render children()}

<style>
	/* force it to be global, not scoped to this component */
	:global(html) {
		scroll-behavior: smooth;
	}
</style>
