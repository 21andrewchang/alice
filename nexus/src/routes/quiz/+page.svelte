<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { tweened } from 'svelte/motion';
	import { cubicOut } from 'svelte/easing';

	const dispatch = createEventDispatcher();

	/* -----------------------------
	   Config
	------------------------------*/
	const DEFAULT_BATCH_SIZE = 30; // comparisons per batch
	const K_FACTOR = 32; // Elo step size

	type Interest = {
		id: number;
		category: 'The Frontier' | 'Earth' | 'Humans' | 'The Arts' | 'Civilization';
		title: string;
		icon: string;
		description: string;
		keywords: string[];
	};

	/* -----------------------------
	   Interests (20 total)
	------------------------------*/
	const interests: Interest[] = [
		/* --- The Frontier --- */
		{
			id: 1,
			category: 'The Frontier',
			title: 'Space',
			icon: '🚀',
			description: 'Exploring beyond Earth: missions, habitats, satellites.',
			keywords: ['space', 'aerospace', 'orbital', 'satellite']
		},
		{
			id: 2,
			category: 'The Frontier',
			title: 'Robots',
			icon: '🤖',
			description: 'Machines that see, think, and act in the real world.',
			keywords: ['robots', 'robotics', 'embodied ai']
		},
		{
			id: 3,
			category: 'The Frontier',
			title: 'Drones',
			icon: '🛸',
			description: 'Flying things—mapping, delivery, cinematography.',
			keywords: ['drones', 'uav', 'quadrotor']
		},
		{
			id: 4,
			category: 'The Frontier',
			title: 'AI companions',
			icon: '🧑‍🤝‍🧑',
			description: 'Assistants that understand and help in daily life.',
			keywords: ['ai companions', 'assistants', 'agents']
		},
		{
			id: 5,
			category: 'The Frontier',
			title: 'Bioengineering',
			icon: '🧬',
			description: 'Designing biology—cells, genes, and new materials.',
			keywords: ['bioengineering', 'genetics', 'synbio']
		},
		{
			id: 6,
			category: 'The Frontier',
			title: 'Brain–computer interfaces',
			icon: '🧠',
			description: 'Bridging neural signals and technology.',
			keywords: ['bci', 'neurotech', 'brain computer interface']
		},
		{
			id: 7,
			category: 'The Frontier',
			title: 'Virtual worlds',
			icon: '🌐',
			description: 'Immersive spaces for play, work, and creation.',
			keywords: ['virtual worlds', 'xr', 'vr', 'metaverse']
		},

		/* --- Earth --- */
		{
			id: 8,
			category: 'Earth',
			title: 'Climate',
			icon: '🌍',
			description: 'Reducing emissions and adapting to change.',
			keywords: ['climate', 'carbon', 'adaptation']
		},
		{
			id: 9,
			category: 'Earth',
			title: 'Clean energy',
			icon: '⚡',
			description: 'Solar, wind, storage, and next-gen power.',
			keywords: ['clean energy', 'renewables', 'storage']
		},
		{
			id: 10,
			category: 'Earth',
			title: 'Sustainable agriculture',
			icon: '🌾',
			description: 'Growing food with less waste and impact.',
			keywords: ['agriculture', 'agtech', 'sustainable food']
		},

		/* --- Humans --- */
		{
			id: 11,
			category: 'Humans',
			title: 'Healthcare',
			icon: '🏥',
			description: 'Better care, access, and outcomes.',
			keywords: ['healthcare', 'medtech', 'care delivery', 'elder care']
		},
		{
			id: 12,
			category: 'Humans',
			title: 'Psychology',
			icon: '🧘',
			description: 'Understanding human behavior and thought.',
			keywords: ['mental health', 'wellness', 'psychology', 'behavior']
		},
		{
			id: 13,
			category: 'Humans',
			title: 'Performance',
			icon: '🏃',
			description: 'Training, recovery, and expanding human potential.',
			keywords: ['performance', 'fitness', 'recovery', 'nutrition', 'longevity', 'lifespan']
		},
		{
			id: 14,
			category: 'Humans',
			title: 'Prosthetics',
			icon: '🦿',
			description: 'Augmenting motion and independence.',
			keywords: ['exoskeleton', 'prosthetics', 'bionic']
		},

		/* --- The Arts --- */
		{
			id: 15,
			category: 'The Arts',
			title: 'Music',
			icon: '🎵',
			description: 'Creating, producing, and performing sound.',
			keywords: ['music', 'audio', 'sound']
		},
		{
			id: 16,
			category: 'The Arts',
			title: 'Games',
			icon: '🎮',
			description: 'Interactive play and virtual worlds.',
			keywords: ['games', 'interactive', 'gaming']
		},
		{
			id: 17,
			category: 'The Arts',
			title: 'Visual design',
			icon: '🎨',
			description: 'Animations, color theory, typography, and systems.',
			keywords: ['visual design', 'ui', 'aesthetics', 'animation', 'photography', 'film']
		},

		/* --- Civilization --- */
		{
			id: 18,
			category: 'Civilization',
			title: 'Autonomous Vehicles',
			icon: '🚇',
			description: 'How people and goods move at scale.',
			keywords: ['public transit', 'rail', 'bus', 'cars', 'transportation', 'autonomy', 'vehicles']
		},
		{
			id: 19,
			category: 'Civilization',
			title: 'Emergency Response',
			icon: '🛡️',
			description: 'Preparedness, response, and trust.',
			keywords: ['public safety', 'emergency', 'response', 'defense']
		},
		{
			id: 20,
			category: 'Civilization',
			title: 'Infrastructure',
			icon: '🏙️',
			description: 'Intelligent and scalable living systems.',
			keywords: [
				'infrastructure',
				'grid',
				'utilities',
				'housing',
				'architecture',
				'smart buildings'
			]
		}
	];

	/* -----------------------------
	   Suggest-an-interest (optional)
	------------------------------*/
	let otherInterest = '';
	let suggestionSubmitted = false;

	/* -----------------------------
	   Flow state
	   step: 0=intro, 1=pairs, 2=checkpoint, 3=top interests, 4=results
	------------------------------*/
	let step: 0 | 1 | 2 | 3 | 4 = 0;
	const progress = tweened(0, { duration: 300, easing: cubicOut });

	/* -----------------------------
	   Elo + Pairing state
	------------------------------*/
	const ratings: Record<number, number> = {};
	interests.forEach((i) => (ratings[i.id] = 1000));

	type Pair = { left: Interest; right: Interest };

	let batchIndex = 0;
	let inBatchCount = 0; // comparisons completed in current batch
	let currentBatchTarget = DEFAULT_BATCH_SIZE;
	const FIRST_BATCH_MIN = Math.ceil(interests.length / 2); // show every interest at least once
	let coveragePairs: Pair[] = []; // first-batch coverage queue
	const seenPairs = new Set<string>(); // per-batch uniqueness

	let currentPair: Pair | null = null;

	type UndoStep = { a: number; b: number; prevA: number; prevB: number; key: string };
	const undoStack: UndoStep[] = [];

	let ranked: Interest[] = [];

	// progress bar: batch-relative during pairing; full when checkpoint/results
	$: progress.set(step === 1 ? (inBatchCount / currentBatchTarget) * 100 : step >= 2 ? 100 : 0);

	/* -----------------------------
	   Helpers
	------------------------------*/
	function pairKey(a: number, b: number) {
		return a < b ? `${a}-${b}` : `${b}-${a}`;
	}
	function expectedScore(ra: number, rb: number) {
		return 1 / (1 + Math.pow(10, (rb - ra) / 400));
	}

	function applyElo(winnerId: number, loserId: number) {
		const ra = ratings[winnerId];
		const rb = ratings[loserId];
		const ea = expectedScore(ra, rb);
		const eb = expectedScore(rb, ra);
		const prevA = ra,
			prevB = rb;
		ratings[winnerId] = ra + K_FACTOR * (1 - ea);
		ratings[loserId] = rb + K_FACTOR * (0 - eb);
		undoStack.push({ a: winnerId, b: loserId, prevA, prevB, key: pairKey(winnerId, loserId) });
	}

	function applyDraw(aId: number, bId: number) {
		const ra = ratings[aId];
		const rb = ratings[bId];
		const ea = expectedScore(ra, rb);
		const eb = expectedScore(rb, ra);
		const prevA = ra,
			prevB = rb;
		ratings[aId] = ra + K_FACTOR * (0.5 - ea);
		ratings[bId] = rb + K_FACTOR * (0.5 - eb);
		undoStack.push({ a: aId, b: bId, prevA, prevB, key: pairKey(aId, bId) });
	}

	function buildCoveragePairs(): Pair[] {
		const arr = [...interests];
		// shuffle
		for (let i = arr.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[arr[i], arr[j]] = [arr[j], arr[i]];
		}
		const pairs: Pair[] = [];
		let leftover: Interest | null = null;
		for (let i = 0; i < arr.length; i += 2) {
			if (i + 1 < arr.length) pairs.push({ left: arr[i], right: arr[i + 1] });
			else leftover = arr[i];
		}
		if (leftover) {
			const mate = arr[Math.floor(Math.random() * (arr.length - 1))];
			pairs.push({ left: leftover, right: mate });
		}
		return pairs;
	}

	function chooseNextPair(): Pair | null {
		// Consume coverage queue first (only batch 1)
		if (coveragePairs.length > 0) {
			const p = coveragePairs.shift()!;
			seenPairs.add(pairKey(p.left.id, p.right.id));
			return p;
		}
		// Then sample unique random pairs within this batch
		const maxTries = 200;
		for (let t = 0; t < maxTries; t++) {
			const i = interests[Math.floor(Math.random() * interests.length)];
			const j = interests[Math.floor(Math.random() * interests.length)];
			if (j.id === i.id) continue;
			const key = pairKey(i.id, j.id);
			if (seenPairs.has(key)) continue;
			seenPairs.add(key);
			return { left: i, right: j };
		}
		return null; // exhausted
	}

	function startBatch() {
		batchIndex += 1;
		inBatchCount = 0;
		seenPairs.clear();
		undoStack.length = 0; // clear undo per batch to avoid cross-batch confusion

		if (batchIndex === 1) {
			coveragePairs = buildCoveragePairs();
			currentBatchTarget = Math.max(DEFAULT_BATCH_SIZE, FIRST_BATCH_MIN);
		} else {
			coveragePairs = [];
			currentBatchTarget = DEFAULT_BATCH_SIZE;
		}

		currentPair = chooseNextPair();
		step = 1;
	}

	// Preserve public entrypoint name you were calling
	function startPairs() {
		startBatch();
	}

	function advance() {
		inBatchCount += 1;
		if (inBatchCount >= currentBatchTarget) {
			toCheckpoint();
			return;
		}
		currentPair = chooseNextPair() ?? null;
		if (!currentPair) {
			// out of fresh pairs for this batch
			toCheckpoint();
		}
	}

	function pickLeft() {
		if (!currentPair) return;
		applyElo(currentPair.left.id, currentPair.right.id);
		advance();
	}
	function pickRight() {
		if (!currentPair) return;
		applyElo(currentPair.right.id, currentPair.left.id);
		advance();
	}
	function pickTie() {
		if (!currentPair) return;
		applyDraw(currentPair.left.id, currentPair.right.id);
		advance();
	}

	function undoLast() {
		const last = undoStack.pop();
		if (!last) return;
		ratings[last.a] = last.prevA;
		ratings[last.b] = last.prevB;
		seenPairs.delete(last.key);
		inBatchCount = Math.max(0, inBatchCount - 1);
		// show that pair again (order by id for stability)
		const left = interests.find((i) => i.id === Math.min(last.a, last.b))!;
		const right = interests.find((i) => i.id === Math.max(last.a, last.b))!;
		currentPair = { left, right };
	}

	function toCheckpoint() {
		// sort once for preview
		ranked = [...interests].sort((a, b) => ratings[b.id] - ratings[a.id]);
		step = 2;
	}

	function continueAnotherBatch() {
		startBatch(); // ratings carry over; fresh 30 comparisons
	}

	function goToTopInterests() {
		// you already have ranked; reuse
		step = 3;
	}

	function generateMission() {
		step = 4;
	}

	function collectSelectedKeywords(): string[] {
		const selected = ranked.slice(0, 3);
		const bag = new Set<string>();
		selected.forEach((i) => i.keywords.forEach((k) => bag.add(k)));
		return Array.from(bag);
	}

	function finish() {
		const rankedInterests = ranked.map((i) => ({
			id: i.id,
			title: i.title,
			rating: Math.round(ratings[i.id]),
			keywords: i.keywords
		}));
		const selected = ranked.slice(0, 3);
		const topKeywords = collectSelectedKeywords();

		dispatch('finish', {
			bracket: null,
			recommendation: null,
			rankedInterests,
			selectedInterests: selected.map((i) => i.title),
			topKeywords
		});
	}
</script>

<div class="onboarding-bg fixed inset-0 z-50 flex items-center justify-center bg-black text-white">
	<div class="onboarding-panel mb-16 flex max-h-[80vh] min-h-0 w-full max-w-3xl flex-col p-8">
		<!-- bottom progress -->
		<div class="fixed inset-x-0 bottom-0 z-50 bg-black/80 shadow-md backdrop-blur-sm">
			<div class="relative mx-auto h-[2px] w-full overflow-visible rounded-full bg-neutral-900">
				<div class="relative h-full" style="width: {$progress}%">
					<div class="absolute inset-0 rounded-full bg-white"></div>
				</div>
			</div>
		</div>

		{#if step === 0}
			<!-- Intro -->
			<div class="space-y-2">
				<h2 class="mb-6 text-2xl font-bold">Dial in your interests</h2>
				<p class="text-lg opacity-80">
					Pick between two options. We’ll rank your interests and give you the most relevant
					companies.
				</p>

				<div class="flex flex-col items-end gap-1">
					{#if suggestionSubmitted}
						<div class="text-right text-xs text-green-400">
							Thanks! We'll review "{otherInterest}" and follow up if needed.
						</div>
					{/if}
				</div>

				<div class="mt-6 flex justify-end">
					<button
						class="self-end rounded-full bg-neutral-200 px-4 py-2 font-medium text-black transition hover:bg-white"
						on:click={startPairs}
						type="button">Start</button
					>
				</div>
			</div>
		{:else if step === 1}
			<!-- Pairwise picks -->
			<div class="space-y-4">
				<h2 class="text-2xl font-bold">Pick one</h2>
				<p class="text-sm opacity-70">Select a card to choose.</p>

				{#if currentPair}
					<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
						<!-- Left card -->
						<button class="card min-h-[180px]" on:click={pickLeft} type="button">
							<div class="flex h-full flex-col">
								<div class="mb-2 text-5xl">{currentPair.left.icon}</div>
								<div class="text-[10px] uppercase opacity-50">{currentPair.left.category}</div>
								<div class="mb-1 text-lg font-semibold">{currentPair.left.title}</div>
								<div class="flex-1 text-xs opacity-50">{currentPair.left.description}</div>
							</div>
						</button>

						<!-- Right card -->
						<button class="card min-h-[180px]" on:click={pickRight} type="button">
							<div class="flex h-full flex-col">
								<div class="mb-2 text-5xl">{currentPair.right.icon}</div>
								<div class="text-[10px] uppercase opacity-50">{currentPair.right.category}</div>
								<div class="mb-1 text-lg font-semibold">{currentPair.right.title}</div>
								<div class="flex-1 text-xs opacity-50">{currentPair.right.description}</div>
							</div>
						</button>
					</div>
				{:else}
					<div class="text-sm text-red-400">No more pairs available in this batch.</div>
				{/if}

				<div class="flex flex-row items-center justify-end gap-2">
					<button
						class="rounded-full border border-white/10 bg-black px-4 py-2 font-medium text-neutral-400 transition hover:border-white/20 hover:text-neutral-200"
						on:click={undoLast}
						type="button">Undo</button
					>
					<button
						class="rounded-full bg-neutral-200 px-4 py-2 font-medium text-black transition hover:bg-white"
						on:click={pickTie}
						type="button">Can’t decide</button
					>
				</div>
			</div>
		{:else if step === 2}
			<!-- Checkpoint after each 30-comparison batch -->
			<div class="flex min-h-0 flex-col gap-4">
				<div>
					<h2 class="text-2xl font-bold">Checkpoint</h2>
					<p class="text-sm opacity-70">
						Here’s your current interests ranking. Would you like to do another round of comparisons
						and refine it more?
					</p>
				</div>

				<!-- Snapshot: Top 6 -->
				<div class="min-h-0 flex-1 space-y-6 pr-1 pb-6">
					<div class="grid w-full grid-cols-1 items-stretch gap-3">
						{#each ranked.slice(0, 3) as i, idx}
							<div class="card w-full max-w-full justify-center overflow-x-hidden">
								<div class="flex items-start gap-3">
									<div class="shrink-0 text-4xl">{i.icon}</div>
									<!-- prevent text from expanding the row width -->
									<div class="min-w-0 flex-1">
										<div class="flex items-center justify-between">
											<div class="truncate text-lg font-semibold">{idx + 1}. {i.title}</div>
										</div>
										<div class="truncate text-[10px] uppercase opacity-50">{i.category}</div>
										<!-- wrap long sentences/words so they never force width -->
										<div class="text-md mt-1 break-words opacity-50">{i.description}</div>
									</div>
								</div>
							</div>
						{/each}
					</div>
				</div>
				<div class="mt-1 grid grid-cols-1 gap-30 sm:grid-cols-2">
					<button
						class="rounded-full border border-neutral-700 bg-black py-2 font-medium text-neutral-200 transition hover:opacity-80"
						on:click={continueAnotherBatch}
						type="button">Keep going</button
					>
					<button
						class="rounded-full bg-neutral-200 py-2 font-medium text-black transition hover:bg-white"
						on:click={goToTopInterests}
						type="button">Continue</button
					>
				</div>
			</div>
		{:else if step === 3}
			<!-- Top interests -->
			<div class="flex min-h-0 flex-col gap-4">
				<div>
					<h2 class="text-2xl font-bold">Your Top Interests</h2>
					<p class="text-sm opacity-70">
						These are your top 3 interests. We'll use them to find the best companies for you.
					</p>
				</div>

				<div class="min-h-0 flex-1 space-y-6 pr-1 pb-6">
					<div class="grid w-full grid-cols-1 items-stretch gap-3">
						{#each ranked.slice(0, 3) as i, idx}
							<div class="card w-full max-w-full justify-center overflow-x-hidden">
								<div class="flex items-start gap-3">
									<div class="shrink-0 text-4xl">{i.icon}</div>
									<!-- prevent text from expanding the row width -->
									<div class="min-w-0 flex-1">
										<div class="flex items-center justify-between">
											<div class="truncate text-lg font-semibold">{idx + 1}. {i.title}</div>
										</div>
										<div class="truncate text-[10px] uppercase opacity-50">{i.category}</div>
										<!-- wrap long sentences/words so they never force width -->
										<div class="text-md mt-1 break-words opacity-50">{i.description}</div>
									</div>
								</div>
							</div>
						{/each}
					</div>
				</div>

				<div class="flex flex-col">
					<button
						class="rounded-full bg-neutral-200 py-2 font-medium text-black transition hover:bg-white"
						on:click={generateMission}
						type="button">Find matches</button
					>
				</div>
			</div>
		{:else}
			<!-- Results (kept compact) -->
			<div class="flex min-h-0 flex-col gap-4">
				<div>
					<h2 class="text-2xl font-bold">Your Results</h2>
					<p class="text-md opacity-70">
						We’ll turn these into company targets and a starter project.
					</p>
				</div>

				<div class="min-h-0 flex-1 space-y-6 pr-1 pb-6">
					<div class="grid w-full grid-cols-1 items-stretch gap-3">
						{#each ranked.slice(0, 3) as i, idx}
							<div class="card w-full max-w-full justify-center overflow-x-hidden">
								<div class="flex items-start gap-3">
									<div class="shrink-0 text-4xl">{i.icon}</div>
									<!-- prevent text from expanding the row width -->
									<div class="min-w-0 flex-1">
										<div class="flex items-center justify-between">
											<div class="truncate text-lg font-semibold">{idx + 1}. {i.title}</div>
										</div>
										<div class="truncate text-[10px] uppercase opacity-50">{i.category}</div>
										<!-- wrap long sentences/words so they never force width -->
										<div class="text-md mt-1 break-words opacity-50">{i.description}</div>
									</div>
								</div>
							</div>
						{/each}
					</div>
				</div>
				<div class="mt-1 flex flex-col gap-2">
					<button
						class="rounded-full bg-neutral-200 py-2 font-medium text-black transition hover:opacity-80"
						on:click={finish}
						type="button">Generate my first project</button
					>
				</div>
			</div>
		{/if}
	</div>
</div>

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
