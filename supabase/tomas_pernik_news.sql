create table if not exists public.tomas_pernik_news (
  key text primary key,
  content jsonb not null default '{"items":[]}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.tomas_pernik_news enable row level security;

drop policy if exists "Public read tomas_pernik_news" on public.tomas_pernik_news;
create policy "Public read tomas_pernik_news"
on public.tomas_pernik_news
for select
using (true);

drop policy if exists "Service role write tomas_pernik_news" on public.tomas_pernik_news;
create policy "Service role write tomas_pernik_news"
on public.tomas_pernik_news
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');
