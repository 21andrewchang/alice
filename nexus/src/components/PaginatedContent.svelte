<!-- PaginatedContent.svelte -->
<script lang="ts">
	import { currentPageStore } from '$lib/stores';
	import { onMount, onDestroy, afterUpdate } from 'svelte';
	import { nodeStatusService } from '$lib/nodeStatus';
	import { writable } from 'svelte/store';
	import { createEventDispatcher } from 'svelte';

	export let node: any;
	export let parseNodeLinks: (content: string) => string;
	export let onClose: () => void;
	export let nodesVisited: number = 0;

	let mastery = 0;

	const dispatch = createEventDispatcher();

	function masteryIcon(level: number | null) {
		// you can adjust filenames as needed
		// e.g. /icons/mastery_0.png, /icons/mastery_1.png, etc.
		if (level === null) return '';
		const key = level;
		return `/mastery${key}.png`;
	}

	function openChallenge(e: MouseEvent) {
		e.stopPropagation;
		console.log('starting challenge for node: ', node.id);
		dispatch('challenge', { node: node });
	}
	// Create a reactive store to track node status changes
	const nodeStatusVersion = writable(0);

	// Function to force re-render of content when node status changes
	function updateContentWithLatestNodeStatus() {
		nodeStatusVersion.update((v) => v + 1);
	}

	// Add getDomainColor utility (copy from app page)
	function getDomainColor(domain: string) {
		const domainColors = {
			math: '#5B8DF2',
			tech: '#73DACA',
			sciences: '#BA6FFF',
			humanities: '#F88951',
			art: '#F7768E',
			'research-papers': '#BFCAF3'
		};
		return domainColors[domain as keyof typeof domainColors] || '#3A5A8F';
	}

	// Dynamically build pages based on available content sections
	let pages: Array<{ title: string; content: string | null; type: 'section' | 'quiz' }> = [];

	// Add abstract/description as first page
	if (node.content?.abstract) {
		pages.push({ title: 'Abstract', content: node.content.abstract, type: 'section' });
	} else if (node.description) {
		pages.push({ title: 'Description', content: node.description, type: 'section' });
	}

	// Add other content sections if available
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

	console.log(node);

	const totalPages = pages.length;

	// Subscribe to the current page store for this node
	let currentPage: number;
	currentPageStore.subscribe((pagesStore) => {
		currentPage = pagesStore[node.id] || 0;
	});

	function setPage(pageNum: number) {
		if (pageNum >= 0 && pageNum < totalPages) {
			currentPageStore.update((pagesStore) => ({
				...pagesStore,
				[node.id]: pageNum
			}));
		}
	}

	function nextPage() {
		setPage(currentPage + 1);
	}
	function prevPage() {
		setPage(currentPage - 1);
	}

	function handleMouseEnter(e: MouseEvent) {
		const target = e.target as HTMLButtonElement;
		target.style.color = '#222222';
	}
	function handleMouseLeave(e: MouseEvent) {
		const target = e.target as HTMLButtonElement;
		target.style.color = '#777777';
	}
	function handleFinishButtonHover(e: MouseEvent) {
		const target = e.target as HTMLButtonElement;
		target.style.backgroundColor = '#8A9BB8';
	}
	function handleFinishButtonLeave(e: MouseEvent) {
		const target = e.target as HTMLButtonElement;
		target.style.backgroundColor = '#BFCAF3';
	}

	// Keyboard navigation
	function handleKeydown(event: KeyboardEvent) {
		switch (event.key) {
			case 'ArrowLeft':
			case 'h':
			case 'H':
				event.preventDefault();
				prevPage();
				break;
			case 'ArrowRight':
			case 'l':
			case 'L':
				event.preventDefault();
				nextPage();
				break;
			case 'Home':
			case 'g':
			case 'G':
				event.preventDefault();
				setPage(0);
				break;
			case 'End':
				event.preventDefault();
				setPage(totalPages - 1);
				break;
		}
	}

	function handleNodeStatusUpdate() {
		// Force re-render of content with updated node statuses
		updateContentWithLatestNodeStatus();
	}

	onMount(() => {
		document.addEventListener('keydown', handleKeydown);

		// Listen for custom node status update events
		window.addEventListener('nodeStatusUpdated', handleNodeStatusUpdate);

		// Also listen for focus/blur events to catch when user returns to the page
		window.addEventListener('focus', handleNodeStatusUpdate);

		updateContentWithLatestNodeStatus();
	});

	onDestroy(() => {
		document.removeEventListener('keydown', handleKeydown);
		window.removeEventListener('nodeStatusUpdated', handleNodeStatusUpdate);
		window.removeEventListener('focus', handleNodeStatusUpdate);
	});
</script>

<div class="flex h-full flex-col bg-transparent">
	<!-- Header -->
	<div class="mb-4 flex items-center justify-between border-b border-[#222] p-2">
		<div class="flex items-center gap-2">
			<button
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
			<button>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					fill="none"
					viewBox="0 0 24 24"
					stroke-width="1.5"
					stroke="currentColor"
					class="size-4 stroke-[#222]"
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
			<!-- Link to original paper -->
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
								style="color: #888888;"
							>
								View on arXiv →
							</a>
						</div>
					</div>
				</div>
			{/if}

			<!-- Page content -->
			{#if pages[currentPage].type === 'section'}
				<div class="mb-6">
					<h3 class="mb-3 text-lg font-semibold" style="color: #BFCAF3;">
						{pages[currentPage].title}
					</h3>
					<div class="text-sm leading-relaxed whitespace-pre-line" style="color: #B3B3B3;">
						{#key $nodeStatusVersion}
							{@html parseNodeLinks(pages[currentPage].content || '')}
						{/key}
					</div>
				</div>
			{/if}
		</div>
	</div>
	<div class="pointer-events-auto relative">
		<div
			class="relative flex items-center justify-between gap-4
             border-t border-white/10 bg-black/80 px-4 py-3 backdrop-blur-2xl"
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
				class="rounded-sm bg-white px-3 py-2 text-xs font-medium text-black transition hover:bg-white/50"
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
