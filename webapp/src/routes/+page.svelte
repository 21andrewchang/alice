<!-- src/routes/+page.svelte -->
<script lang="ts">
	import { goto } from '$app/navigation';
	let query = '';

	function handleSubmit() {
		const lower = query.toLowerCase();
		if (lower.includes('machine learning')) goto('/ml');
	}
</script>

<div class="flex min-h-screen flex-col items-center justify-center bg-[#151515] px-4 text-white">
	<div class="absolute top-4 left-4 opacity-30"></div>
	<div class="absolute top-4 right-4"></div>

	<!-- Prompt -->
	<h1 class="mb-6 text-center text-2xl font-semibold text-[#DFDFDF] sm:text-3xl">
		What would you like to learn?
	</h1>

	<!-- Input box -->
	<input
		type="text"
		bind:value={query}
		on:keydown={(e) => e.key === 'Enter' && handleSubmit()}
		placeholder="Ask about anything..."
		class="mb-4 w-full max-w-xl rounded-xl bg-[#191919] px-6 py-3 text-[#4D4D4D] ring-[#1F1F1F] outline-none hover:ring-1 focus:ring-1"
	/>

	<!-- Preset topic buttons -->
	<div class="flex flex-wrap justify-center gap-3">
		<button
			on:click={() => goto('/ml')}
			class="rounded-full bg-[#191919] px-4 py-2 text-xs text-[#BB9AF7] transition duration-300 ease-in-out hover:bg-[#1F1F1F]"
		>
			<span class="mr-2">🤖</span> Machine Learning
		</button>
		<button
			class="rounded-full bg-[#191919] px-4 py-2 text-xs text-[#EC6C75] transition duration-300 ease-in-out hover:bg-[#1F1F1F]"
			><span class="mr-2">💬</span> Linguistics</button
		>
		<button
			class="rounded-full bg-[#191919] px-4 py-2 text-xs text-[#7AA2F7] transition duration-300 ease-in-out hover:bg-[#1F1F1F]"
			><span class="mr-2">🕹️</span>3D Graphics</button
		>
		<button
			class="rounded-full bg-[#191919] px-4 py-2 text-xs text-[#4FD6BE] transition duration-300 ease-in-out hover:bg-[#1F1F1F]"
			><span class="mr-2">🧠</span>Neuroanatomy</button
		>
	</div>
</div>
