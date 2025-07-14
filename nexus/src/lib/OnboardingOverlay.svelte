<script lang="ts">
  import { onboardingComplete } from '$lib/onboarding';
  import OnboardingSlideshow from '$lib/OnboardingSlideshow.svelte';
  import { onDestroy } from 'svelte';
  let show = true;
  const unsub = onboardingComplete.subscribe(val => {
    show = !val;
  });
  onDestroy(() => {
    unsub();
    document.body.style.overflow = '';
  });
  $: {
    if (show === true) {
      document.body.style.overflow = 'hidden';
    } else if (show === false) {
      document.body.style.overflow = '';
    }
  }
</script>

{#if show}
  <div class="fixed inset-0 flex items-center justify-center z-50 text-white p-4 onboarding-bg">
    <div class="max-w-2xl w-full space-y-6 onboarding-panel">
      <OnboardingSlideshow />
    </div>
  </div>
{/if}

<style>
  .onboarding-bg {
    background: var(--bg-primary, #111111);
    backdrop-filter: blur(16px);
    background-color: rgba(17, 17, 17, 0.85); /* Increased opacity for less see-through */
    z-index: 1000 !important; /* Strongly above all app content */
  }
  .onboarding-panel {
    color: #fff !important;
  }
  .onboarding-panel h2, .onboarding-panel h3 {
    color: #fff !important;
  }
  .onboarding-panel label, .onboarding-panel p, .onboarding-panel span, .onboarding-panel div {
    color: #E0E0E0 !important;
  }
  .onboarding-panel .opacity-80, .onboarding-panel .opacity-75 {
    color: #E0E0E0 !important;
    opacity: 1 !important;
  }
  .onboarding-panel .opacity-60 {
    color: #B3B3B3 !important;
    opacity: 1 !important;
  }
  .onboarding-panel input {
    background: #111111;
    color: #fff;
    border: 1px solid var(--border-color, #333333);
  }
  .onboarding-panel input::placeholder {
    color: #B3B3B3;
    opacity: 1;
  }
  .onboarding-panel input:focus {
    border-color: var(--topic-research-papers, #BFCAF3);
    outline: none;
  }
  .onboarding-panel button {
    background: #22242C !important;
    color: #fff !important;
    border-radius: 0.5rem;
    font-weight: 700;
    transition: background 0.2s, color 0.2s;
  }
  .onboarding-panel button:hover:not(:disabled) {
    background: #35374A !important;
    filter: none;
  }
  .onboarding-panel button:disabled {
    background: #B3B3B3 !important;
    color: #222 !important;
    opacity: 1 !important;
  }
  .onboarding-panel .bg-gray-800, .onboarding-panel .bg-gray-700 {
    background: #111111 !important;
  }
  .onboarding-panel .border-gray-700 {
    border-color: var(--border-color, #333333) !important;
  }
  .onboarding-panel .text-indigo-400 {
    color: var(--topic-research-papers, #BFCAF3) !important;
  }
  .onboarding-panel .bg-indigo-500 {
    background: var(--topic-research-papers, #BFCAF3) !important;
  }
  .onboarding-panel .hover\:bg-indigo-600:hover {
    background: var(--topic-research-papers, #BFCAF3) !important;
    filter: brightness(1.1);
  }
  .onboarding-panel .rounded-lg {
    border-radius: 0.5rem !important;
  }
  .onboarding-panel .font-bold {
    font-weight: bold;
  }
  .onboarding-panel .font-semibold {
    font-weight: 600;
  }
  .onboarding-panel .transition {
    transition: background 0.2s, color 0.2s;
  }
  .onboarding-panel .disabled\:opacity-50:disabled {
    opacity: 0.5;
  }
</style>
