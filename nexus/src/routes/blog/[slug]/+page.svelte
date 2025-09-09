<script lang="ts">
	export let data: {
		component: unknown;
		metadata: { title: string; date: string; excerpt?: string };
	};
	const Post = data.component as any;
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
	<div class="container mx-auto px-18 py-8 text-neutral-200">
		<a
			href="/blog"
			rel="prefetch"
			class="group inline-flex items-center gap-2 rounded-full py-1.5 text-sm text-neutral-700 transition hover:text-neutral-100 hover:ring-white/25"
		>
			<svg
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				class=" h-4 w-4 transition-transform duration-200 group-hover:-translate-x-1"
			>
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
			</svg>
			<span>Back to all posts</span>
		</a>

		<p class="mt-6 text-sm text-neutral-500">
			{new Date(data.metadata.date).toLocaleDateString()}
		</p>
		<h1 class="mb-6 text-4xl font-bold text-white">{data.metadata.title}</h1>

		<article class="prose prose-invert max-w-none">
			<svelte:component this={Post} />
		</article>
	</div>
</div>

<style>
	/* minimal prose tweaks (optional) */
	.prose :where(a):not(:where([class~='not-prose'] *)) {
		color: #a3a3a3;
	}
</style>
