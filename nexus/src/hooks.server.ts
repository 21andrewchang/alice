import dotenv from 'dotenv';
dotenv.config();

console.log('SERVER: VITE_SUPABASE_URL:', process.env.VITE_SUPABASE_URL);
console.log('SERVER: VITE_SUPABASE_ANON_KEY:', process.env.VITE_SUPABASE_ANON_KEY);

import { createSupabaseServerClient } from '@supabase/auth-helpers-sveltekit';
import { dev } from '$app/environment';
import type { Handle } from '@sveltejs/kit';
import type { SupabaseClient, Session } from '@supabase/supabase-js';

export const handle: Handle = async ({ event, resolve }) => {
  // Extend event.locals type for custom properties
  const locals = event.locals as typeof event.locals & {
    supabase: SupabaseClient;
    getSession: () => Promise<Session | null>;
  };

  // Create Supabase client per request.
  locals.supabase = createSupabaseServerClient({
    supabaseUrl: process.env.VITE_SUPABASE_URL!,
    supabaseKey: process.env.VITE_SUPABASE_ANON_KEY!,
    event,
    cookieOptions: {
      secure: !dev
    }
  });

  // Helper to get the current session on server.
  locals.getSession = async () => {
    const { data } = await locals.supabase.auth.getSession();
    return data.session;
  };

  return resolve(event);
};

// Make types visible to routes.
declare module '@sveltejs/kit' {
  interface Locals {
    supabase: SupabaseClient;
    getSession: () => Promise<Session | null>;
  }
}
