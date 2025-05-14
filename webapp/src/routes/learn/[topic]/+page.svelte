<script lang="ts">
	const timeline = [
		{
			title: 'Convolution',
			difficulty: 1,
			url: 'KuXjwB4LzSA'
		},
		{
			title: 'Filtering',
			difficulty: 1,
			url: 'C_zFhWdM4ic'
		},
		{
			title: 'Histogram',
			difficulty: 2,
			url: 'zSbXfnQPx_k'
		},
		{
			title: 'Thresholding',
			difficulty: 3,
			url: '6pX3II2eVs0'
		},
		{
			title: 'SIFT',
			difficulty: 4,
			url: 'flFbNka62v8'
		},
		{
			title: 'SURF',
			difficulty: 4,
			url: 'PBTrwymDVCg'
		},
		{
			title: 'Tracking',
			difficulty: 5,
			url: 'p6gp8CLMDOo'
		}
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
							<div class="h-2 w-2 rounded-full bg-[#BB9AF7]"></div>
						</button>
					</li>
				{/each}
			</ul>
		</div>
	</div>
</div>
