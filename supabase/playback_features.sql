-- Playback-related tables: favorites, playback progress, play history
-- Run in Supabase SQL editor

-- Favorites (saved items)
create table if not exists public.favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  item_type text not null check (item_type in ('beat','project','acapella','collab')),
  item_id text not null,
  created_at timestamptz not null default now(),
  unique (user_id, item_type, item_id)
);

-- Playback progress (resume position)
create table if not exists public.playback_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  item_type text not null check (item_type in ('beat','project','acapella','collab')),
  item_id text not null,
  position_sec numeric not null default 0,
  duration_sec numeric,
  updated_at timestamptz not null default now(),
  unique (user_id, item_type, item_id)
);

-- Play history (optional analytics)
create table if not exists public.play_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  item_type text not null check (item_type in ('beat','project','acapella','collab')),
  item_id text not null,
  played_at timestamptz not null default now()
);

alter table public.favorites enable row level security;
alter table public.playback_progress enable row level security;
alter table public.play_history enable row level security;

-- Policies: only owner can read/write their data
drop policy if exists "favorites_rw_own" on public.favorites;
create policy "favorites_rw_own"
  on public.favorites
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "progress_rw_own" on public.playback_progress;
create policy "progress_rw_own"
  on public.playback_progress
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "history_select_own" on public.play_history;
create policy "history_select_own"
  on public.play_history
  for select
  using (auth.uid() = user_id);

drop policy if exists "history_insert_auth" on public.play_history;
create policy "history_insert_auth"
  on public.play_history
  for insert
  with check (auth.role() = 'authenticated');
