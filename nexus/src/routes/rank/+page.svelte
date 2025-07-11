<!-- Ranking Page -->
<script lang="ts">
	import { onMount } from 'svelte';
	import { scale } from 'svelte/transition';
	import { elasticOut } from 'svelte/easing';
	import { goto } from '$app/navigation';

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

	let userRank = {
		tier: 'Bronze',
		division: 4,
		mmr: 1000,
		lp: 0
	};

	let showRank = false;

	function calculateRank() {
		// Simulate performance metrics
		const baseMMR = 1000;
		const timeBonus = Math.random() * 200; // 0-200 bonus for speed
		const scoreBonus = Math.random() * 300; // 0-300 bonus for accuracy
		const engagementBonus = Math.random() * 100; // 0-100 bonus for engagement

		userRank.mmr = Math.round(baseMMR + timeBonus + scoreBonus + engagementBonus);

		// Determine tier and division based on MMR
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

		// Calculate LP (League Points)
		userRank.lp = Math.min(100, Math.max(0, (userRank.mmr - 1200) / 8));
	}

	function createAccount() {
		// TODO: Implement account creation
		console.log('Create account clicked');
	}

	function backToNexus() {
		goto('/');
	}

	function getRankGlow(tier: string, division: number | null): string {
		const apexTiers = ['Master', 'Grandmaster', 'Challenger'];
		if (tier === 'Challenger') {
			// Reduce Challenger glow intensity
			return rankStyles[tier].glow
				.replace(/(\d+\.?\d*)px/g, (m) => (parseFloat(m) * 0.5) + 'px')
				.replace(/rgba\(([^,]+,){3}([^)]+)\)/g, (m, p1, alpha) => m.replace(alpha, (parseFloat(alpha) * 0.4).toString()));
		}
		if (apexTiers.includes(tier)) return rankStyles[tier].glow;
		if (tier === 'Diamond') {
			return rankStyles[tier].glow;
		}
		if (tier === 'Platinum') {
			// Always dull glow for Platinum
			return rankStyles[tier].glow
				.replace(/(\d+\.?\d*)px/g, (m) => (parseFloat(m) * 0.4) + 'px')
				.replace(/rgba\(([^,]+,){3}([^)]+)\)/g, (m, p1, alpha) => m.replace(alpha, (parseFloat(alpha) * 0.3).toString()));
		}
		return '';
	}

	onMount(() => {
		calculateRank();
		setTimeout(() => showRank = true, 500);
	});
</script>

<div class="min-h-screen flex flex-col items-center justify-center" style="background: linear-gradient(135deg, #0A0A0A 0%, #1a1a1a 100%);">
	<!-- Display all possible ranks for reference -->
	<div class="flex flex-col items-center mb-8">
		<div class="text-2xl font-semibold mb-4" style="color: #CCCCCC;">All Ranks</div>
		<div class="grid grid-cols-4 gap-4 max-w-4xl">
			{#each allRanks as rank}
				<div 
					class="px-4 py-2 rounded-lg font-semibold text-center transition-all duration-300 hover:scale-105"
					style="
						background: {rankStyles[rank.tier].background};
						color: {rankStyles[rank.tier].textColor};
						border: {rankStyles[rank.tier].border};
						box-shadow: {getRankGlow(rank.tier, rank.division)};
					"
				>
					{rank.tier} {rank.division || ''}
				</div>
			{/each}
		</div>
	</div>

	{#if showRank}
		<div class="text-center mb-12" in:scale={{ duration: 1000, easing: elasticOut }}>
			<div class="text-4xl font-bold mb-4" style="color: #CCCCCC;">Placements Complete!</div>
			<div 
				class="text-8xl font-extrabold px-16 py-10 rounded-2xl inline-block transition-all duration-300 hover:scale-110"
				style="
					background: {rankStyles[userRank.tier].background};
					color: {rankStyles[userRank.tier].textColor};
					border: {rankStyles[userRank.tier].border};
					box-shadow: {getRankGlow(userRank.tier, userRank.division)};
				"
			>
				{userRank.tier} {userRank.division}
			</div>
		</div>

		<div class="flex gap-4">
			<button
				onclick={createAccount}
				class="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors duration-200"
			>
				Create Account
			</button>
			<button
				onclick={backToNexus}
				class="px-8 py-3 bg-gray-600 hover:bg-gray-700 text-white font-semibold rounded-lg transition-colors duration-200"
			>
				Back to Nexus
			</button>
		</div>
	{/if}
</div> 