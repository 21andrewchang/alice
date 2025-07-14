<script lang="ts">
  export let data: { session: import('@supabase/supabase-js').Session | null };
  import { onboardingComplete } from '$lib/onboarding';
  import OnboardingOverlay from '$lib/OnboardingOverlay.svelte';
  import { derived } from 'svelte/store';

  const gate = derived(onboardingComplete, (o) => !data.session && !o);
</script>

{#if $gate}
  <OnboardingOverlay />
{:else}
  <slot />
{/if}
