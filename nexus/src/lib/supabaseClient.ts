import { createClient } from '@supabase/supabase-js';

// These env vars must be prefixed with PUBLIC_ so that Vite exposes them to the client.
const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  // eslint-disable-next-line no-console
  console.warn('Supabase env vars are not set – auth will break.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
