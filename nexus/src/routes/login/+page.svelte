<script lang="ts">
  import { supabase } from '$lib/supabaseClient';
  import { goto } from '$app/navigation';

  let email = '';

  async function signInWithGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google' });
    if (error) alert(error.message);
  }

  async function signInWithMagicLink() {
    const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: `${location.origin}/app` } });
    if (!error) {
      alert('Check your email for the login link!');
      email = '';
    } else {
      alert(error.message);
    }
  }
</script>

<section class="min-h-screen flex flex-col items-center justify-center bg-gray-900 text-white gap-4 p-4">
  <h1 class="text-3xl font-bold mb-6">Sign in to Alice</h1>

  <button class="px-6 py-3 bg-red-500 hover:bg-red-600 rounded-lg font-semibold" on:click={signInWithGoogle}>
    Continue with Google
  </button>

  <div class="flex items-center gap-2 opacity-70">
    <span class="border-t border-gray-600 w-20"></span>
    or
    <span class="border-t border-gray-600 w-20"></span>
  </div>

  <form class="flex flex-col gap-2 w-full max-w-sm" on:submit|preventDefault={signInWithMagicLink}>
    <input
      type="email"
      placeholder="you@example.com"
      bind:value={email}
      class="px-4 py-2 rounded bg-gray-800 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      required
    />
    <button type="submit" class="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 rounded font-semibold">Send magic link</button>
  </form>

  <button class="mt-8 text-sm underline opacity-80" on:click={() => goto('/')}>Back to landing</button>
</section>
