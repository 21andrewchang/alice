<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import { elasticOut } from 'svelte/easing';
  export let nodesVisited: number = 0;
// New: externally-calculated rank can be passed in
export let calculatedRank: { tier: string; division: number | null } | null = null;
  export let show: boolean = false;
  export let onClose: () => void = () => {};

  const dispatch = createEventDispatcher();

  // Rank styling configuration
  const rankStyles: Record<string, {
    background: string;
    textColor: string;
    border: string;
    glow: string;
  }> = {
    'Iron': {
      background: 'linear-gradient(135deg, #232323 0%, #434343 60%, #5a4a3c 100%)',
      textColor: '#E0E0E0',
      border: '2px solid #434343',
      glow: '0 0 8px 1px #232323, 0 0 4px 0.5px #5a4a3c'
    },
    'Bronze': {
      background: 'linear-gradient(135deg, #7c4a03 0%, #b87333 60%, #e1a869 100%)',
      textColor: '#FFF8F0',
      border: '2px solid #b87333',
      glow: '0 0 10px 2px #b87333, 0 0 4px 1px #e1a869'
    },
    'Silver': {
      background: 'linear-gradient(135deg, #8a8d91 0%, #bfc1c6 60%, #e0e2e6 100%)',
      textColor: '#232323',
      border: '2px solid #8a8d91',
      glow: '0 0 8px 1px #bfc1c6, 0 0 2px 0.5px #8a8d91'
    },
    'Gold': {
      background: 'linear-gradient(135deg, #cfa700 0%, #ffe066 60%, #fff6b0 100%)',
      textColor: '#4a3a00',
      border: '2px solid #cfa700',
      glow: '0 0 12px 2px #ffe066, 0 0 6px 1px #cfa700'
    },
    'Platinum': {
      background: 'linear-gradient(135deg, #1de9b6 0%, #00bcd4 50%, #43e8d8 100%)',
      textColor: '#eafffa',
      border: '2px solid #00bcd4',
      glow: '0 0 14px 2px #43e8d8, 0 0 6px 1px #1de9b6'
    },
    'Diamond': {
      background: 'linear-gradient(135deg, #4fc3f7 0%, #7c4dff 40%, #b388ff 80%, #e3f2fd 100%)',
      textColor: '#eafffa',
      border: '2px solid #4fc3f7',
      glow: '0 0 16px 3px #7c4dff, 0 0 8px 2px #4fc3f7'
    },
    'Master': {
      background: 'linear-gradient(135deg, #a259e6 0%, #d500f9 60%, #f06292 100%)',
      textColor: '#fff0fa',
      border: '2px solid #a259e6',
      glow: '0 0 14px 2px #d500f9, 0 0 6px 1px #a259e6'
    },
    'Grandmaster': {
      background: 'linear-gradient(135deg, #ff3d00 0%, #ff7043 60%, #ffd180 100%)',
      textColor: '#fff0ea',
      border: '2px solid #ff3d00',
      glow: '0 0 14px 2px #ff7043, 0 0 6px 1px #ff3d00'
    },
    'Challenger': {
      background: 'linear-gradient(135deg, #ffffff 0%, #f8f8ff 25%, #f3eaff 50%, #eaf6ff 75%, #fff0fa 100%)',
      textColor: '#2C2C2C',
      border: '2px solid #ffffff',
      glow: '0 0 20px 4px #fff, 0 0 10px 2px #f3eaff, 0 0 8px 2px #fff0fa, 0 0 6px 1px #eaf6ff'
    }
  };

  // All possible ranks with divisions
  const allRanks = [
    { tier: 'Iron', division: 4 }, { tier: 'Iron', division: 3 }, { tier: 'Iron', division: 2 }, { tier: 'Iron', division: 1 },
    { tier: 'Bronze', division: 4 }, { tier: 'Bronze', division: 3 }, { tier: 'Bronze', division: 2 }, { tier: 'Bronze', division: 1 },
    { tier: 'Silver', division: 4 }, { tier: 'Silver', division: 3 }, { tier: 'Silver', division: 2 }, { tier: 'Silver', division: 1 },
    { tier: 'Gold', division: 4 }, { tier: 'Gold', division: 3 }, { tier: 'Gold', division: 2 }, { tier: 'Gold', division: 1 },
    { tier: 'Platinum', division: 4 }, { tier: 'Platinum', division: 3 }, { tier: 'Platinum', division: 2 }, { tier: 'Platinum', division: 1 },
    { tier: 'Diamond', division: 4 }, { tier: 'Diamond', division: 3 }, { tier: 'Diamond', division: 2 }, { tier: 'Diamond', division: 1 },
    { tier: 'Master', division: null }, { tier: 'Grandmaster', division: null }, { tier: 'Challenger', division: null }
  ];

  let userRank: { tier: string; division: number | null } = { tier: 'Bronze', division: 4 };
  let showRank = false; // controls showing of rank badge

// If parent provides a calculatedRank, use it; otherwise derive from nodesVisited
$: {
  if (calculatedRank) {
    userRank = calculatedRank;
  } else {
    calculateRank();
  }
}

  function calculateRank() {
    let tier = 'Iron';
    let division = 4;
    if (nodesVisited === 0) {
      tier = 'Master';
    } else if (nodesVisited <= 2) {
      tier = 'Diamond';
    } else if (nodesVisited <= 5) {
      tier = 'Platinum';
    } else if (nodesVisited <= 8) {
      tier = 'Gold';
    } else if (nodesVisited <= 11) {
      tier = 'Silver';
    } else if (nodesVisited <= 14) {
      tier = 'Bronze';
    } else {
      tier = 'Iron';
    }
    userRank.tier = tier;
    userRank.division = ['Master','Grandmaster','Challenger'].includes(tier) ? null : 4;
  }

  function getRankGlow(tier: string, division: number | null): string {
    const apexTiers = ['Master', 'Grandmaster', 'Challenger'];
    if (tier === 'Challenger') {
      return rankStyles[tier].glow
        .replace(/(\d+\.?\d*)px/g, (m) => (parseFloat(m) * 0.5) + 'px')
        .replace(/rgba\(([^,]+,){3}([^)]+)\)/g, (m, p1, alpha) => m.replace(alpha, (parseFloat(alpha) * 0.4).toString()));
    }
    if (apexTiers.includes(tier)) return rankStyles[tier].glow;
    if (tier === 'Diamond') {
      return rankStyles[tier].glow;
    }
    if (tier === 'Platinum') {
      return rankStyles[tier].glow
        .replace(/(\d+\.?\d*)px/g, (m) => (parseFloat(m) * 0.4) + 'px')
        .replace(/rgba\(([^,]+,){3}([^)]+)\)/g, (m, p1, alpha) => m.replace(alpha, (parseFloat(alpha) * 0.3).toString()));
    }
    return '';
  }

  // When component mounts or when `show` prop toggles true, start reveal timer
$: if (show) {
  showRank = false;
  // delay rank reveal until after blur + title fade (0.4s overlay + slight buffer)
  setTimeout(() => showRank = true, 300);
}

onMount(() => {
  // ensure first open works
  if (show) {
    setTimeout(() => showRank = true, 0);
  }
});

  function handleClose() {
     showRank = false;
     onClose();
     dispatch('close');
   }
</script>

{#if show}
  <div class="modal-overlay">
    <div class="modal-content">
      <div class="placement-title title-fade">Placements Complete!</div>
        {#if showRank}
                <div class="rank-badge rank-reveal text-6xl font-bold px-16 py-10 rounded-2xl inline-block transition-transform hover:scale-110"
            style="
              background: {rankStyles[userRank.tier].background};
              color: {rankStyles[userRank.tier].textColor};
              box-shadow: {getRankGlow(userRank.tier, userRank.division)};
            "
          >
            {userRank.tier}{['Master','Grandmaster','Challenger'].includes(userRank.tier) ? '' : ` ${userRank.division}`}
          </div>
        {/if}
      <button
          on:click={handleClose}
          class="back-button px-8 py-3 bg-gray-600 hover:bg-gray-700 text-white font-semibold rounded-lg transition-colors duration-200"
        >
          Back to Nexus
        </button>
      <slot />
    </div>
  </div>
{/if}

<style>
  .modal-overlay {
    position: fixed;
    inset: 0;
    z-index: 100;
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: all;
    /* Animated dim/blur */
    background: rgba(0,0,0,0.0);
    animation: modal-dim-in 0.4s forwards;
    backdrop-filter: blur(0px);
    transition: background 0.4s, backdrop-filter 0.4s;
  }
  .modal-content {
    z-index: 101;
    background: none;
    border: none;
    box-shadow: none;
    padding: 0;
    border-radius: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }
  .placement-title{
    position: fixed;
    top: 7vh;
    left:0;
    right:0;
    text-align:center;
    font-size: 2.5rem;
    font-weight:700;
    color:#cccccc;
  }
  .back-button{
    position: fixed;
    bottom: 7vh;
    left:50%;
    transform: translateX(-50%);
  }
  .title-fade {
    opacity: 0;
    animation: title-fade-in 0.4s ease-out forwards;
  }
  .rank-reveal {
    opacity: 0;
    transform: scale(0.8);
    animation: rank-pop-in 0.35s 0.0s ease-out forwards; /* will begin once element rendered */
  }

  @keyframes title-fade-in {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes rank-pop-in {
    0% { opacity: 0; transform: scale(0.8) translateY(10px); }
    60% { opacity: 1; transform: scale(1.05) translateY(0); }
    100% { opacity: 1; transform: scale(1) translateY(0); }
  }

  @keyframes modal-dim-in {
    from {
      background: rgba(0,0,0,0.0);
      backdrop-filter: blur(0px);
    }
    to {
      background: rgba(0,0,0,0.65);
      backdrop-filter: blur(8px);
    }
  }
</style> 