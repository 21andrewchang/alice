<!-- src/routes/+page.svelte -->
<script lang="ts">
	import { goto } from '$app/navigation';
	let query = '';

	function handleSubmit() {
		const lower = query.toLowerCase();
		if (lower.includes('machine learning')) goto('/ml');
	}
</script>

<div class="flex min-h-screen flex-col items-center justify-center bg-[#0E0F14] px-4 text-white">
	<div class="absolute top-4 left-4 opacity-30"></div>
	<div class="absolute top-4 right-4">
		<!-- Avatar -->
		<img src="/avatar.png" alt="user" class="h-10 w-10 rounded-full" />
	</div>

	<!-- Prompt -->
	<h1 class="mb-6 text-center text-2xl font-semibold text-[#D2D7EB] sm:text-3xl">
		What would you like to learn?
	</h1>

	<!-- Input box -->
	<input
		type="text"
		bind:value={query}
		on:keydown={(e) => e.key === 'Enter' && handleSubmit()}
		placeholder="Ask about anything..."
		class="mb-6 w-full max-w-xl rounded-xl bg-[#1E2335] px-6 py-3 text-[#3B4161] outline-none focus:ring-2"
	/>

	<!-- Preset topic buttons -->
	<div class="flex flex-wrap justify-center gap-4">
		<button
			on:click={() => goto('/ml')}
			class="rounded-full bg-[#171A27] px-4 py-2 text-xs text-[#BB9AF7]"
		>
			<span class="mr-2">🤖</span> Machine Learning
		</button>
		<button class="rounded-full bg-[#171A27] px-4 py-2 text-xs text-[#EC6C75]"
			><span class="mr-2">📖</span> Linguistics</button
		>
		<button class="rounded-full bg-[#171A27] px-4 py-2 text-xs text-[#7AA2F7]"
			><span class="mr-2">🕹️</span>3D Graphics</button
		>
		<button class="rounded-full bg-[#171A27] px-4 py-2 text-xs text-[#4FD6BE]"
			><span class="mr-2">🧠</span>Neuroanatomy</button
		>
	</div>
</div>
