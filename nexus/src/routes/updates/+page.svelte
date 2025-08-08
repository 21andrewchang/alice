<script lang="ts">
	let updates = [
		{
			date: 'Aug 8, 2025',
			title: 'Skill Bracket Progress Bars',
			body: 'We added new progress bars to track mastery towards your next bracket level.'
		},
		{
			date: 'Aug 5, 2025',
			title: 'Recommendation Improvements',
			body: 'Recommendations now adapt faster based on recent mastery gains.'
		}
	];
</script>

<div class="min-h-screen bg-black text-neutral-200">
	<div
		class="sticky top-0 left-0 z-50 grid w-full grid-cols-[1fr_2fr_1fr] items-center bg-black/70
         p-4 px-24 backdrop-blur-3xl"
	>
		<a href="/" class="text-white">Alice</a>

		<div class="flex items-center justify-center gap-x-4">
			<a
				href="/#how-it-works"
				class="rounded-md px-2 py-1 text-[12px] text-neutral-400 transition hover:bg-neutral-800"
				>How It Works</a
			>
			<a
				href="/#mission"
				class="rounded-md px-2 py-1 text-[12px] text-neutral-400 transition hover:bg-neutral-800"
				>Our Mission</a
			>
			<a
				href="/updates"
				class="rounded-md px-2 py-1 text-[12px] text-neutral-400 transition hover:bg-neutral-800"
				>Updates</a
			>
			<a
				href="/contact"
				class="rounded-md px-2 py-1 text-[12px] text-neutral-400 transition hover:bg-neutral-800"
				>Contact Us</a
			>
		</div>

		<div class="flex items-center justify-end gap-x-2">
			<button class="rounded-md px-2 py-1 font-medium transition hover:bg-neutral-800">
				<div class="text-[12px] text-neutral-400">Log in</div>
			</button>
			<button
				class="rounded-md bg-neutral-200 px-2 py-1 text-[12px] text-black transition hover:bg-white"
			>
				Sign up
			</button>
		</div>
	</div>
	<section class="container mx-auto px-18 py-16">
		<h1 class="mb-2 text-4xl font-bold text-white">Updates</h1>
		<p class="mb-12 text-lg text-neutral-400">
			Latest improvements, features, and changes to Alice.
		</p>

		<div class="space-y-12">
			{#each updates as update}
				<article class="border-b border-neutral-800 pb-8">
					<p class="text-sm text-neutral-500">{update.date}</p>
					<h2 class="mt-1 text-xl font-semibold text-white">
						{update.title}
					</h2>
					<p class="mt-2 text-neutral-300">{update.body}</p>
				</article>
			{/each}
		</div>
	</section>
</div>
