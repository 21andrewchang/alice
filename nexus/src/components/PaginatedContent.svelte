<!-- PaginatedContent.svelte -->
<script lang="ts">
  import { currentPageStore } from '$lib/stores';
  import { onMount, onDestroy } from 'svelte';

  export let node: any;
  export let parseNodeLinks: (content: string) => string;
  export let onClose: () => void;

  // For now, we'll have 2 pages: abstract and everything else
  const totalPages = 2;
  
  // Subscribe to the current page store for this node
  let currentPage: number;
  currentPageStore.subscribe(pages => {
    currentPage = pages[node.id] || 0;
  });

  function setPage(pageNum: number) {
    if (pageNum >= 0 && pageNum < totalPages) {
      currentPageStore.update(pages => ({
        ...pages,
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

  function finishReading() {
    // For now, use mock data - in the future this will come from actual tracking
    const readingTime = 1800; // 30 minutes in seconds
    const checkpointScore = 85; // Mock checkpoint score
    const activeTime = 1600; // Mock active time
    
    const params = new URLSearchParams({
      paperId: node.id.toString(),
      paperTitle: node.label,
      readingTime: readingTime.toString(),
      checkpointScore: checkpointScore.toString(),
      activeTime: activeTime.toString()
    });
    
    window.location.href = `/rank?${params.toString()}`;
  }

  onMount(() => {
    document.addEventListener('keydown', handleKeydown);
  });

  onDestroy(() => {
    document.removeEventListener('keydown', handleKeydown);
  });
</script>

<div class="h-full flex flex-col" style="background-color: #111111;">
  <!-- Header -->
  <div class="flex items-center justify-between p-6">
    <h2 class="text-2xl font-bold" style="color: #BFCAF3;">{node.label}</h2>
    <button
      on:click={onClose}
      class="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
      style="color: #777777;"
      on:mouseenter={handleMouseEnter}
      on:mouseleave={handleMouseLeave}
      aria-label="Close"
    >
      ✕
    </button>
  </div>

  <!-- Content -->
  <div class="flex-1 overflow-y-auto relative">
    <div class="px-6 pb-6">
      <!-- Link to original paper -->
      {#if node.content.original_paper_url}
        <div class="mb-6 p-4 rounded-lg" style="background-color: #1a1a1a; border: 1px solid #333333;">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-full flex items-center justify-center" style="background-color: #BFCAF3; color: #111111;">
              📄
            </div>
            <div>
              <div class="font-medium" style="color: #BFCAF3;">Original Paper</div>
              <a 
                href="{node.content.original_paper_url}" 
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
      {#if currentPage === 0}
        <!-- Abstract -->
        {#if node.content.abstract}
          <div class="mb-6">
            <h3 class="text-lg font-semibold mb-3" style="color: #BFCAF3;">Abstract</h3>
            <div class="leading-relaxed" style="color: #B3B3B3;">
              {@html parseNodeLinks(node.content.abstract)}
            </div>
          </div>
        {/if}
      {:else}
        <!-- Rest of the content -->
        {#if node.content.introduction}
          <div class="mb-6">
            <h3 class="text-lg font-semibold mb-3" style="color: #BFCAF3;">Introduction</h3>
            <div class="leading-relaxed whitespace-pre-line" style="color: #B3B3B3;">
              {@html parseNodeLinks(node.content.introduction)}
            </div>
          </div>
        {/if}

        {#if node.content.model_architecture}
          <div class="mb-6">
            <h3 class="text-lg font-semibold mb-3" style="color: #BFCAF3;">Model Architecture</h3>
            <div class="leading-relaxed whitespace-pre-line" style="color: #B3B3B3;">
              {@html parseNodeLinks(node.content.model_architecture)}
            </div>
          </div>
        {/if}

        {#if node.content.why_self_attention}
          <div class="mb-6">
            <h3 class="text-lg font-semibold mb-3" style="color: #BFCAF3;">Why Self-Attention</h3>
            <div class="leading-relaxed whitespace-pre-line" style="color: #B3B3B3;">
              {@html parseNodeLinks(node.content.why_self_attention)}
            </div>
          </div>
        {/if}

        {#if node.content.training}
          <div class="mb-6">
            <h3 class="text-lg font-semibold mb-3" style="color: #BFCAF3;">Training</h3>
            <div class="leading-relaxed whitespace-pre-line" style="color: #B3B3B3;">
              {@html parseNodeLinks(node.content.training)}
            </div>
          </div>
        {/if}

        {#if node.content.results}
          <div class="mb-6">
            <h3 class="text-lg font-semibold mb-3" style="color: #BFCAF3;">Results</h3>
            <div class="leading-relaxed whitespace-pre-line" style="color: #B3B3B3;">
              {@html parseNodeLinks(node.content.results)}
            </div>
          </div>
        {/if}

        {#if node.content.conclusion}
          <div class="mb-6">
            <h3 class="text-lg font-semibold mb-3" style="color: #BFCAF3;">Conclusion</h3>
            <div class="leading-relaxed whitespace-pre-line" style="color: #B3B3B3;">
              {@html parseNodeLinks(node.content.conclusion)}
            </div>
          </div>
        {/if}

        <!-- Finish Reading Button -->
        <div class="text-center mt-8 mb-6">
          <button
            on:click={finishReading}
            class="px-8 py-4 rounded-lg font-semibold transition-all duration-200"
            style="background-color: #BFCAF3; color: #111111;"
            on:mouseenter={handleFinishButtonHover}
            on:mouseleave={handleFinishButtonLeave}
          >
            🏆 Finish Reading & Get Rank
          </button>
        </div>
      {/if}
    </div>
  </div>

  <!-- Navigation dots and page info -->
  <div class="flex justify-center items-center gap-4 p-4" style="background-color: #111111; border-top: 1px solid #333333;">
    <!-- Page info -->
    <div class="text-sm" style="color: #888888;">
      Page {currentPage + 1} of {totalPages}
    </div>
    
    <!-- Navigation dots -->
    <div class="flex justify-center items-center gap-2">
      {#each Array(totalPages) as _, i}
        <button
          class="w-2 h-2 rounded-full transition-all duration-200"
          style="background-color: {currentPage === i ? '#BFCAF3' : '#333333'};"
          on:click={() => setPage(i)}
          title="Go to page {i + 1}"
        />
      {/each}
    </div>

    <!-- Keyboard shortcuts hint -->
    <div class="text-xs" style="color: #666666;">
      Use ← → or h l to navigate
    </div>
  </div>
</div> 