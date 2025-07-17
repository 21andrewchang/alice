<!-- PaginatedContent.svelte -->
<script lang="ts">
  import { currentPageStore } from '$lib/stores';
  import { onMount, onDestroy, afterUpdate } from 'svelte';
  import { nodeStatusService } from '$lib/nodeStatus';
  import { writable } from 'svelte/store';

  export let node: any;
  export let parseNodeLinks: (content: string) => string;
  export let onClose: () => void;
  export let nodesVisited: number = 0;
  export let onFinishReading: (nodesVisited: number) => void = () => {};
  
  // Create a reactive store to track node status changes
  const nodeStatusVersion = writable(0);
  
  // Function to force re-render of content when node status changes
  function updateContentWithLatestNodeStatus() {
    nodeStatusVersion.update(v => v + 1);
  }

  // Add getDomainColor utility (copy from app page)
  function getDomainColor(domain: string) {
    const domainColors = {
      'math': '#5B8DF2',
      'tech': '#73DACA',
      'sciences': '#BA6FFF',
      'humanities': '#F88951',
      'art': '#F7768E',
      'research-papers': '#BFCAF3'
    };
    return domainColors[domain as keyof typeof domainColors] || '#3A5A8F';
  }

  // Dynamically build pages based on available content sections
  let pages: Array<{ title: string; content: string | null; type: 'section' | 'quiz' } > = [];

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
        pages.push({ title: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()), content: node.content[key], type: 'section' });
      }
    }
  }

  console.log(node);
  // Add quiz page if quiz exists
  if (node.quiz && Array.isArray(node.quiz) && node.quiz.length > 0) {
    pages.push({ title: 'Checkpoint Quiz', content: null, type: 'quiz' });
  }

  const totalPages = pages.length;

  // Subscribe to the current page store for this node
  let currentPage: number;
  currentPageStore.subscribe(pagesStore => {
    currentPage = pagesStore[node.id] || 0;
  });

  function setPage(pageNum: number) {
    if (pageNum >= 0 && pageNum < totalPages) {
      currentPageStore.update(pagesStore => ({
        ...pagesStore,
        [node.id]: pageNum
      }));
    }
  }

  function nextPage() { setPage(currentPage + 1); }
  function prevPage() { setPage(currentPage - 1); }

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
      case 'ArrowLeft': case 'h': case 'H': event.preventDefault(); prevPage(); break;
      case 'ArrowRight': case 'l': case 'L': event.preventDefault(); nextPage(); break;
      case 'Home': case 'g': case 'G': event.preventDefault(); setPage(0); break;
      case 'End': event.preventDefault(); setPage(totalPages - 1); break;
    }
  }

  function finishReading() {
    const learnedNodesCount = nodeStatusService.getAllStatuses().size;
    const adjustedCount = Math.max(0, learnedNodesCount - 1);
    onFinishReading(adjustedCount);
  }

  // Quiz state
  let quizAnswers: number[] = [];
  let quizSubmitted = false;
  let quizScore = 0;
  function handleQuizSelect(qIdx: number, optIdx: number) {
    if (quizSubmitted) return;
    quizAnswers[qIdx] = optIdx;
  }
  function handleQuizSubmit() {
    quizSubmitted = true;
    quizScore = node.quiz.reduce((score: number, q: any, i: number) => (quizAnswers[i] === q.answerIndex ? score + 1 : score), 0);
    
    // Update node status based on quiz result
    const scorePercentage = (quizScore / node.quiz.length) * 100;
    nodeStatusService.updateFromQuizResult(node.id, scorePercentage);
    
    // Trigger visual updates by dispatching a custom event
    window.dispatchEvent(new CustomEvent('nodeStatusUpdated', { 
      detail: { nodeId: node.id, score: scorePercentage } 
    }));
  }

  onMount(() => {
    document.addEventListener('keydown', handleKeydown);
    
    // Add listener for node status updates
    const handleNodeStatusUpdate = () => {
      // Force re-render of content with updated node statuses
      updateContentWithLatestNodeStatus();
    };
    
    // Listen for custom node status update events
    window.addEventListener('nodeStatusUpdated', handleNodeStatusUpdate);
    
    // Also listen for focus/blur events to catch when user returns to the page
    window.addEventListener('focus', handleNodeStatusUpdate);
    
    quizAnswers = node.quiz ? Array(node.quiz.length).fill(-1) : [];
    quizSubmitted = false;
    quizScore = 0;
    
    // Initial update to ensure content reflects current status
    updateContentWithLatestNodeStatus();
  });
  
  onDestroy(() => {
    document.removeEventListener('keydown', handleKeydown);
    window.removeEventListener('nodeStatusUpdated', handleNodeStatusUpdate);
    window.removeEventListener('focus', handleNodeStatusUpdate);
  });
</script>

<style>
:global(.onboarding-content), :global(.onboarding-content *) {
  color: #fff !important;
}
</style>

<div class="h-full flex flex-col" style="background-color: #111111;">
  <!-- Header -->
  <div class="flex items-center justify-between p-6">
    <h2 class="text-2xl font-bold" style="color: {node.type === 'paper' ? '#BFCAF3' : getDomainColor(node.domain || 'tech')};">{node.label}</h2>
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
      {#if node.content?.original_paper_url}
        <div class="mb-6 p-4 rounded-lg" style="background-color: #1a1a1a; border: 1px solid #333333;">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-full flex items-center justify-center" style="background-color: #BFCAF3; color: #111111;">
              📄
            </div>
            <div>
              <div class="font-medium" style="color: #BFCAF3;">Original Paper</div>
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
          <h3 class="text-lg font-semibold mb-3" style="color: #BFCAF3;">{pages[currentPage].title}</h3>
          <div class="leading-relaxed whitespace-pre-line" style="color: #B3B3B3;">
            {#key $nodeStatusVersion}
              {@html parseNodeLinks(pages[currentPage].content || '')}
            {/key}
          </div>
        </div>
        {#if currentPage === totalPages - 1 && !node.quiz}
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
      {:else if pages[currentPage].type === 'quiz'}
        <div class="mb-6">
          <h3 class="text-lg font-semibold mb-3" style="color: #BFCAF3;">Checkpoint Quiz</h3>
          {#each node.quiz as q, i}
            <div class="mb-4">
              <div class="font-medium mb-2">{i + 1}. {q.question}</div>
              <div class="flex flex-col gap-2">
                {#each q.options as opt, j}
                  <label class="flex items-center gap-2">
                    <input
                      type="radio"
                      name={`quiz-q${i}`}
                      value={j}
                      checked={quizAnswers[i] === j}
                      disabled={quizSubmitted}
                      on:change={() => handleQuizSelect(i, j)}
                    />
                    <span>{opt}</span>
                  </label>
                {/each}
              </div>
              {#if quizSubmitted}
                <div class="mt-1 text-sm" style="color: {quizAnswers[i] === q.answerIndex ? '#73DACA' : '#F7768E'};">
                  {quizAnswers[i] === q.answerIndex ? 'Correct!' : 'Incorrect.'}
                </div>
              {/if}
            </div>
          {/each}
          {#if !quizSubmitted}
            <button
              class="mt-4 px-6 py-2 rounded-lg font-semibold transition-all duration-200"
              style="background-color: #BFCAF3; color: #111111;"
              on:click={handleQuizSubmit}
              disabled={quizAnswers.some(a => a === -1)}
            >
              Submit Quiz
            </button>
          {:else}
            <div class="mt-4 text-center">
              <div class="font-semibold" style="color: #BFCAF3;">
                You scored {quizScore} / {node.quiz.length}
              </div>
              
              <!-- Show mastery status -->
              {#if (quizScore / node.quiz.length) * 100 >= 80}
                <div class="mt-2 text-sm" style="color: #73DACA;">
                  🎉 Congratulations! You've mastered this node.
                </div>
              {:else}
                <div class="mt-2 text-sm" style="color: #F7768E;">
                  You need 80% to master this node. Try again later!
                </div>
              {/if}
            </div>
          {/if}
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
          title={`Go to page ${i + 1}`}
          aria-label={`Go to page ${i + 1}`}
        ></button>
      {/each}
    </div>
    <!-- Keyboard shortcuts hint -->
    <div class="text-xs" style="color: #666666;">
      Use ← → or h l to navigate
    </div>
  </div>
</div> 