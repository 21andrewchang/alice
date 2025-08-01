<script lang="ts">
	import { onMount } from 'svelte';
	import OnboardingOverlay from '$lib/OnboardingOverlay.svelte';
	import { supabase } from '$lib/supabaseClient';
	import { recommendedNodeStore } from '$lib/recommendedNodeStore';

	export let data: { session: import('@supabase/supabase-js').Session | null };

	function handleSetRecommendation(node: any) {
		recommendedNodeStore.set(node);
	}
	let user = data.session?.user;
	let displayEmail = user?.email ?? '';
	let showOnboarding: boolean | null = false; // null = loading

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

	async function newUserProfile(recommendation: string, bracket: string) {
		const { data: sessionData } = await supabase.auth.getSession();
		user = sessionData.session?.user;
		console.log(user);
		const { data, error } = await supabase.from('users').insert([
			{
				id: user?.id,
				recommendation: recommendation,
				bracket: bracket
			}
		]);
		console.log(error);
	}
	async function finishOnboarding(e: CustomEvent<{ recommendation: string; bracket: string }>) {
		const { recommendation, bracket } = e.detail;
		console.log('from layout: ', recommendation, bracket);
		await newUserProfile(recommendation, bracket);
		showOnboarding = false;
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

		showOnboarding = null;
		showOnboarding = await isNewUser(user.id);
	});
</script>

{#if true}
	<OnboardingOverlay onSetRecommendation={handleSetRecommendation} on:finish={finishOnboarding} />
{/if}
<slot />
