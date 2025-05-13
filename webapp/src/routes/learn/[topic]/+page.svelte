<script lang="ts">
	const resources = [
		{ title: 'Video 1: What Is Machine Learning?', url: '#' },
		{ title: 'Video 2: Introduction to Linear Algebra', url: '#' },
		{ title: 'Video 3: Probability Basics', url: '#' },
		{ title: 'Video 4: Convolution Explained', url: '#' },
		{ title: 'Video 5: Histogram Filtering', url: '#' },
		{ title: 'Video 6: Thresholding Techniques', url: '#' },
		{ title: 'Video 7: Fourier Transforms', url: '#' },
		{ title: 'Video 8: Edge Detection Fundamentals', url: '#' }
	];

	const timeline = [
		'Introduction',
		'Linear Algebra',
		'Probability',
		'Convolution',
		'Filtering',
		'Transforms',
		'Detection'
	];
</script>

<div class="min-h-screen bg-[#151515] p-4 text-white">
	<!-- Header -->
	<div class="flex items-end justify-between px-8">
		<h1 class="text-4xl font-semibold">Introduction</h1>
	</div>

	<!-- Content: two columns -->
	<div class="mt-6 flex gap-8 px-8">
		<div class="flex-1">
			<div class="h-100 overflow-y-auto rounded-lg bg-[#1E1E1E] p-4"></div>
		</div>

		<!-- Right: timeline -->
		<div class="w-1/3">
			<h2 class="mb-2 text-sm text-[#606060]">Timeline</h2>
			<div class="max-h-80 overflow-y-auto rounded-lg bg-[#1E1E1E] p-4">
				<ul class="space-y-2 text-sm">
					{#each timeline as step, i}
						<li class="flex items-center">
							<span class="mr-2 h-2 w-2 rounded-full bg-[#BB9AF7]"></span>
							<span class={i === 0 ? 'font-semibold' : ''}>
								{step}
							</span>
						</li>
					{/each}
				</ul>
			</div>
		</div>
	</div>
</div>
