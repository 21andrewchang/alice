<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { tweened } from 'svelte/motion';
	import { cubicOut } from 'svelte/easing';

	export let onSetRecommendation: (rec: {
		node: any;
		confidence: number;
		timestamp: string;
	}) => void;

	const dispatch = createEventDispatcher();

	// consider done when progress is essentially full
	$: isDone = $progress >= 99.5;

	// Steps: 0=interest,1=level,2=complete
	let step: 0 | 1 | 2 = 0;

	// User selections
	let selectedInterest: { title: string; description: string; icon: string } | null = null;
	let selectedLevel: 'beginner' | 'intermediate' | 'advanced' | null = null;

	// bracket stored globally for finish()
	let bracket: 'beginner' | 'intermediate' | 'advanced' | null = null;

	// Progress bar (0..100)
	const progress = tweened(0, { duration: 300, easing: cubicOut });
	$: progress.set(((step + 1) / 3) * 100);

	// Current recommendation (derived from interest+level)
	let currentRecommendation: { id: number; label: string; explanation: string } | null = null;

	const interests = [
		{
			title: 'Games',
			icon: '🎮',
			description:
				'Dive into rating systems, skill estimation, and ranking algorithms like Elo and Glicko.'
		},
		{
			title: 'Computer Vision',
			icon: '🖼️',
			description:
				'Explore visual foundation models, image encoders, and how vision representations flow.'
		},
		{
			title: 'Robotics',
			icon: '🤖',
			description:
				'Understand how robots turn vision and commands into actions using Vision-Language-Action models.'
		}
	];

	const levels = [
		{
			key: 'beginner',
			label: 'Beginner',
			emoji: '🌱',
			subtitle: 'I’m just getting started.'
		},
		{
			key: 'intermediate',
			label: 'Intermediate',
			emoji: '🚀',
			subtitle: 'I understand basics and want to connect concepts.'
		},
		{
			key: 'advanced',
			label: 'Advanced',
			emoji: '🧠',
			subtitle: 'I’m comfortable with fundamentals.'
		}
	];

	const recommendationInfo: Record<
		string,
		Record<string, { id: number; label: string; explanation: string }>
	> = {
		Games: {
			beginner: {
				id: 7,
				label: 'Statistical Model',
				explanation:
					'Start with statistical modeling to understand how outcomes inform skill estimates.'
			},
			intermediate: {
				id: 0,
				label: 'Elo Rating System',
				explanation: 'Learn Elo to see incremental probabilistic rating updates.'
			},
			advanced: {
				id: 4,
				label: 'Glicko Rating System',
				explanation:
					'Move to Glicko for uncertainty-aware ratings that account for rating deviation.'
			}
		},
		'Computer Vision': {
			beginner: {
				id: 14,
				label: 'Image Encoder',
				explanation:
					'Understand how raw images are converted into meaningful features via an image encoder.'
			},
			intermediate: {
				id: 10,
				label: 'Segment Anything Model (SAM)',
				explanation: 'Interactively segment with SAM using prompts.'
			},
			advanced: {
				id: 9,
				label: 'SAM 2',
				explanation: 'Upgrade to SAM2 for real-time video-aware segmentation with streaming memory.'
			}
		},
		Robotics: {
			beginner: {
				id: 14,
				label: 'Image Encoder',
				explanation: 'Begin with visual representations from an image encoder.'
			},
			intermediate: {
				id: 22,
				label: 'Vision-Language Model',
				explanation: 'Fuse vision and language to ground instructions in perception.'
			},
			advanced: {
				id: 21,
				label: 'SmolVLA',
				explanation:
					'Use SmolVLA for efficient action generation with flow matching and asynchronous inference.'
			}
		}
	};

	function handleLevelContinue() {
		if (!selectedLevel || !selectedInterest) return;
		const interestKey = selectedInterest.title;
		bracket = selectedLevel;
		const info = recommendationInfo[interestKey]?.[bracket];
		if (!info) return;

		currentRecommendation = info;

		if (onSetRecommendation) {
			onSetRecommendation({
				node: { id: info.id, label: info.label, explanation: info.explanation },
				confidence: 1.0,
				timestamp: new Date().toISOString()
			});
		}

		step = 2;
	}

	function finish() {
		if (!selectedLevel || !selectedInterest || !currentRecommendation || !bracket) return;
		dispatch('finish', {
			bracket,
			recommendation: currentRecommendation.id
		});
	}
</script>

<div class="fixed inset-x-0 bottom-0 z-50 bg-black/80 shadow-md backdrop-blur-sm">
	<div class="relative mx-auto h-[2px] w-full overflow-visible rounded-full bg-neutral-900">
		<div class="relative h-full" style="width: {$progress}%">
			<div class="absolute inset-0 rounded-full bg-white"></div>
			<!-- subtle outward glow -->
			<!-- <div -->
			<!-- 	aria-hidden="true" -->
			<!-- 	class="glow-overlay pointer-events-none absolute inset-0 rounded-full p-1" -->
			<!-- 	class:pulse={isDone} -->
			<!-- 	style="box-shadow: 0 0 30px 2px rgba(255,255,255,0.3);" -->
			<!-- ></div> -->
		</div>
	</div>
</div>

{#if step === 0}
	<!-- Interest selection -->
	<div class="space-y-2">
		<h2 class="mb-6 text-2xl font-bold">Welcome to Alice</h2>
		<p class="text-lg opacity-80">Select a topic that interests you.</p>
		<div class="grid grid-cols-1 gap-4 md:grid-cols-3">
			{#each interests as interest}
				<button
					class="card"
					class:selected={selectedInterest === interest}
					on:click={() => {
						selectedInterest = interest;
						step = 1;
					}}
					type="button"
				>
					<div class="flex h-full flex-col">
						<div class="mb-2 text-5xl">{interest.icon}</div>
						<div class="mb-1 text-lg font-semibold">{interest.title}</div>
						<div class="flex-1 text-xs opacity-50">{interest.description}</div>
					</div>
				</button>
			{/each}
		</div>
	</div>
{:else if step === 1}
	<div class="space-y-6">
		<h2 class="text-2xl font-bold">What’s your current level?</h2>
		<p class="text-lg opacity-80">Self-select the description that best fits your understanding.</p>
		<div class="grid grid-cols-1 gap-4 md:grid-cols-3">
			{#each levels as lvl}
				<button
					class="card"
					class:selected={selectedLevel === lvl.key}
					on:click={() => {
						selectedLevel = lvl.key as 'beginner' | 'intermediate' | 'advanced';
						handleLevelContinue();
					}}
				>
					<div class="flex h-full flex-col">
						<div class="mb-2 text-4xl">{lvl.emoji}</div>
						<div class="mb-1 font-semibold capitalize">{lvl.label}</div>
						<div class="flex-1 text-xs opacity-50">{lvl.subtitle}</div>
					</div>
				</button>
			{/each}
		</div>
	</div>
{:else}
	<div class="space-y-6">
		<h2 class="text-2xl font-bold">Ready to begin</h2>
		{#if currentRecommendation}
			<div class="rounded border border-[#151515] bg-[#111111] p-6">
				<div class="mb-1 text-sm font-semibold">Recommended Next Step</div>
				<div class="text-xl font-bold">{currentRecommendation.label}</div>
				<div class="mt-2 text-sm opacity-80">{currentRecommendation.explanation}</div>
			</div>
		{:else}
			<div class="text-sm text-red-400">
				No recommendation available. Please revisit your selection.
			</div>
		{/if}
		<div class="mt-4 flex flex-col gap-2">
			<button class="w-full rounded bg-black py-2 font-semibold text-white" on:click={finish}>
				Continue to App
			</button>
		</div>
	</div>
{/if}

<style>
	.card {
		border: 1px solid #151515;
		border-radius: 8px;
		background: #111111;
		padding: 20px;
		display: flex;
		flex-direction: column;
		cursor: pointer;
		transition:
			transform 0.2s cubic-bezier(0.4, 0, 0.2, 1),
			box-shadow 0.25s ease;
		width: 100%;
		text-align: left;
		min-height: 180px;
		position: relative;
	}
	.card:hover {
		transform: scale(1.035);
		z-index: 1;
	}
	button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
</style>
