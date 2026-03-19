create extension if not exists pgcrypto;

create table if not exists public.linkedin_scrape_runs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  source_query text not null,
  status text not null default 'queued' check (status in ('queued', 'discovering', 'scraping', 'completed', 'failed')),
  notes text,
  filters jsonb not null default '{"keywords":[],"titles":[],"locations":[]}'::jsonb,
  total_candidates integer not null default 0,
  total_profiles integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.linkedin_profile_candidates (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.linkedin_scrape_runs(id) on delete cascade,
  full_name text,
  headline text,
  company_name text,
  location text,
  linkedin_url text not null,
  source_query text,
  status text not null default 'pending' check (status in ('pending', 'scraped', 'skipped', 'failed')),
  scraped_at timestamptz,
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (run_id, linkedin_url)
);

create table if not exists public.linkedin_companies (
  id uuid primary key default gen_random_uuid(),
  normalized_name text not null unique,
  company_name text not null,
  company_domain text,
  linkedin_company_url text,
  industry text,
  company_size text,
  location text,
  source text not null default 'manual',
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists linkedin_scrape_runs_created_at_idx
  on public.linkedin_scrape_runs (created_at desc);

create index if not exists linkedin_profile_candidates_run_id_idx
  on public.linkedin_profile_candidates (run_id, created_at desc);

create index if not exists linkedin_profile_candidates_status_idx
  on public.linkedin_profile_candidates (status, created_at desc);

create index if not exists linkedin_profile_candidates_company_idx
  on public.linkedin_profile_candidates (company_name);

create or replace function public.linkedin_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists linkedin_scrape_runs_touch_updated_at on public.linkedin_scrape_runs;
create trigger linkedin_scrape_runs_touch_updated_at
before update on public.linkedin_scrape_runs
for each row execute function public.linkedin_touch_updated_at();

drop trigger if exists linkedin_profile_candidates_touch_updated_at on public.linkedin_profile_candidates;
create trigger linkedin_profile_candidates_touch_updated_at
before update on public.linkedin_profile_candidates
for each row execute function public.linkedin_touch_updated_at();

drop trigger if exists linkedin_companies_touch_updated_at on public.linkedin_companies;
create trigger linkedin_companies_touch_updated_at
before update on public.linkedin_companies
for each row execute function public.linkedin_touch_updated_at();
