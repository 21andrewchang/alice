<script lang="ts">
  import { goto } from '$app/navigation';
</script>

<!-- Simple landing page hero section -->
<section class="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-gray-900 to-black text-white px-4">
  <h1 class="text-4xl md:text-6xl font-bold mb-6 text-center">Alice — Level-up your ML & Robotics skills</h1>
  <p class="text-lg mb-8 max-w-2xl text-center opacity-80">
    Learn from curated research papers and bite-size lessons. No planning, just play.
  </p>
  <button
    class="px-8 py-3 bg-indigo-500 hover:bg-indigo-600 focus:ring-2 focus:ring-indigo-400 rounded-lg text-lg font-semibold transition"
    on:click={() => goto('/app')}
  >
    Start learning
  </button>
</section>
