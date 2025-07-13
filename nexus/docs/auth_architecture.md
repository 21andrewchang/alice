# Auth & Guest Flow – Architecture (V1)

## Tech Stack
• SvelteKit (client + server routes)  
• Supabase Auth  
• `@supabase/auth-helpers-sveltekit` for session handling  
• LocalStorage for guest progress

## Sequence Diagram
1. User visits `/` ➜ `+layout.server.ts` fetches Supabase session.  
2. If no session, user can start onboarding (`/onboarding`).  
3. On first-lesson completion, UI calls `showSignupModal()`.  
4. User selects Google or Email ➜ Supabase JS `signInWithOAuth()` / `signInWithOtp()`.
5. Supabase returns session ➜ stored in `supabase.auth.setSession()`; layout refresh triggers load.
6. Guest progress object `{papersCompleted, xp, streak}` is read from `localStorage` and upserted to `user_progress`, `users` tables.

```
Browser ──▶ SvelteKit Route ──▶ Supabase Auth
   ▲                               │
   └────────────── session─────────┘
```

## Supabase Setup
```sql
-- Users table mirrors auth.users uid
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  level int default 1,
  xp int default 0,
  streak int default 0,
  created_at timestamptz default now()
);

-- RLS
alter table public.users enable row level security;
create policy "Users can view/update their own row" on public.users
  for select, update using ( auth.uid() = id );
```
Google OAuth config: enable in Supabase Dashboard, set callback URL to `https://<domain>/_supabase/auth/v1/callback`.

## SvelteKit Implementation
```
src/lib/supabaseClient.ts
src/hooks.server.ts        // inject supabase into locals
src/routes/+layout.server.ts  // loads session & user row
src/routes/(app)/+layout.ts   // guard for authenticated routes
src/routes/login/+page.svelte // fallback login page (rarely used)
```

## Guest Progress Merge
```ts
// after auth success
const guest = JSON.parse(localStorage.getItem('guestProgress') ?? '{}');
await supabase.from('user_progress').upsert(guest.progress);
await supabase.from('users').update({ xp: guest.xp, streak: guest.streak });
localStorage.removeItem('guestProgress');
```

## Security Notes
• Never expose the `service_role` key.  
• Use `auth-helpers-sveltekit` to set secure, `HttpOnly` cookies for SSR.  
• All Supabase RLS policies keyed on `auth.uid()`.

## Future Extensions
• Edge function to merge anonymous Supabase user with OAuth account.  
• MFA once traction grows.
