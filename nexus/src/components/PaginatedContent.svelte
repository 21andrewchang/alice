<!-- PaginatedContent.svelte -->
<script lang="ts">
	import { currentPageStore } from '$lib/stores';
	import { onMount, onDestroy, afterUpdate } from 'svelte';
	import { nodeStatusService } from '$lib/nodeStatus';
	import { writable } from 'svelte/store';
	import { createEventDispatcher } from 'svelte';

	function onPrevNode() {
		dispatch('prevNode');
	}
	function onNextNode() {
		dispatch('nextNode');
	}

	export let node: any;
	export let parseNodeLinks: (content: string) => string;
	export let onClose: () => void;
	export let nodesVisited: number = 0;

	let mastery = 0;
	const dispatch = createEventDispatcher();

	function masteryIcon(level: number | null) {
		if (level === null) return '';
		return `/mastery${level}.png`;
	}

	function openChallenge(e: MouseEvent) {
		e.stopPropagation(); // fixed
		console.log('starting challenge for node: ', node.id);
		dispatch('challenge', { node });
	}

	// Track node-status re-renders
	const nodeStatusVersion = writable(0);
	function updateContentWithLatestNodeStatus() {
		nodeStatusVersion.update((v) => v + 1);
	}

	function getDomainColor(domain: string) {
		const domainColors = {
			math: '#5B8DF2',
			tech: '#73DACA',
			physics: '#BA6FFF',
			humanities: '#F88951',
			ai: '#FF6B9D',
			hardware: '#FFD93D',
			'research-papers': '#BFCAF3'
		} as const;
		return (domainColors as any)[domain] || '#3A5A8F';
	}

	// ---------- YouTube helpers (robust + simple string transforms) ----------
	function normalizeUrl(u: string): string {
		// Add https:// if missing so URL() doesn't throw
		if (!/^https?:\/\//i.test(u)) return `https://${u}`;
		return u;
	}

	function extractYouTube(urlStr: string): { id: string; start: number } | null {
		try {
			let u: URL;
			try {
				u = new URL(urlStr);
			} catch {
				u = new URL(normalizeUrl(urlStr));
			}

			const host = u.hostname.replace(/^www\./, '');
			if (!['youtube.com', 'youtu.be', 'm.youtube.com', 'youtube-nocookie.com'].includes(host))
				return null;

			let id = '';
			const p = u.pathname;

			if (host === 'youtu.be') {
				id = p.split('/')[1] || '';
			} else if (p === '/watch') {
				id = u.searchParams.get('v') || '';
			} else if (p.startsWith('/shorts/')) {
				id = p.split('/')[2] || '';
			} else if (p.startsWith('/embed/')) {
				id = p.split('/')[2] || '';
			} else if (p.startsWith('/live/')) {
				id = p.split('/')[2] || '';
			}

			// Typical 11-char YouTube IDs; accept 10–15 to be tolerant
			if (!/^[A-Za-z0-9_-]{10,15}$/.test(id)) return null;

			// Parse start time (supports ?t=123, ?t=1h2m3s, ?start=45)
			const t = u.searchParams.get('t') || u.searchParams.get('start') || '';
			let start = 0;
			if (/^\d+$/.test(t)) start = parseInt(t, 10);
			else if (t) {
				const m = t.match(/(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?/);
				if (m)
					start =
						parseInt(m[1] || '0', 10) * 3600 +
						parseInt(m[2] || '0', 10) * 60 +
						parseInt(m[3] || '0', 10);
			}

			return { id, start };
		} catch {
			return null;
		}
	}

	function makeEmbedHTML(origUrl: string, id: string, start: number): string {
		const qs = start ? `?start=${start}&rel=0&modestbranding=1` : `?rel=0&modestbranding=1`;
		// Use nocookie for fewer tracking cookies
		const src = `https://www.youtube-nocookie.com/embed/${id}${qs}`;
		return `
<div class="yt-embed" data-yt-url="${origUrl}">
  <div class="yt-ratio">
    <iframe
      src="${src}"
      title="YouTube video"
      loading="lazy"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
      referrerpolicy="strict-origin-when-cross-origin"
      allowfullscreen
    ></iframe>
  </div>
</div>`;
	}

	// 1) Replace anchor tags with embeds when href is a YouTube URL
	// 2) Replace bare YouTube URLs in text nodes with embeds
	function embedYouTubes(html: string): string {
		// Replace anchors first (double/single quotes in href)
		html = html.replace(
			/<a\s+[^>]*href=(?:"([^"]+)"|'([^']+)')[^>]*>(.*?)<\/a>/gim,
			(_m, h1: string, h2: string, inner: string) => {
				const href = (h1 || h2 || '').trim();
				const parsed = extractYouTube(href);
				if (!parsed) return _m;
				return makeEmbedHTML(href, parsed.id, parsed.start);
			}
		);

		// Replace bare URLs (avoid those that are already inside attributes)
		// Matches start-of-line or whitespace or '>' before the URL to reduce false positives
		html = html.replace(
			/(^|[\s>])((?:https?:\/\/)?(?:www\.)?(?:youtube\.com|youtu\.be|youtube-nocookie\.com)\/[^\s<"']+)/gim,
			(_m, pre: string, urlLike: string) => {
				const parsed = extractYouTube(urlLike);
				if (!parsed) return _m;
				return `${pre}${makeEmbedHTML(urlLike, parsed.id, parsed.start)}`;
			}
		);

		return html;
	}
	// ---------- end YouTube helpers ----------

	// Build pages dynamically from node content
	let pages: Array<{ title: string; content: string | null; type: 'section' | 'quiz' }> = [];
	if (node.content?.abstract) {
		pages.push({ title: 'Abstract', content: node.content.abstract, type: 'section' });
	} else if (node.description) {
		pages.push({ title: 'Description', content: node.description, type: 'section' });
	}
	if (node.content) {
		for (const key in node.content) {
			if (key !== 'abstract' && key !== 'description' && key !== 'original_paper_url') {
				pages.push({
					title: key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
					content: node.content[key],
					type: 'section'
				});
			}
		}
	}
	const totalPages = pages.length;

	// Current page store
	let currentPage: number;
	currentPageStore.subscribe((pagesStore) => {
		currentPage = pagesStore[node.id] || 0;
	});
	function setPage(pageNum: number) {
		if (pageNum >= 0 && pageNum < totalPages) {
			currentPageStore.update((pagesStore) => ({ ...pagesStore, [node.id]: pageNum }));
		}
	}
	function nextPage() {
		setPage(currentPage + 1);
	}
	function prevPage() {
		setPage(currentPage - 1);
	}

	function handleMouseEnter(e: MouseEvent) {
		(e.target as HTMLButtonElement).style.color = '#222222';
	}
	function handleMouseLeave(e: MouseEvent) {
		(e.target as HTMLButtonElement).style.color = '#777777';
	}
	function handleFinishButtonHover(e: MouseEvent) {
		(e.target as HTMLButtonElement).style.backgroundColor = '#8A9BB8';
	}
	function handleFinishButtonLeave(e: MouseEvent) {
		(e.target as HTMLButtonElement).style.backgroundColor = '#BFCAF3';
	}

	function handleNodeStatusUpdate() {
		updateContentWithLatestNodeStatus();
	}

	onMount(() => {
		window.addEventListener('nodeStatusUpdated', handleNodeStatusUpdate);
		window.addEventListener('focus', handleNodeStatusUpdate);
		updateContentWithLatestNodeStatus();
	});
	onDestroy(() => {
		window.removeEventListener('nodeStatusUpdated', handleNodeStatusUpdate);
		window.removeEventListener('focus', handleNodeStatusUpdate);
	});
</script>

<div class="flex h-full flex-col bg-transparent">
	<!-- Header -->
	<div class="mb-4 flex items-center justify-between border-b border-[#222] p-2">
		<div class="flex items-center gap-2">
			<button on:click={onPrevNode} disabled={true}
				><svg
					xmlns="http://www.w3.org/2000/svg"
					fill="none"
					viewBox="0 0 24 24"
					stroke-width="1.5"
					stroke="currentColor"
					class="size-4"
				>
					<path stroke-linecap="round" stroke-linejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
				</svg>
			</button>
			<button on:click={onNextNode} disabled={true}>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					fill="none"
					viewBox="0 0 24 24"
					stroke-width="1.5"
					stroke="currentColor"
					class="size-4"
				>
					<path stroke-linecap="round" stroke-linejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
				</svg>
			</button>
		</div>
		<p
			class="text-sm"
			style="color: {node.type === 'paper' ? '#BFCAF3' : getDomainColor(node.domain || 'tech')};"
		>
			{node.label}
		</p>
		<button
			on:click={onClose}
			class="flex h-8 w-8 items-center justify-center rounded-full text-xs transition-colors"
			style="color: #AAA;"
			on:mouseenter={handleMouseEnter}
			on:mouseleave={handleMouseLeave}
			aria-label="Close"
		>
			✕
		</button>
	</div>

	<!-- Content -->
	<div class="relative flex-1 overflow-y-auto">
		<div class="px-6 pb-6">
			{#if node.content?.original_paper_url}
				<div class="mb-6 rounded-lg">
					<div class="flex items-center gap-3">
						<div
							class="flex h-6 w-6 items-center justify-center rounded-full text-xs"
							style="background-color: #BFCAF3; color: #111111;"
						>
							📄
						</div>
						<div class="flex w-full flex-row items-center justify-between">
							<div class="text-sm font-medium" style="color: #BFCAF3;">Original Paper</div>
							<a
								href={node.content.original_paper_url}
								target="_blank"
								rel="noopener noreferrer"
								class="text-sm hover:underline"
								style="color: #888888;">View on arXiv →</a
							>
						</div>
					</div>
				</div>
			{/if}

			{#if pages[currentPage].type === 'section'}
				<div class="mb-6">
					<div class="text-sm leading-relaxed whitespace-pre-line" style="color: #B3B3B3;">
						{#key $nodeStatusVersion}
							{@html embedYouTubes(parseNodeLinks(pages[currentPage].content || ''))}
						{/key}
					</div>
				</div>
			{/if}
		</div>
	</div>

	<!-- Footer -->
	<div class="pointer-events-auto relative">
		<div
			class="relative flex items-center justify-between gap-4 border-t border-white/10 bg-black/80 px-4 py-3 backdrop-blur-2xl"
		>
			<div class="flex items-center">
				{#if node.mastery !== 0}
					<div class="mr-1 h-4 w-4">
						<img src={masteryIcon(node.mastery)} alt="Mastery icon" />
					</div>
				{/if}
				<div class="text-xs font-semibold text-white/80">
					{node.mastery !== null ? `Mastery ${node.mastery}` : 'No Mastery'}
				</div>
			</div>
			<button
				class="rounded-full bg-neutral-200 px-4 py-2 text-xs font-semibold text-black transition hover:bg-white/50"
				on:click={openChallenge}
			>
				Start Challenge
			</button>
		</div>
	</div>
</div>

<style>
	:global(.onboarding-content),
	:global(.onboarding-content *) {
		color: #fff !important;
	}

	/* YouTube embed styles */
	.yt-embed {
		margin: 12px 0;
	}
	.yt-ratio {
		position: relative;
		height: 0;
		padding-bottom: 56.25%;
	}
	.yt-ratio iframe {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		border: 0;
		border-radius: 12px;
	}

	.yt-fallback-link {
		color: #88a;
		text-decoration: underline;
	}

	@keyframes glowPulse {
		0%,
		100% {
			box-shadow: 0 0 18px 2px rgba(191, 202, 243, 0.18);
		}
		50% {
			box-shadow: 0 0 28px 8px rgba(191, 202, 243, 0.35);
		}
	}
</style>
