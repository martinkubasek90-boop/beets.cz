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
