<script lang="ts">
	export let params: { topic: string };
	import { goto } from '$app/navigation';
</script>

<div class="flex min-h-screen flex-col bg-[#151515] text-white">
	<!-- Top bar -->
	<header class="flex items-center justify-between bg-[#151515] px-6 py-4">
		<div class="justify-row flex justify-center">
			<button on:click={() => history.back()} class="mr-6 text-sm text-[#B0B0B0] hover:underline">
				← Back
			</button>
			<div class="flex items-center space-x-2">
				<slot name="topic" />
				<text class="text-xs text-[#BB9AF7]">🤖 Machine Learning</text>
				<span class="text-xs text-[#3A3A3A]">/</span>
				<slot name="lesson-title" />
				<text class="text-xs text-[#B0B0B0]">Introduction</text>
			</div>
		</div>
	</header>

	<!-- Lesson content -->
	<main class="flex-1 overflow-auto p-6">
		<slot />
	</main>
</div>
