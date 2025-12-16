-- Live sessions / listening party schema
-- Run this in Supabase SQL editor

-- Event table
create table if not exists public.live_events (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  description text,
  room_name text,
  cover_url text,
  stream_embed_url text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  status text not null default 'scheduled' check (status in ('scheduled','live','done','cancelled')),
  playlist_json jsonb,
  created_at timestamptz not null default now()
);

-- Chat messages
create table if not exists public.live_messages (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.live_events (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  message_type text not null default 'chat' check (message_type in ('chat','question','mod'))
);

-- Donations (placeholder, filled after provider webhook)
create table if not exists public.live_tips (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.live_events (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,
  amount_cents integer not null check (amount_cents >= 0),
  currency text not null default 'CZK',
  provider text,
  provider_id text,
  status text not null default 'pending' check (status in ('pending','succeeded','failed')),
  created_at timestamptz not null default now()
);

alter table public.live_events enable row level security;
alter table public.live_messages enable row level security;
alter table public.live_tips enable row level security;

-- Policies
-- live_events: everyone can see; only artist (owner) can insert/update; delete only owner
drop policy if exists "live_events_select_public" on public.live_events;
create policy "live_events_select_public"
  on public.live_events for select
  using (true);

drop policy if exists "live_events_insert_owner" on public.live_events;
create policy "live_events_insert_owner"
  on public.live_events for insert
  with check (auth.uid() = artist_id);

drop policy if exists "live_events_update_owner" on public.live_events;
create policy "live_events_update_owner"
  on public.live_events for update
  using (auth.uid() = artist_id);

drop policy if exists "live_events_delete_owner" on public.live_events;
create policy "live_events_delete_owner"
  on public.live_events for delete
  using (auth.uid() = artist_id);

-- live_messages: číst mohou přihlášení; psát jen přihlášení
drop policy if exists "live_messages_select_auth" on public.live_messages;
create policy "live_messages_select_auth"
  on public.live_messages for select
  using (auth.role() = 'authenticated');

drop policy if exists "live_messages_insert_auth" on public.live_messages;
create policy "live_messages_insert_auth"
  on public.live_messages for insert
  with check (auth.uid() = user_id);

-- live_tips: everyone can read aggregated tips; inserts only authenticated (webhook can bypass with service key)
drop policy if exists "live_tips_select_public" on public.live_tips;
create policy "live_tips_select_public"
  on public.live_tips for select
  using (true);

drop policy if exists "live_tips_insert_auth" on public.live_tips;
create policy "live_tips_insert_auth"
  on public.live_tips for insert
  with check (auth.role() = 'authenticated');
