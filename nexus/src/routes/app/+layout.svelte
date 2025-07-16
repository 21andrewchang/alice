<script lang="ts">
  export let data: { session: import('@supabase/supabase-js').Session | null };
  import { shouldShowOnboarding } from '$lib/onboarding';
  import OnboardingOverlay from '$lib/OnboardingOverlay.svelte';
  import { supabase } from '$lib/supabaseClient';
  import { onMount } from 'svelte';
  import { recommendedNodeStore } from '$lib/recommendedNodeStore';

  function handleSetRecommendation(node: any) {
    recommendedNodeStore.set(node);
  }

  // SSR session
  let user = data.session?.user;
  let displayEmail = user?.email;

  // Client-side fallback
  onMount(async () => {
    if (!user) {
      const { data } = await supabase.auth.getSession();
      if (data.session?.user) {
        user = data.session.user;
        displayEmail = user.email;
      }
    }
  });
</script>

{#if user}
  <div class="fixed top-20 left-4 z-50">
    <div class="flex items-center gap-2 px-4 py-2 rounded-lg" style="background-color: rgba(17, 17, 17, 0.9); border: 1px solid #333333; backdrop-filter: blur(10px);">
      <span class="text-sm font-medium" style="color: #BFCAF3;">{displayEmail}</span>
    </div>
  </div>
{/if}

<slot />

{#if $shouldShowOnboarding}
  <OnboardingOverlay onSetRecommendation={handleSetRecommendation} />
{/if}
