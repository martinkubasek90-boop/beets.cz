-- Memodo one-shot setup for Supabase SQL Editor
-- Generated from individual scripts in /supabase
-- Date: 2026-03-09

-- 1) Catalog schema
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


-- 2) Admin config
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


-- 3) Price allowlist
create table if not exists public.memodo_price_allowlist (
  email text primary key,
  is_active boolean not null default true,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists memodo_price_allowlist_active_idx
  on public.memodo_price_allowlist (is_active);

-- 4) Inquiry history
create table if not exists public.memodo_inquiries (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  email text not null,
  contact_name text not null,
  company text,
  phone text,
  product_interest text,
  message text not null,
  estimated_quantity numeric,
  product_id text,
  battery_id text,
  hubspot_contact_id text,
  hubspot_deal_id text
);

create index if not exists memodo_inquiries_email_created_idx
  on public.memodo_inquiries (email, created_at desc);

-- 5) Event analytics
create table if not exists public.memodo_events (
  id bigserial primary key,
  event_name text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists memodo_events_created_at_idx on public.memodo_events (created_at desc);
create index if not exists memodo_events_name_idx on public.memodo_events (event_name);

-- 6) Optional dummy products seed (CZK)
-- Memodo dummy seed products (from real sample rows)
-- Run in Supabase SQL Editor.
-- Uses UPSERT by external_id so it is safe to run repeatedly.

insert into public.memodo_products (
  external_id,
  name,
  category,
  brand,
  price,
  price_with_vat,
  image_url,
  description,
  specifications,
  art_number,
  in_stock,
  is_promo,
  promo_label,
  original_price,
  is_active,
  raw_payload
)
values
  (
    '12318',
    'Pylontech Force H3 10,24 kWh',
    'baterie',
    'Pylontech',
    49275.77,
    null,
    'https://www.memodo.cz/media/67/92/13/1772008509/20230629200630_6315-2-6ae3bf7abcc15f368ba76f45ca5e19c8.jpg?ts=1772008509',
    'Rezidenční vysokonapěťové úložiště z feedu Memodo.',
    '{"kapacita":"9,69 kWh","chemie":"Vysokonapěťové lithium","pocet_cyklu":"8000","zaruka_let":"10","pocet_fazi":"1"}'::jsonb,
    '12318',
    true,
    false,
    null,
    null,
    true,
    '{"source":"dummy_seed","currency":"CZK","fx_source":"ECB","fx_date":"2026-03-05","fx_rate_eur_czk":24.396,"fx_markup_pct":3}'::jsonb
  ),
  (
    '12752',
    'GoodWe Lynx D - 10 kWh',
    'baterie',
    'GoodWe',
    56035.17,
    null,
    'https://www.memodo.cz/media/f6/8e/1d/1772095912/2x-01-a30116bc43545b6da2d1d5b21adf6178.png?ts=1772095912',
    'Rezidenční vysokonapěťová baterie GoodWe Lynx D z feedu Memodo.',
    '{"kapacita":"10 kWh","chemie":"Vysokonapěťové fosforečnan lithno-železnatý","zaruka_let":"10","pocet_fazi":"3","typ_baterie":"Vysokonapěťová baterie"}'::jsonb,
    '12752',
    true,
    false,
    null,
    null,
    true,
    '{"source":"dummy_seed","currency":"CZK","fx_source":"ECB","fx_date":"2026-03-05","fx_rate_eur_czk":24.396,"fx_markup_pct":3}'::jsonb
  ),
  (
    '13415',
    'Dyness Tower Pro TP11',
    'baterie',
    'Dyness',
    59251.54,
    null,
    'https://www.memodo.cz/media/d3/e1/58/1772179929/tower_pro_tp11-front_side-6d93c11aface5237895c8a37d68e4a8e.png?ts=1772179929',
    'Rezidenční vysokonapěťové úložiště Dyness Tower Pro.',
    '{"kapacita":"10,9 kWh","chemie":"Vysokonapěťové fosforečnan lithno-železnatý","pocet_cyklu":"8000","zaruka_let":"10","pocet_fazi":"3"}'::jsonb,
    '13415',
    true,
    true,
    'Novinka',
    null,
    true,
    '{"source":"dummy_seed","currency":"CZK","fx_source":"ECB","fx_date":"2026-03-05","fx_rate_eur_czk":24.396,"fx_markup_pct":3}'::jsonb
  ),
  (
    '12306',
    'Dyness Tower T10 2.0 s WiFi modulem',
    'baterie',
    'Dyness',
    52165.48,
    null,
    'https://www.memodo.cz/media/3f/7b/74/1772469790/dyness-v2_3-2-61dd0f2d34df51afb48cde3179e2e33b.jpg?ts=1772469790',
    'Rezidenční vysokonapěťová baterie Dyness Tower.',
    '{"kapacita":"10,6 kWh","chemie":"Vysokonapěťové fosforečnan lithno-železnatý","zaruka_let":"10","pocet_fazi":"3","typ_baterie":"Vysokonapěťová baterie"}'::jsonb,
    '12306',
    true,
    true,
    '-39%',
    null,
    true,
    '{"source":"dummy_seed","currency":"CZK","fx_source":"ECB","fx_date":"2026-03-05","fx_rate_eur_czk":24.396,"fx_markup_pct":3}'::jsonb
  ),
  (
    '12319',
    'Pylontech Force H3 15,36 kWh',
    'baterie',
    'Pylontech',
    68448.35,
    null,
    'https://www.memodo.cz/media/d3/56/1f/1772008512/20230629200619_9376-4b2c300025b25698b74cc9f78f3a265e.jpg?ts=1772008512',
    'Rezidenční vysokonapěťové úložiště Pylontech Force H3.',
    '{"kapacita":"14,73 kWh","chemie":"Vysokonapěťové lithium","pocet_cyklu":"8000","zaruka_let":"10","pocet_fazi":"1"}'::jsonb,
    '12319',
    true,
    false,
    null,
    null,
    true,
    '{"source":"dummy_seed","currency":"CZK","fx_source":"ECB","fx_date":"2026-03-05","fx_rate_eur_czk":24.396,"fx_markup_pct":3}'::jsonb
  ),
  (
    '12320',
    'Pylontech Force H3 20,48 kWh',
    'baterie',
    'Pylontech',
    87620.92,
    null,
    'https://www.memodo.cz/media/a7/a6/c1/1772008512/20230629200543_2243-c7a16f6741505134b3302c7e731560c0.jpeg?ts=1772008512',
    'Rezidenční vysokonapěťové úložiště Pylontech Force H3.',
    '{"kapacita":"19,48 kWh","chemie":"Vysokonapěťové lithium","pocet_cyklu":"8000","zaruka_let":"10","pocet_fazi":"1"}'::jsonb,
    '12320',
    true,
    false,
    null,
    null,
    true,
    '{"source":"dummy_seed","currency":"CZK","fx_source":"ECB","fx_date":"2026-03-05","fx_rate_eur_czk":24.396,"fx_markup_pct":3}'::jsonb
  ),
  (
    '12324',
    'Pylontech Force H3 25,6 kWh',
    'baterie',
    'Pylontech',
    106793.49,
    null,
    'https://www.memodo.cz/media/16/08/27/1772008806/20230629200531_0993-2-1d1db61838f55c3c9221c293faef01e0.jpeg?ts=1772008806',
    'Rezidenční vysokonapěťové úložiště Pylontech Force H3.',
    '{"kapacita":"24,32 kWh","chemie":"Vysokonapěťové lithium","pocet_cyklu":"8000","zaruka_let":"10","pocet_fazi":"1"}'::jsonb,
    '12324',
    true,
    false,
    null,
    null,
    true,
    '{"source":"dummy_seed","currency":"CZK","fx_source":"ECB","fx_date":"2026-03-05","fx_rate_eur_czk":24.396,"fx_markup_pct":3}'::jsonb
  ),
  (
    '13335',
    'GoodWe Lynx D - 5 kWh',
    'baterie',
    'GoodWe',
    28017.59,
    null,
    'https://www.memodo.cz/media/32/df/eb/1772095911/01-2-a5d7ccc7a6a85d99b59d2a48c9ba2a48.png?ts=1772095911',
    'Rezidenční vysokonapěťová baterie GoodWe Lynx D.',
    '{"kapacita":"5 kWh","chemie":"Vysokonapěťové fosforečnan lithno-železnatý","pocet_fazi":"3","typ_baterie":"3-fázové, Vysokonapěťová baterie"}'::jsonb,
    '13335',
    true,
    false,
    null,
    null,
    true,
    '{"source":"dummy_seed","currency":"CZK","fx_source":"ECB","fx_date":"2026-03-05","fx_rate_eur_czk":24.396,"fx_markup_pct":3}'::jsonb
  ),
  (
    '12753',
    'GoodWe Lynx D - 15 kWh',
    'baterie',
    'GoodWe',
    84052.76,
    null,
    'https://www.memodo.cz/media/06/81/e7/1772095913/3x-01-fd5a89f18bb45917a56a63f5e3f95656.png?ts=1772095913',
    'Rezidenční vysokonapěťová baterie GoodWe Lynx D.',
    '{"kapacita":"15 kWh","chemie":"Vysokonapěťové fosforečnan lithno-železnatý","zaruka_let":"10","pocet_fazi":"3","typ_baterie":"Vysokonapěťová baterie"}'::jsonb,
    '12753',
    true,
    false,
    null,
    null,
    true,
    '{"source":"dummy_seed","currency":"CZK","fx_source":"ECB","fx_date":"2026-03-05","fx_rate_eur_czk":24.396,"fx_markup_pct":3}'::jsonb
  ),
  (
    '12754',
    'GoodWe Lynx D - 20 kWh',
    'baterie',
    'GoodWe',
    112070.34,
    null,
    'https://www.memodo.cz/media/e8/ee/23/1772095913/4x-01_1-3996e796bce25ebca5f0a04f135a16b0.png?ts=1772095913',
    'Rezidenční vysokonapěťová baterie GoodWe Lynx D.',
    '{"kapacita":"20 kWh","chemie":"Vysokonapěťové fosforečnan lithno-železnatý","zaruka_let":"10","pocet_fazi":"3","typ_baterie":"Vysokonapěťová baterie"}'::jsonb,
    '12754',
    true,
    false,
    null,
    null,
    true,
    '{"source":"dummy_seed","currency":"CZK","fx_source":"ECB","fx_date":"2026-03-05","fx_rate_eur_czk":24.396,"fx_markup_pct":3}'::jsonb
  ),
  (
    '13301',
    'Sungrow SBH100 baterie',
    'baterie',
    'Sungrow',
    85660.94,
    null,
    'https://www.memodo.cz/media/1e/0a/cf/1772197014/sungrow-sbh100-f6490474b41a51f98e73585bcf6a17a8.png?ts=1772197014',
    'Rezidenční vysokonapěťová baterie Sungrow SBH.',
    '{"kapacita":"10 kWh","chemie":"Vysokonapěťové fosforečnan lithno-železnatý","pocet_fazi":"3","typ_baterie":"Vysokonapěťová baterie"}'::jsonb,
    '13301',
    true,
    true,
    'Novinka',
    null,
    true,
    '{"source":"dummy_seed","currency":"CZK","fx_source":"ECB","fx_date":"2026-03-05","fx_rate_eur_czk":24.396,"fx_markup_pct":3}'::jsonb
  ),
  (
    '13302',
    'Sungrow SBH150 baterie',
    'baterie',
    'Sungrow',
    121945.60,
    null,
    'https://www.memodo.cz/media/be/ab/ba/1772197014/sungrow-sbh150-ac2f5a613b6d5c3d8d4faa2884a0d40f.png?ts=1772197014',
    'Rezidenční vysokonapěťová baterie Sungrow SBH.',
    '{"kapacita":"15 kWh","chemie":"Vysokonapěťové fosforečnan lithno-železnatý","pocet_fazi":"3","typ_baterie":"Vysokonapěťová baterie"}'::jsonb,
    '13302',
    true,
    true,
    'Novinka',
    null,
    true,
    '{"source":"dummy_seed","currency":"CZK","fx_source":"ECB","fx_date":"2026-03-05","fx_rate_eur_czk":24.396,"fx_markup_pct":3}'::jsonb
  )
on conflict (external_id) do update
set
  name = excluded.name,
  category = excluded.category,
  brand = excluded.brand,
  price = excluded.price,
  price_with_vat = excluded.price_with_vat,
  image_url = excluded.image_url,
  description = excluded.description,
  specifications = excluded.specifications,
  art_number = excluded.art_number,
  in_stock = excluded.in_stock,
  is_promo = excluded.is_promo,
  promo_label = excluded.promo_label,
  original_price = excluded.original_price,
  is_active = excluded.is_active,
  raw_payload = excluded.raw_payload;
