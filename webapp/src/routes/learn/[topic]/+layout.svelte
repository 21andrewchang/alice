<script lang="ts">
	export let params: { topic: string };
	import { goto } from '$app/navigation';
</script>

<div class="flex min-h-screen flex-col bg-[#151515] text-white">
	<!-- Top bar -->
	<header class="flex items-center justify-between bg-[#151515] px-6 py-4">
		<div class="justify-row flex">
			<button on:click={() => history.back()} class="text-sm text-[#5A5F7D] hover:underline">
				← Back
			</button>
			<div class="flex items-center space-x-2">
				<slot name="topic" />
				<span>/</span>
				<slot name="lesson-title" />
			</div>
		</div>
	</header>

	<!-- Lesson content -->
	<main class="flex-1 overflow-auto p-6">
		<slot />
	</main>
</div>
