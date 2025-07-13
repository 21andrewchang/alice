# User Data & Progress – Architecture (V1)

## Supabase Schema Sketch
```sql
create table public.papers (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  difficulty int,
  url text,
  summary text
);

create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  concept text not null,
  content jsonb not null, -- lesson paragraphs, examples, quiz
  difficulty int
);

create type node_type as enum ('paper', 'lesson');

create table public.user_progress (
  user_id uuid references auth.users(id) on delete cascade,
  node_id uuid not null,
  node_type node_type not null,
  completed_at timestamptz default now(),
  xp int,
  primary key (user_id, node_id)
);

create table public.streak_log (
  user_id uuid references auth.users(id) on delete cascade,
  date date not null,
  primary key (user_id, date)
);
```

### RLS Policies
```sql
alter table public.user_progress enable row level security;
create policy "user can read/write own progress" on public.user_progress
  for all using ( auth.uid() = user_id );

alter table public.streak_log enable row level security;
create policy "user can read/write own streak" on public.streak_log
  for all using ( auth.uid() = user_id );
```

## SvelteKit Data Layer
```
src/lib/db.ts               // thin wrapper around supabase client
src/routes/api/progress/+server.ts  // POST to record completion (authenticated)
```

### Example Completion Call
```ts
// /api/progress
export const POST = async ({ locals, request }) => {
  const { nodeId, nodeType, xp } = await request.json();
  const uid = locals.session?.user.id;
  if (!uid) return json({ error: 'Unauthorized' }, { status: 401 });

  await locals.sb.from('user_progress').upsert({
    user_id: uid,
    node_id: nodeId,
    node_type: nodeType,
    xp
  });

  await locals.sb.rpc('increment_xp_and_streak', { p_uid: uid, p_xp: xp });
  return json({ ok: true });
};
```

## Postgres Function for XP + Streak
```sql
create or replace function public.increment_xp_and_streak(p_uid uuid, p_xp int) returns void as $$
begin
  update public.users set xp = xp + p_xp where id = p_uid;
  insert into public.streak_log(user_id, date) values (p_uid, current_date)
    on conflict do nothing;
end; $$ language plpgsql security definer;
```

## Guest Storage Shape
```ts
interface GuestProgress {
  papersCompleted: string[];  // uuid[]
  lessonsCompleted: string[];
  xp: number;
  streakDates: string[]; // ISO date strings
}
localStorage.setItem('guestProgress', JSON.stringify(progress));
```

## Data Flow Diagram
```
Lesson Complete
   │
   ▼
/api/progress (POST) ─► Supabase RPC increment_xp_and_streak
                               │
                               ▼
                       users.xp, streak_log
```

## Future Extensions
• Materialized view `leaderboard` ordered by XP.  
• Event triggers to grant achievements on XP thresholds.
