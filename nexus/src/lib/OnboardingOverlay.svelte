<svelte:options accessors={true} />

<script lang="ts">
	import OnboardingSlideshow from '$lib/OnboardingSlideshowSelf.svelte';
	import { createEventDispatcher } from 'svelte';
	export let onSetRecommendation;
	let dispatch = createEventDispatcher();
	function finishOnboarding(e: CustomEvent<{ recommendation: string; bracket: string }>) {
		dispatch('finish', e);
	}
</script>

<div class="onboarding-bg fixed inset-0 z-50 flex items-center justify-center bg-black text-white">
	<div class="onboarding-panel w-full max-w-2xl p-8">
		<OnboardingSlideshow on:finish={(e) => finishOnboarding(e.detail)} />
	</div>
</div>

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
</style>
