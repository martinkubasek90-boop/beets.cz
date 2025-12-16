-- Notification preferences (per user)
-- Run in Supabase SQL editor

create table if not exists public.notification_preferences (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email_notifications boolean not null default true,
  push_notifications boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.touch_notification_prefs()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trg_touch_notification_prefs on public.notification_preferences;
create trigger trg_touch_notification_prefs
before update on public.notification_preferences
for each row execute function public.touch_notification_prefs();

alter table public.notification_preferences enable row level security;

drop policy if exists "notification_prefs_rw_self" on public.notification_preferences;
create policy "notification_prefs_rw_self"
  on public.notification_preferences
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
