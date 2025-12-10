-- Tabulka hovorů (1:1)
create table if not exists public.calls (
  id uuid primary key default gen_random_uuid(),
  room_name text not null,
  caller_id uuid not null references auth.users (id) on delete cascade,
  callee_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'ringing', -- ringing | accepted | rejected | canceled | ended
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  ended_at timestamptz
);

alter table public.calls enable row level security;

-- Přístup jen pro účastníky
create policy if not exists "calls_select_own"
  on public.calls
  for select
  using (auth.uid() = caller_id or auth.uid() = callee_id);

-- Vytvořit hovor může jen volající
create policy if not exists "calls_insert_caller"
  on public.calls
  for insert
  with check (auth.uid() = caller_id);

-- Aktualizovat hovor můžou jen účastníci
create policy if not exists "calls_update_own"
  on public.calls
  for update
  using (auth.uid() = caller_id or auth.uid() = callee_id);
