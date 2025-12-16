-- Media pipeline skeleton: jobs for validation/transcode/waveform and cleanup metadata
-- Run in Supabase SQL editor

create type public.media_job_status as enum ('queued','processing','succeeded','failed');
create type public.media_job_type as enum ('validate','transcode','waveform','cleanup');

create table if not exists public.media_jobs (
  id uuid primary key default gen_random_uuid(),
  job_type public.media_job_type not null,
  user_id uuid references auth.users (id) on delete set null,
  item_type text not null check (item_type in ('beat','project','acapella','collab')),
  item_id text,
  source_path text,
  target_path text,
  status public.media_job_status not null default 'queued',
  error_message text,
  meta jsonb,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz
);

-- Cleanup tracker for orphaned storage files
create table if not exists public.storage_orphans (
  id uuid primary key default gen_random_uuid(),
  bucket text not null,
  path text not null,
  found_at timestamptz not null default now(),
  resolved_at timestamptz,
  note text
);

alter table public.media_jobs enable row level security;
alter table public.storage_orphans enable row level security;

-- Policies: read for authenticated, write only service role (handle via Service key)
drop policy if exists "media_jobs_select_auth" on public.media_jobs;
create policy "media_jobs_select_auth"
  on public.media_jobs
  for select
  using (auth.role() = 'authenticated');

drop policy if exists "media_jobs_insert_service" on public.media_jobs;
create policy "media_jobs_insert_service"
  on public.media_jobs
  for insert
  with check (auth.role() = 'service_role');

drop policy if exists "media_jobs_update_service" on public.media_jobs;
create policy "media_jobs_update_service"
  on public.media_jobs
  for update
  using (auth.role() = 'service_role');

drop policy if exists "storage_orphans_select_auth" on public.storage_orphans;
create policy "storage_orphans_select_auth"
  on public.storage_orphans
  for select
  using (auth.role() = 'authenticated');

drop policy if exists "storage_orphans_insert_service" on public.storage_orphans;
create policy "storage_orphans_insert_service"
  on public.storage_orphans
  for insert
  with check (auth.role() = 'service_role');
