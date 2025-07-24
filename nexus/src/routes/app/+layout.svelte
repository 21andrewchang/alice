<script lang="ts">
	import { onMount } from 'svelte';
	import { shouldShowOnboarding } from '$lib/onboarding';
	import OnboardingOverlay from '$lib/OnboardingOverlay.svelte';
	import { supabase } from '$lib/supabaseClient';
	import { recommendedNodeStore } from '$lib/recommendedNodeStore';
	import { browser } from '$app/environment';

	export let data: { session: import('@supabase/supabase-js').Session | null };

	let mounted = false;
	let user = data.session?.user;
	let displayEmail = user?.email ?? '';
	let showOnboarding: boolean | null = true; // null = loading

	function handleSetRecommendation(node: any) {
		recommendedNodeStore.set(node);
	}

	// Helper: returns true if no row exists
	async function isNewUser(uid: string) {
		const { count, error } = await supabase
			.from('users')
			.select('id', { count: 'exact', head: true })
			.eq('id', uid);

		if (error) {
			console.error('Onboarding check error', error);
			return false;
		}
		return count === 0;
	}

	onMount(async () => {
		// 1) Ensure we have a user object
		if (!user) {
			const { data: sessionData } = await supabase.auth.getSession();
			user = sessionData.session?.user ?? null;
			displayEmail = user?.email ?? '';
		}

		if (!user) {
			showOnboarding = false;
			return;
		}

		showOnboarding = null; // optional: loading state
		showOnboarding = await isNewUser(user.id);
		mounted = true;
		console.log(browser);
	});
</script>

<slot />
