<svelte:options accessors={true} />

<script lang="ts">
	import { onboardingComplete } from '$lib/onboarding';
	import OnboardingSlideshow from '$lib/OnboardingSlideshow.svelte';
	import { onDestroy } from 'svelte';
	export let onSetRecommendation;
	let show = false;
	// const unsub = onboardingComplete.subscribe((val) => {
	// 	show = !val;
	// });
	onDestroy(() => {
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
	<div class="onboarding-bg fixed inset-0 z-50 flex items-center justify-center p-4 text-white">
		<div class="onboarding-panel w-full max-w-2xl space-y-6">
			<OnboardingSlideshow {onSetRecommendation} />
		</div>
	</div>
{/if}

<style>
	.onboarding-bg {
		background: var(--bg-primary, #111111);
		backdrop-filter: blur(16px);
		background-color: rgba(0, 0, 0, 0.5); /* Increased opacity for less see-through */
		z-index: 1000 !important; /* Strongly above all app content */
	}
	.onboarding-panel {
		color: #fff !important;
	}
	.onboarding-panel h2,
	.onboarding-panel h3 {
		color: #fff !important;
	}
	.onboarding-panel label,
	.onboarding-panel p,
	.onboarding-panel span,
	.onboarding-panel div {
		color: #e0e0e0 !important;
	}
	.onboarding-panel .opacity-80,
	.onboarding-panel .opacity-75 {
		color: #e0e0e0 !important;
		opacity: 1 !important;
	}
	.onboarding-panel .opacity-60 {
		color: #b3b3b3 !important;
		opacity: 1 !important;
	}
	.onboarding-panel input {
		background: #111111;
		color: #fff;
		border: 1px solid var(--border-color, #333333);
	}
	.onboarding-panel input::placeholder {
		color: #b3b3b3;
		opacity: 1;
	}
	.onboarding-panel input:focus {
		border-color: var(--topic-research-papers, #bfcaf3);
		outline: none;
	}
	.onboarding-panel button {
		background: #22242c !important;
		color: #fff !important;
		border-radius: 0.5rem;
		font-weight: 700;
		transition:
			background 0.2s,
			color 0.2s;
	}
	.onboarding-panel button:hover:not(:disabled) {
		background: #35374a !important;
		filter: none;
	}
	.onboarding-panel button:disabled {
		background: #b3b3b3 !important;
		color: #222 !important;
		opacity: 1 !important;
	}
	.onboarding-panel .bg-gray-800,
	.onboarding-panel .bg-gray-700 {
		background: #111111 !important;
	}
	.onboarding-panel .border-gray-700 {
		border-color: var(--border-color, #333333) !important;
	}
	.onboarding-panel .text-indigo-400 {
		color: var(--topic-research-papers, #bfcaf3) !important;
	}
	.onboarding-panel .bg-indigo-500 {
		background: var(--topic-research-papers, #bfcaf3) !important;
	}
	.onboarding-panel .hover\:bg-indigo-600:hover {
		background: var(--topic-research-papers, #bfcaf3) !important;
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
		transition:
			background 0.2s,
			color 0.2s;
	}
	.onboarding-panel .disabled\:opacity-50:disabled {
		opacity: 0.5;
	}
</style>
