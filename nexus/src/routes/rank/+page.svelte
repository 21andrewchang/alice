<!-- Ranking Page -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { scale } from 'svelte/transition';
  import { elasticOut } from 'svelte/easing';

  let paperId: number;
  let paperTitle: string;
  let readingTime: number;
  let checkpointScore: number;
  let activeTime: number;

  let userRank = {
    tier: 'Bronze',
    division: 4,
    lp: 0,
    mmr: 1200,
    volatility: 0.8
  };

  let showRank = false;

  function calculateRank() {
    let baseMMR = 1200;
    const expectedTime = 1800;
    const timeRatio = expectedTime / readingTime;
    const timeBonus = Math.max(0, (timeRatio - 1) * 50);
    const scoreBonus = (checkpointScore - 70) * 2;
    const engagementRatio = activeTime / readingTime;
    const engagementBonus = Math.max(0, (engagementRatio - 0.8) * 100);
    userRank.mmr = Math.round(baseMMR + timeBonus + scoreBonus + engagementBonus);
    if (userRank.mmr >= 2000) {
      userRank.tier = 'Challenger';
      userRank.division = 1;
    } else if (userRank.mmr >= 1800) {
      userRank.tier = 'Diamond';
      userRank.division = Math.max(1, 4 - Math.floor((userRank.mmr - 1800) / 50));
    } else if (userRank.mmr >= 1600) {
      userRank.tier = 'Platinum';
      userRank.division = Math.max(1, 4 - Math.floor((userRank.mmr - 1600) / 50));
    } else if (userRank.mmr >= 1400) {
      userRank.tier = 'Gold';
      userRank.division = Math.max(1, 4 - Math.floor((userRank.mmr - 1400) / 50));
    } else if (userRank.mmr >= 1200) {
      userRank.tier = 'Silver';
      userRank.division = Math.max(1, 4 - Math.floor((userRank.mmr - 1200) / 50));
    } else {
      userRank.tier = 'Bronze';
      userRank.division = Math.max(1, 4 - Math.floor((userRank.mmr - 1000) / 50));
    }
    userRank.lp = Math.min(100, Math.max(0, (userRank.mmr - 1200) / 8));
  }

  onMount(() => {
    const urlParams = new URLSearchParams(window.location.search);
    paperId = parseInt(urlParams.get('paperId') || '0');
    paperTitle = urlParams.get('paperTitle') || 'Attention Is All You Need';
    readingTime = parseInt(urlParams.get('readingTime') || '1800');
    checkpointScore = parseInt(urlParams.get('checkpointScore') || '85');
    activeTime = parseInt(urlParams.get('activeTime') || '1600');
    calculateRank();
    setTimeout(() => showRank = true, 500);
  });

  function createAccount() {
    // Placeholder: navigate to signup page
    window.location.href = '/signup';
  }
</script>

<div class="min-h-screen flex flex-col items-center justify-center" style="background: linear-gradient(135deg, #0A0A0A 0%, #1a1a1a 100%);">
  {#if showRank}
    <div class="text-center mb-12" in:scale={{ duration: 1000, easing: elasticOut }}>
      <div class="text-3xl font-bold mb-6" style="color: #BFCAF3;">Placements Complete!</div>
      <div class="inline-block p-10 rounded-2xl mb-6" style="background: linear-gradient(135deg, #BFCAF3 0%, #8A9BB8 100%);">
        <div class="text-7xl font-bold" style="color: #111111;">{userRank.tier} {userRank.division}</div>
      </div>
    </div>
    <div class="flex flex-col sm:flex-row gap-4 justify-center">
      <button
        on:click={createAccount}
        class="px-10 py-5 rounded-lg font-semibold transition-all duration-200 text-xl"
        style="background-color: #BFCAF3; color: #111111;"
        on:mouseenter={(e) => (e.target as HTMLButtonElement).style.backgroundColor = '#8A9BB8'}
        on:mouseleave={(e) => (e.target as HTMLButtonElement).style.backgroundColor = '#BFCAF3'}
      >
        Create Account
      </button>
      <button
        on:click={() => window.location.href = '/'}
        class="px-10 py-5 rounded-lg font-semibold transition-all duration-200 text-xl border border-[#BFCAF3]"
        style="background-color: transparent; color: #BFCAF3;"
        on:mouseenter={(e) => { (e.target as HTMLButtonElement).style.backgroundColor = '#BFCAF3'; (e.target as HTMLButtonElement).style.color = '#111111'; }}
        on:mouseleave={(e) => { (e.target as HTMLButtonElement).style.backgroundColor = 'transparent'; (e.target as HTMLButtonElement).style.color = '#BFCAF3'; }}
      >
        Back to Nexus
      </button>
    </div>
  {/if}
</div> 