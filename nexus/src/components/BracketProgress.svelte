<script lang="ts">
	import { fly } from 'svelte/transition';
	export let mastery: number = 0; // 0..5 earned toward next bracket
	export let total: number = 5; // keep as 5 (number of steps to earn)
	export let userBracket: string | undefined;

	// Label map
	const map: Record<string, string> = {
		beginner: 'M1',
		intermediate: 'M2',
		advanced: 'M3'
	};

	// Bracket rules + colors
	const bracketRules: Record<string, { level: number; count: number; next: string | null }> = {
		beginner: { level: 1, count: 5, next: 'intermediate' },
		intermediate: { level: 2, count: 5, next: 'advanced' },
		advanced: { level: 3, count: 5, next: 'expert' },
		expert: { level: 0, count: 0, next: null }
	};

	const bracketColors: Record<string, string> = {
		beginner: '#9CA3AF',
		intermediate: '#E0AF67',
		advanced: '#BA9AF7',
		expert: '#F7768E'
	};

	function hexToRgba(hex: string, alpha = 1) {
		const h = hex.replace('#', '');
		const r = parseInt(h.slice(0, 2), 16);
		const g = parseInt(h.slice(2, 4), 16);
		const b = parseInt(h.slice(4, 6), 16);
		return `rgba(${r}, ${g}, ${b}, ${alpha})`;
	}

	// Derived bits
	$: key = (userBracket || '').toLowerCase();
	$: resolvedLabel = map[key] ?? 'M1';
	$: currentColor = bracketColors[key] ?? '#CCCCCC';
	$: nextBracket = bracketRules[key]?.next;
	$: nextColor = nextBracket ? (bracketColors[nextBracket] ?? '#CCCCCC') : currentColor;

	// 6 dots total: 1 "current" + 5 progress
	$: TOTAL_DOTS = total + 1; // 6
	$: pct = Math.min(100, Math.max(0, (mastery / total) * 100)); // bar fill based on 0..5
	$: steps = Array.from({ length: TOTAL_DOTS }, (_, i) => i); // 0..5
</script>

<div class="flex w-full items-center gap-3">
	<!-- Left label, colored by current bracket -->
	<div class="shrink-0 text-xs font-semibold" style="color: {currentColor}">
		{resolvedLabel}
	</div>

	<div class="relative flex-1">
		<!-- Track -->
		<div class="h-2 rounded-full bg-neutral-800"></div>

		<!-- Fill (based on earned progress 0..5) -->
		<div class="absolute inset-y-0 left-0 rounded-full bg-neutral-200" style="width: {pct}%"></div>

		<!-- Dots overlay -->
		<div class="absolute inset-0 flex items-center justify-between">
			{#each steps as i}
				{#if i === 0}
					<!-- Starting dot: current bracket color -->
					<div class="grid place-items-center">
						<div
							class="h-3 w-3 rounded-full"
							style="background-color:{currentColor}; box-shadow: 0 0 4px {hexToRgba(
								currentColor,
								0.6
							)};"
							title="Current bracket"
						></div>
					</div>
				{:else if i === total}
					<div class="grid place-items-center">
						<div
							class="h-3 w-3 rounded-full"
							style="
                background-color: {mastery >= total ? nextColor : hexToRgba(nextColor, 0.9)};
                border: 2px solid {hexToRgba(nextColor, 0.6)};
                box-shadow: 0 0 6px {hexToRgba(nextColor, 0.7)};
              "
							title={nextBracket ? `Next: ${nextBracket}` : 'Max bracket'}
						></div>
					</div>
				{:else}
					<!-- Middle 4 dots: earned progress -->
					<div class="grid place-items-center">
						<div
							class="h-3 w-3 rounded-full"
							class:bg-white={i <= mastery}
							class:bg-neutral-600={i > mastery}
						></div>
					</div>
				{/if}
			{/each}
		</div>
	</div>
</div>
