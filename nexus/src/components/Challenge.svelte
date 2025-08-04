<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { tweened } from 'svelte/motion';
	import { cubicOut } from 'svelte/easing';

	import quizBank from '$lib/quizBank.json';

	type Q = { q: string; options: string[]; correct: number };
	type BankQuestion = {
		id: number;
		text: string;
		options: string[];
		correctIndex: number;
		explanation?: string;
	};
	type QuizBank = Record<string, { questions: BankQuestion[] }>; // keys are stringified node ids

	export let challengeNode: { id: number; label: string };

	const dispatch = createEventDispatcher();

	// quiz state
	let QUESTIONS: Q[] = [];
	let i = 0;
	let answers: number[] = [];
	let step: 'quiz' | 'results' = 'quiz';
	let correctCount = 0;
	let expEarned = 0;
	const EXP_PER_CORRECT = 10;

	// progress bar (0..100)
	const progress = tweened(0, { duration: 300, easing: cubicOut });
	$: {
		const pct =
			step === 'results'
				? 100
				: QUESTIONS.length
					? ((i + (answers[i] !== -1 ? 1 : 0)) / QUESTIONS.length) * 100
					: 0;
		progress.set(pct);
	}

	// utility to shuffle
	function shuffleArray<T>(arr: T[]) {
		const a = [...arr];
		for (let j = a.length - 1; j > 0; j--) {
			const k = Math.floor(Math.random() * (j + 1));
			[a[j], a[k]] = [a[k], a[j]];
		}
		return a;
	}

	// whenever the challenge node changes, pick 5 random questions and reset
	$: if (challengeNode) {
		const entry = (quizBank as QuizBank)[String(challengeNode.id)];
		if (entry && entry.questions.length > 0) {
			const picked: BankQuestion[] = shuffleArray(entry.questions).slice(0, 5);
			QUESTIONS = picked.map((q) => ({
				q: q.text,
				options: q.options,
				correct: q.correctIndex
			}));
			// reset progress
			i = 0;
			answers = Array(QUESTIONS.length).fill(-1);
			step = 'quiz';
			correctCount = 0;
			expEarned = 0;
		} else {
			QUESTIONS = [];
		}
	}

	function pick(optIdx: number) {
		if (QUESTIONS.length === 0) return;
		answers[i] = optIdx;

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
		dispatch('finish', { expEarned, nodeId: challengeNode.id });
	}
</script>

<!-- container overlay -->
<div class="fixed inset-0 z-[999] flex items-center justify-center p-4">
	<div class="absolute inset-0 bg-black/60 backdrop-blur-sm" aria-hidden="true"></div>

	<!-- card -->
	<div
		class="relative z-10 flex h-full max-h-[80vh] w-full max-w-3xl flex-col overflow-auto rounded-lg border border-[#151515] bg-[#111111]/90 p-6 text-white shadow-lg backdrop-blur-2xl transition-transform duration-200 ease-out"
	>
		{#if step === 'quiz'}
			<div class="mb-4 flex items-center justify-between">
				<div>
					<h2 class="text-2xl font-bold">Mastery Challenge</h2>
					<div class="text-sm opacity-80">{challengeNode.label}</div>
				</div>
				<div class="text-xs text-white/50">
					Question {Math.min(i + 1, QUESTIONS.length)} / {QUESTIONS.length}
				</div>
			</div>

			<div class="flex-1">
				<p class="mb-6 text-base leading-relaxed">{QUESTIONS[i]?.q}</p>

				<div class="grid gap-3">
					{#each QUESTIONS[i]?.options as opt, idx}
						<button
							type="button"
							class="w-full rounded-lg border border-[#151515] bg-[#1f1f1f] px-4 py-3 text-left text-sm transition hover:bg-[#222222]"
							on:click={() => pick(idx)}
						>
							{opt}
						</button>
					{/each}
				</div>
			</div>
		{:else}
			<div class="mb-4">
				<h2 class="text-2xl font-bold">Results</h2>
				<div class="text-sm opacity-80">{challengeNode.label}</div>
			</div>
			<div class="flex flex-col gap-4">
				<div class="rounded border border-[#151515] bg-[#1f1f1f] p-5">
					<div class="mb-2 text-sm font-semibold">Summary</div>
					<div class="flex flex-col gap-1">
						<div class="text-base">
							Correct: <span class="font-medium">{correctCount}</span> / {QUESTIONS.length}
						</div>
						<div class="text-base">
							EXP earned: <span class="font-medium">{expEarned}</span>
						</div>
					</div>
				</div>
				<button
					type="button"
					class="w-max rounded-full bg-white px-6 py-2 font-medium text-black transition hover:opacity-90"
					on:click={close}
				>
					Done
				</button>
			</div>
		{/if}
	</div>

	<!-- bottom progress bar -->
	<div class="fixed inset-x-0 bottom-0 z-50 bg-black/80 shadow-md backdrop-blur-sm">
		<div class="relative mx-auto h-[2px] w-full overflow-visible rounded-full bg-neutral-900">
			<div class="relative h-full" style="width: {$progress}%">
				<div class="absolute inset-0 rounded-full bg-white"></div>
			</div>
		</div>
	</div>
</div>
