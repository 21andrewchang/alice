<script lang="ts">
	import { goto } from '$app/navigation';

	const categories = [
		{
			id: 'computer-vision',
			title: 'Computer Vision',
			icon: '📷',
			subtitle: 'Applying ML to images and video',
			examples: [
				'Real-time Object Detection for Drones',
				'Medical Image Segmentation',
				'Augmented Reality Filters',
				'Self-Driving Car Perception',
				'Crop Disease Detection via Leaf Imaging'
			]
		},
		{
			id: 'natural-language-processing',
			title: 'Natural Language Processing',
			icon: '💬',
			subtitle: 'Applying ML to text and speech',
			examples: [
				'Domain Chatbot',
				'News Summarizer',
				'Sentiment Analysis',
				'Document Q&A',
				'Low-Resource Translation'
			]
		}
	];

	function toNLP() {
		goto('/learn/nlp');
	}
	function toCV() {
		goto('/learn/cv');
	}
</script>

<div class="flex min-h-screen flex-col justify-center bg-[#151515] p-8 text-white">
	<div class="mb-8 text-center">
		<h1 class="inline-flex items-center gap-2 text-4xl font-semibold">
			<span class="text-3xl">🤖</span>
			Machine Learning
		</h1>
		<p class="mt-2 text-[#616161]">
			Select a topic to begin with. You can change directions any time.
		</p>
	</div>

	<!-- Center the grid and constrain card width -->
	<div class="mx-auto grid max-w-6xl grid-cols-1 justify-center gap-8 md:grid-cols-2">
		{#each categories as { icon, title, subtitle, examples }}
			<button
				class="w-full max-w-xl cursor-pointer rounded-2xl bg-[#1F1F1F] p-6 text-left transition hover:bg-[#2A2A2A]"
				onclick={() => toCV()}
			>
				<div class="flex items-center gap-2">
					<span class="text-xl">{icon}</span>
					<h2 class="text-xl font-semibold text-purple-400">{title}</h2>
				</div>
				<p class="text-[#616161]">{subtitle}</p>
				<ul class="mt-4 space-y-2 text-xs text-gray-200">
					{#each examples as item}
						<li>• {item}</li>
					{/each}
				</ul>
			</button>
		{/each}
	</div>
</div>
