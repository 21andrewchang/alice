<script lang="ts">
  import { onboardingComplete } from '$lib/onboarding';

  function finish() {
    onboardingComplete.set(true);
  }
</script>

<div class="fixed inset-0 bg-black/80 flex items-center justify-center z-50 text-white p-4">
  <div class="max-w-md space-y-4">
    <h2 class="text-2xl font-bold">Welcome to Alice! 🎉</h2>
    <p>
      Tell us what you&apos;re interested in so we can curate your first lesson and get you leveling up in
      robotics and machine learning.
    </p>
    <!-- TODO: Replace inputs with full onboarding flow UI -->
    <div class="space-y-2">
      <label class="block">
        <span class="opacity-75">What&apos;s your primary goal?</span>
        <input class="mt-1 w-full rounded bg-gray-800 px-3 py-2" placeholder="e.g. Build a self-driving car" />
      </label>
      <button class="w-full py-2 bg-indigo-500 hover:bg-indigo-600 rounded" on:click={finish}>
        Continue
      </button>
    </div>
  </div>
</div>

<style>
  /* Simple fade-in */
  :global(body) {
    overflow: hidden;
  }
</style>
