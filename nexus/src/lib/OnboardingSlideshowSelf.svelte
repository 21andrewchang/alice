<script lang="ts">
	import { onMount, createEventDispatcher } from 'svelte';
	import { tweened } from 'svelte/motion';
	import { cubicOut } from 'svelte/easing';

	export let onSetRecommendation: (rec: {
		node: any;
		confidence: number;
		timestamp: string;
	}) => void;

	const dispatch = createEventDispatcher();

	// Steps: 0=interest,1=level,2=complete
	let step: 0 | 1 | 2 = 0;

	// User selections
	let selectedInterest: { title: string; description: string } | null = null;
	let selectedLevel: 'beginner' | 'intermediate' | 'advanced' | null = null;

	// Graph data
	let mergedGraph: any = { nodes: [] };

	// Recommendation state
	let recommendationNode: any = null;
	let recommendationExplanation = '';

	// Progress bar (0..100)
	const progress = tweened(0, { duration: 300, easing: cubicOut });
	$: progress.set(((step + 1) / 3) * 100);

	// Static mapping
	const staticRecommendations = {
		beginner: 31, // Matrix Multiplication
		intermediate: 1, // Neural Networks
		advanced: 10 // Transformer
	};
	const staticRecommendationExplanations = {
		beginner: 'Start with core foundations to build up confidence and intuition.',
		intermediate: 'You have some grounding—dive into how models represent and transform data.',
		advanced: 'You’re ready for high-leverage, architecture-level understanding.'
	};

	const interests = [
		{
			title: 'Transformers & Sequence Modeling',
			description:
				'Learn how modern AI models understand and generate sequences, from language to time series.'
		},
		{
			title: 'Robotics & Control',
			description:
				'Understand how perception and action are coupled in real-world intelligent systems.'
		},
		{
			title: 'Foundations of Representation Learning',
			description:
				'Build solid intuition around embeddings, feature vectors, and how models encode knowledge.'
		}
	];

	onMount(async () => {
		try {
			const res = await fetch('/merged_graph.json');
			if (!res.ok) throw new Error('failed to load graph');
			mergedGraph = await res.json();
		} catch (e) {
			console.warn('Could not load graph for recommendation:', e);
		}
	});

	function handleInterestContinue() {
		if (!selectedInterest) return;
		step = 1;
	}

	function handleLevelContinue() {
		if (!selectedLevel) return;
		// Determine recommendation
		const bracket = selectedLevel;
		const nodeId = staticRecommendations[bracket];
		recommendationNode = mergedGraph.nodes?.find((n: any) => n.id === nodeId) || null;
		recommendationExplanation = staticRecommendationExplanations[bracket];

		// Persist / callback
		if (recommendationNode) {
			const payload = {
				node: recommendationNode,
				confidence: 1.0,
				timestamp: new Date().toISOString()
			};
			if (typeof localStorage !== 'undefined') {
				localStorage.setItem('userBracket', bracket);
				localStorage.setItem('currentRecommendation', JSON.stringify(payload));
			}
			if (onSetRecommendation) {
				onSetRecommendation(payload);
			}
			dispatch('finish', { bracket, recommendation: recommendationNode });
		}

		step = 2;
	}

	function finish() {
		// In case you want a separate confirm button
		if (recommendationNode && selectedLevel) {
			dispatch('finish', {
				bracket: selectedLevel,
				recommendation: recommendationNode
			});
		}
	}
</script>

<!-- Progress Bar -->
<div class="mb-4 h-2 w-full rounded-full bg-gray-800">
	<div class="h-2 rounded-full bg-white" style="width: {$progress}%"></div>
</div>

{#if step === 0}
	<!-- Interest selection -->
	<div class="space-y-6">
		<h2 class="text-2xl font-bold">Welcome to Alice</h2>
		<p class="text-lg opacity-80">What are you most interested in mastering?</p>
		<div class="grid grid-cols-1 gap-4 md:grid-cols-3">
			{#each interests as interest}
				<div
					class="card"
					class:selected={selectedInterest === interest}
					on:click={() => (selectedInterest = interest)}
				>
					<div class="font-semibold">{interest.title}</div>
					<div class="mt-1 text-sm opacity-80">{interest.description}</div>
				</div>
			{/each}
		</div>
		<div class="mt-4">
			<button
				class="w-full rounded bg-indigo-600 py-2 font-semibold text-white disabled:opacity-50"
				on:click={handleInterestContinue}
				disabled={!selectedInterest}
			>
				Continue
			</button>
		</div>
	</div>
{:else if step === 1}
	<!-- Level self-assessment -->
	<div class="space-y-6">
		<h2 class="text-2xl font-bold">What’s your current level?</h2>
		<p class="text-lg opacity-80">Self-select the description that best fits your understanding.</p>
		<div class="grid grid-cols-1 gap-4 md:grid-cols-3">
			{#each ['beginner', 'intermediate', 'advanced'] as level}
				<div
					class="card"
					class:selected={selectedLevel === level}
					on:click={() => (selectedLevel = level as 'beginner' | 'intermediate' | 'advanced')}
				>
					<div class="font-semibold capitalize">{level}</div>
					<div class="mt-1 text-sm opacity-80">
						{#if level === 'beginner'}
							I’m just getting started and want to build core foundations.
						{:else if level === 'intermediate'}
							I understand basics and want to deepen and connect concepts.
						{:else}
							I’m comfortable with fundamentals and want advanced material.
						{/if}
					</div>
				</div>
			{/each}
		</div>
		<div class="mt-4">
			<button
				class="w-full rounded bg-indigo-600 py-2 font-semibold text-white disabled:opacity-50"
				on:click={handleLevelContinue}
				disabled={!selectedLevel}
			>
				See Recommendation
			</button>
		</div>
	</div>
{:else}
	<!-- Completion / recommendation -->
	<div class="space-y-6">
		<h2 class="text-2xl font-bold">Ready to begin</h2>
		{#if recommendationNode}
			<div class="rounded border border-gray-600 bg-[#1f2230] p-6">
				<div class="mb-1 text-sm font-semibold">Recommended Next Step</div>
				<div class="text-xl font-bold">{recommendationNode.label}</div>
				<div class="mt-2 text-sm opacity-80">{recommendationExplanation}</div>
			</div>
		{:else}
			<div class="text-sm text-red-400">Could not load recommendation. Please try again.</div>
		{/if}
		<div class="mt-4 flex flex-col gap-2">
			<button class="w-full rounded bg-green-600 py-2 font-semibold text-white" on:click={finish}>
				Continue to App
			</button>
			<button
				class="w-full rounded border border-gray-600 bg-transparent py-2 font-semibold text-white"
				on:click={() => (window.location.href = '/login')}
			>
				Create account
			</button>
		</div>
	</div>
{/if}

<style>
	.card {
		border: 1px solid #444;
		background: #0f111b;
		padding: 1rem;
		display: flex;
		flex-direction: column;
		cursor: pointer;
		transition: box-shadow 0.2s;
	}
	.card.selected {
		border-color: #fff;
		box-shadow: 0 0 16px rgba(100, 150, 255, 0.6);
	}
</style>
