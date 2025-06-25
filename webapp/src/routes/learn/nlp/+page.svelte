<script lang="ts">
	// Next three topics after “Tokenization”
	const upNext = [
		{
			title: 'Stopwords',
			difficulty: 1,
			url: 'vUPAOU2NPls'
		},
		{
			title: 'Stemming & Lemmatization',
			difficulty: 2,
			url: 'JpxCt3kvbLk'
		},
		{
			title: 'Filtering',
			difficulty: 1,
			note: 'Merge back to Computer Vision',
			url: 'irzVuSO8o4g'
		}
	];

	// Full NLP timeline
	const timeline = [
		{
			title: 'Convolution in NLP',
			difficulty: 2,
			url: 'AGWieLbom_g'
		},
		{ title: 'Tokenization', difficulty: 1, url: 'fNxaJsNG3-s' },
		{ title: 'Stopwords', difficulty: 1, url: 'vUPAOU2NPls' },
		{ title: 'Stemming & Lemmatization', difficulty: 2, url: 'JpxCt3kvbLk' },
		{ title: 'Bag of Words', difficulty: 3, url: 'irzVuSO8o4g' },
		{ title: 'TF-IDF', difficulty: 3, url: 'OymqCnh-APA' },
		{ title: 'Word Embeddings', difficulty: 4, url: '9S0-OC4LFNo' },
		{ title: 'Document Similarity', difficulty: 4, url: 'MvG4dPplrRo' },
		{ title: 'Named Entity Recognition', difficulty: 3, url: '2XUhKpH0p4M' },
		{ title: 'Sentiment Analysis', difficulty: 3, url: '5HQCNAsSO-s' },
		{ title: 'Naive Bayes Classifier', difficulty: 4, url: 'O2L2Uv9pdDA' },
		{ title: 'Random Forest Classifier', difficulty: 4, url: 'gkXX4h3qYm4' },
		{ title: 'Topic Modeling (LDA)', difficulty: 4, url: '1_jq_gWFUuQ' },
		{ title: 'LSTMs', difficulty: 5, url: 'b61DPVFX03I' },
		{ title: 'Sequence Models', difficulty: 5, url: 'CznICCPa63Q' },
		{ title: 'Attention Mechanisms', difficulty: 5, url: 'lOrTlKrdmkQ' },
		{ title: 'Transformers', difficulty: 5, url: '4Bdc55j80l8' },
		{ title: 'Fine-Tuning Pretrained Models', difficulty: 5, url: 'pu3-PeBG0YU' },
		{ title: 'Text Summarization', difficulty: 5, url: 'XO97Uon83Os' },
		{ title: 'Chatbots', difficulty: 5, url: 'lZjUS_8btEo' },
		{ title: 'Machine Translation', difficulty: 5, url: '1Ufz75u4s24' }
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
				<text class="text-[#B0B0B0]">
					Convolution in NLP applies 1D filters over sequences of token or character embeddings to
					automatically extract local n-gram features. Each convolutional kernel spans a fixed
					window (e.g., three or five tokens) and slides along the text, computing feature maps that
					highlight patterns like key phrases or syntactic structures. After convolution, pooling
					layers (such as max-over-time pooling) distill the most salient signals from each feature
					map, creating a fixed-length representation regardless of sentence length. This approach
					underpins models like TextCNN for tasks ranging from sentiment analysis to topic
					classification, and it can be combined with deeper architectures or attention mechanisms
					to capture both local and global context.
				</text>
			</div>
			<div class="mt-4 flex flex-col">
				<h2 class="mb-3 text-2xl font-semibold text-white">Up Next</h2>
				<div class="grid grid-cols-1 gap-4">
					{#each upNext as item}
						<div
							role="button"
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
