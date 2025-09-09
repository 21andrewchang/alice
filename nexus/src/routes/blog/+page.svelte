<script lang="ts">
	export let data: { posts: { slug: string; title: string; date: string; excerpt?: string }[] };
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
				href="/blog"
				class="rounded-md px-2 py-1 text-[12px] text-neutral-400 transition hover:bg-neutral-800"
				>Blog</a
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
		<h1 class="mb-2 text-4xl font-bold text-white">Blog</h1>
		<p class="mb-12 text-lg text-neutral-400">Latest posts from the Founders of Alice.</p>

		<div class="space-y-10">
			{#each data.posts as p}
				<article class="border-b border-neutral-800 pb-8">
					<p class="text-sm text-neutral-500">{new Date(p.date).toLocaleDateString()}</p>
					<a
						href={`/blog/${p.slug}`}
						class="mt-1 block text-xl font-semibold text-white hover:underline"
					>
						{p.title}
					</a>
					{#if p.excerpt}
						<p class="mt-2 text-neutral-300">{p.excerpt}</p>
					{/if}
				</article>
			{/each}
		</div>
	</section>
</div>
