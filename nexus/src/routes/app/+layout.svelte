<script lang="ts">
	import { onMount } from 'svelte';
	import OnboardingOverlay from '$lib/OnboardingOverlay.svelte';
	import { supabase } from '$lib/supabaseClient';
	import { recommendedNodeStore } from '$lib/recommendedNodeStore';
	import { userProfile } from '$lib/userProfileStore';

	export let data: { session: import('@supabase/supabase-js').Session | null };

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

	async function newUserProfile(recommendation: number, bracket: string) {
		const { data: sessionData } = await supabase.auth.getSession();
		user = sessionData.session?.user;
		const { error } = await supabase.from('users').upsert(
			{
				id: user?.id,
				recommendation: recommendation,
				bracket: bracket
			},
			{ onConflict: 'id' }
		);
		userProfile.set({ bracket, recommendation });
		console.log('hello: ', error);
	}
	async function finishOnboarding(e: CustomEvent<{ recommendation: number; bracket: string }>) {
		const { recommendation, bracket } = e.detail;
		await newUserProfile(recommendation, bracket);
		showOnboarding = false;
		console.log('what');
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
	<OnboardingOverlay on:finish={finishOnboarding} />
{/if}
<slot />
