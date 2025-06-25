<script lang="ts">
	import { goto } from '$app/navigation';
	const upNext = [
		{
			title: '1D Convolutional Kernels',
			note: 'Branches to NLP',
			difficulty: 2
		},
		{
			title: 'Padding & Stride',
			difficulty: 2,
			url: 'C_zFhWdM4ic'
		},
		{
			title: 'GPU Accelerated Convolution',
			difficulty: 4,
			url: 'zSbXfnQPx_k'
		}
	];
	const timeline = [
		{ title: 'Convolution', difficulty: 1, url: 'KuXjwB4LzSA' },
		{ title: 'Filtering', difficulty: 1, url: 'C_zFhWdM4ic' },
		{ title: 'Histogram', difficulty: 2, url: 'zSbXfnQPx_k' },
		{ title: 'Thresholding', difficulty: 3, url: '6pX3II2eVs0' },
		{ title: 'SIFT', difficulty: 4, url: 'flFbNka62v8' },
		{ title: 'SURF', difficulty: 4, url: 'PBTrwymDVCg' },
		{ title: 'ORB', difficulty: 4, url: '0sPlnrEMyYk' },
		{ title: 'Edge Detection', difficulty: 2, url: 'PS7zHKwXWRM' },
		{ title: 'SVM', difficulty: 3, url: '_YPScrckx28' },
		{ title: 'Classification', difficulty: 3, url: 'aircAruvnKk' },
		{ title: 'CNN', difficulty: 3, url: 'QzY57FaENXg' },
		{ title: 'Object Detection', difficulty: 4, url: '30qEZ8d2osg' },
		{ title: 'Pose Estimation', difficulty: 3, url: 'mlXs5kIQ5p4' },
		{ title: 'Optical Flow', difficulty: 4, url: 'lnXFcmLB7sM' },
		{ title: 'Object Tracking', difficulty: 4, url: 'p6gp8CLMDOo' },
		{ title: '3D Reconstruction', difficulty: 5, url: 'tqBD6rxiul4' },
		{ title: 'Stereo Vision', difficulty: 4, url: 'hUVyDabn1Mg' }
	];
	let content = $state(timeline[0]);
</script>

<div class="min-h-screen bg-[#151515] p-4 text-white">
	<!-- Header -->
	<div class="flex items-end justify-between">
		<h1 class="text-4xl font-semibold">{content.title}</h1>
		<div class="w-1/4">
			<h2 class="text-xs text-[#606060]">Milestones</h2>
		</div>
	</div>

	<div class="mt-2 flex gap-8">
		<div class="flex-1">
			<div class="overflow-y-auto rounded-lg bg-[#1E1E1E] p-4">
				<iframe
					class="aspect-video w-full overflow-hidden rounded-lg"
					src={`https://www.youtube.com/embed/${content.url}`}
					title="YouTube video player"
					frameborder="0"
					allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
					allowfullscreen
				></iframe>
			</div>
			<div class="mt-4 flex flex-col">
				<text class="text-2xl font-semibold">Summary</text>
				<text class="text-[#B0B0B0]"
					>Convolution is a mathematical operation where a small filter (kernel) slides over input
					data and computes a weighted sum at each position to detect local patterns. In computer
					vision, 2D convolutions on image pixels extract edges, textures, and shapes; stacking
					layers builds hierarchical features for tasks like classification and detection. In NLP,
					1D convolutions over word or character embeddings capture local n-gram features within a
					sentence. Convolution isn’t just used in computer vision but also in NLP for processing
					sentences.</text
				>
			</div>
			<div class="mt-4 flex flex-col">
				<h2 class="mb-3 text-2xl font-semibold text-white">Up Next</h2>
				<div class="grid grid-cols-1 gap-4">
					{#each upNext as item}
						<div
							role="button"
							onclick={() => {
								goto('/learn/nlp');
							}}
							class="flex items-center justify-between rounded-lg bg-[#191919] p-4 transition hover:bg-[#242424]"
						>
							<div class="flex flex-row items-center space-x-1">
								{#each Array(5) as _, i}
									<div
										class="h-2 w-2 rounded-full"
										class:bg-[#5B8DF2]={i < item.difficulty}
										class:bg-[#212121]={i >= item.difficulty}
									></div>
								{/each}
								<div class="ml-2 flex flex-col">
									<span class="text-lg font-medium text-white">{item.title}</span>
								</div>
								<div class="ml-2 flex flex-col">
									<span class="text-lg font-medium text-[#606060]">{item.note}</span>
								</div>
							</div>
							<svg
								class="h-5 w-5 text-gray-400"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M9 5l7 7-7 7"
								/>
							</svg>
						</div>
					{/each}
				</div>
			</div>
		</div>

		<!-- Right: timeline -->
		<div class="w-1/4">
			<ul class="space-y-2 text-sm">
				{#each timeline as subtopic, index}
					<li class="flex items-center">
						<button
							onclick={() => {
								content = timeline[index];
							}}
							class="flex w-full flex-row items-center justify-between rounded-lg bg-[#191919] p-4 py-3 hover:bg-[#242424]"
						>
							<text>{subtopic.title}</text>
							<div class="flex flex-row space-x-1">
								{#each Array(5) as _, i}
									<div
										class="h-2 w-2 rounded-full"
										class:bg-[#5B8DF2]={i < subtopic.difficulty}
										class:bg-[#212121]={i >= subtopic.difficulty}
									></div>
								{/each}
							</div>
						</button>
					</li>
				{/each}
			</ul>
		</div>
	</div>
</div>
