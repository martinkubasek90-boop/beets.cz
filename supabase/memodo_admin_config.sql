create table if not exists public.memodo_admin_config (
  key text primary key,
  config jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create or replace function public.memodo_admin_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists memodo_admin_config_touch_updated_at on public.memodo_admin_config;
create trigger memodo_admin_config_touch_updated_at
before update on public.memodo_admin_config
for each row execute function public.memodo_admin_touch_updated_at();

