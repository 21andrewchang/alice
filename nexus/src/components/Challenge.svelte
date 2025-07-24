<script lang="ts">
	import { fade, scale } from 'svelte/transition';
	import { cubicOut, cubicIn } from 'svelte/easing';
	import { createEventDispatcher } from 'svelte';

	type Q = { q: string; options: string[]; correct: number };
	type FinishPayload = { nodeId: number };
	export let challengeNode;
	console.log('Challenge Node', challengeNode);

	const QUESTIONS: Q[] = [
		{
			q: 'What is the what is the what is the what is the what?',
			options: ['1', '2', '3', '4'],
			correct: 3
		},
		{ q: 'What is the what is the what is the what?', options: ['1', '2', '3', '4'], correct: 3 },
		{ q: 'What is the what is the what?', options: ['1', '2', '3', '4'], correct: 3 },
		{ q: 'What is the what?', options: ['1', '2', '3', '4'], correct: 3 },
		{ q: 'What?', options: ['1', '2', '3', '4'], correct: 3 }
	];

	const dispatch = createEventDispatcher();

	let i = 0;
	let answers: number[] = Array(QUESTIONS.length).fill(-1);

	// results state
	let step: 'quiz' | 'results' = 'quiz';
	let correctCount = 0;
	let expEarned = 0;
	const EXP_PER_CORRECT = 10;

	function pick(optIdx: number) {
		answers[i] = optIdx;

		// last question -> finish
		if (i === QUESTIONS.length - 1) {
			endQuiz();
			return;
		}
		i += 1;
	}

	function endQuiz() {
		correctCount = answers.reduce(
			(acc, ans, idx) => acc + (ans === QUESTIONS[idx].correct ? 1 : 0),
			0
		);
		expEarned = correctCount * EXP_PER_CORRECT;
		step = 'results';
	}

	function close() {
		dispatch('finish', { expEarned: expEarned });
	}
</script>

<div class="fixed inset-0 z-[999] flex items-center justify-center p-4">
	<!-- overlay -->
	<div
		class="absolute inset-0 bg-black/60 backdrop-blur-sm"
		in:fade={{ duration: 180, easing: cubicOut }}
		out:fade={{ duration: 140, easing: cubicIn }}
	/>

	<!-- card -->
	<div
		class="relative z-10 h-full max-h-[80vh] w-full max-w-3xl overflow-auto rounded-md border border-white/20
		       bg-black/70 p-6 text-white backdrop-blur-2xl"
		style="-webkit-backdrop-filter: blur(24px);"
		transition:scale={{ start: 0.9, duration: 200, easing: cubicOut }}
	>
		{#if step === 'quiz'}
			<div class="mb-6 flex items-center justify-between">
				<h2 class="text-xl font-semibold">
					Mastery Challenge – {challengeNode.label}
				</h2>
				<span class="text-xs text-white/50">{i + 1}/{QUESTIONS.length}</span>
			</div>

			<p class="mb-4 text-sm leading-relaxed">{QUESTIONS[i].q}</p>

			<div class="flex flex-col gap-2">
				{#each QUESTIONS[i].options as opt, idx}
					<button
						class="rounded-sm border border-white/15 bg-white/5 px-3 py-2 text-left text-xs hover:bg-white/10"
						on:click={() => pick(idx)}
					>
						{opt}
					</button>
				{/each}
			</div>
		{:else}
			<h2 class="mb-4 text-xl font-semibold">Results</h2>
			<p class="mb-2 text-sm">
				Correct: {correctCount} / {QUESTIONS.length}
			</p>
			<p class="mb-6 text-sm">
				EXP earned: {expEarned}
			</p>

			<button
				class="rounded-sm border border-white/20 bg-white/10 px-4 py-2 text-sm hover:bg-white/20"
				on:click={close}
			>
				Done
			</button>
		{/if}
	</div>
</div>
