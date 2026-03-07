create extension if not exists pgcrypto;

create table if not exists public.memodo_products (
  id uuid primary key default gen_random_uuid(),
  external_id text not null unique,
  name text not null,
  category text not null check (
    category in (
      'panely',
      'stridace',
      'baterie',
      'ems',
      'montazni_systemy',
      'nabijeci_stanice',
      'tepelna_cerpadla',
      'prislusenstvi'
    )
  ),
  brand text,
  price numeric(14,2),
  price_with_vat numeric(14,2),
  image_url text,
  description text,
  specifications jsonb not null default '{}'::jsonb,
  art_number text,
  in_stock boolean not null default true,
  is_promo boolean not null default false,
  promo_label text,
  original_price numeric(14,2),
  is_active boolean not null default true,
  raw_payload jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists memodo_products_active_idx on public.memodo_products (is_active);
create index if not exists memodo_products_category_idx on public.memodo_products (category);
create index if not exists memodo_products_promo_idx on public.memodo_products (is_promo);

create table if not exists public.memodo_promotions (
  id uuid primary key default gen_random_uuid(),
  external_id text not null unique,
  title text not null,
  description text,
  image_url text,
  discount_percent numeric(6,2),
  valid_from date,
  valid_to date,
  is_active boolean not null default true,
  highlight_color text not null default '#FFE500',
  category text check (
    category is null or
    category in (
      'panely',
      'stridace',
      'baterie',
      'ems',
      'montazni_systemy',
      'nabijeci_stanice',
      'tepelna_cerpadla',
      'prislusenstvi'
    )
  ),
  raw_payload jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists memodo_promotions_active_idx on public.memodo_promotions (is_active);

create or replace function public.memodo_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists memodo_products_touch_updated_at on public.memodo_products;
create trigger memodo_products_touch_updated_at
before update on public.memodo_products
for each row execute function public.memodo_touch_updated_at();

drop trigger if exists memodo_promotions_touch_updated_at on public.memodo_promotions;
create trigger memodo_promotions_touch_updated_at
before update on public.memodo_promotions
for each row execute function public.memodo_touch_updated_at();

