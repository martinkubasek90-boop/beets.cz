create table if not exists public.memodo_events (
  id bigserial primary key,
  event_name text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists memodo_events_created_at_idx on public.memodo_events (created_at desc);
create index if not exists memodo_events_name_idx on public.memodo_events (event_name);
