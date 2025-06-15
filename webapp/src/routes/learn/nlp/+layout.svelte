<script lang="ts">
	export let params: { topic: string };
	import { goto } from '$app/navigation';
</script>

<!-- flex‐col so header + main stack vertically -->
<div class="flex min-h-screen flex-col bg-[#151515] text-white">
	<!-- stick this header at the top -->
	<header class="sticky top-0 z-10 flex items-center justify-between bg-[#151515] px-6 py-4">
		<div class="flex items-center space-x-2">
			<button on:click={() => goto('/')} class="mr-6 text-sm text-[#B0B0B0] hover:underline">
				← Back
			</button>
			<span class="text-xs text-[#BB9AF7]">🤖 Machine Learning</span>
			<span class="text-xs text-[#3A3A3A]">/</span>
			<span class="text-xs text-[#B0B0B0]">Natural Language Processing</span>
		</div>
	</header>

	<!-- give main the rest of the height and allow scrolling -->
	<main class="flex-1 overflow-auto p-6">
		<slot />
	</main>
</div>
