import { createSupabaseServerClient } from '@supabase/auth-helpers-sveltekit';
import { dev } from '$app/environment';
import type { Handle } from '@sveltejs/kit';
import type { SupabaseClient, Session } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables manually
dotenv.config();



export const handle: Handle = async ({ event, resolve }) => {
  // Create Supabase client per request.
  event.locals.supabase = createSupabaseServerClient({
    supabaseUrl: process.env.PUBLIC_SUPABASE_URL!,
    supabaseKey: process.env.PUBLIC_SUPABASE_ANON_KEY!,
    event,
    cookieOptions: {
      secure: !dev
    }
  });

  // Helper to get the current session on server.
  event.locals.getSession = async () => {
    const { data } = await event.locals.supabase.auth.getSession();
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
