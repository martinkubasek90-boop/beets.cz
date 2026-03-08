create table if not exists public.memodo_price_allowlist (
  email text primary key,
  is_active boolean not null default true,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists memodo_price_allowlist_active_idx
  on public.memodo_price_allowlist (is_active);
