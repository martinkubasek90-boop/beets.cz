-- Audit log for project access decisions
-- Run in Supabase SQL editor

create table if not exists public.project_access_audit (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.project_access_requests (id) on delete cascade,
  project_id bigint not null references public.projects (id) on delete cascade,
  requester_id uuid not null references auth.users (id) on delete cascade,
  decided_by uuid not null references auth.users (id) on delete cascade,
  action text not null check (action in ('approved','denied')),
  note text,
  created_at timestamptz not null default now()
);

alter table public.project_access_audit enable row level security;

-- helper: is project owner
create or replace function public.is_project_owner(pid bigint)
returns boolean language sql stable as $$
  select exists (select 1 from public.projects p where p.id = pid and p.user_id = auth.uid());
$$;

-- project owner can insert/select audit for their projects
drop policy if exists "audit_insert_owner" on public.project_access_audit;
create policy "audit_insert_owner"
  on public.project_access_audit
  for insert
  with check (public.is_project_owner(project_id));

drop policy if exists "audit_select_owner_or_requester" on public.project_access_audit;
create policy "audit_select_owner_or_requester"
  on public.project_access_audit
  for select
  using (public.is_project_owner(project_id) or requester_id = auth.uid());
