import type { RequestHandler } from '@sveltejs/kit';

export const POST: RequestHandler = async ({ locals }) => {
  await locals.supabase.auth.signOut();
  return new Response(null, {
    status: 303,
    headers: {
      location: '/'
    }
  });
};
