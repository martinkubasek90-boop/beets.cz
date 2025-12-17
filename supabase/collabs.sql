 -- Collaboration feature: threads between two (or more) users exchanging files and messages,
-- ending with a finished audio (beat/project) attributed to both authors.
-- Run this in Supabase SQL editor (SQL cannot use IF NOT EXISTS on policies, so drops are safe).

-- 1) Tables
create table if not exists public.collab_threads (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  created_by uuid not null references auth.users (id) on delete cascade,
  status text not null default 'active' check (status in ('draft','active','done')),
  result_audio_url text,
  result_cover_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.collab_participants (
  thread_id uuid not null references public.collab_threads (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'guest' check (role in ('owner','guest')),
  created_at timestamptz not null default now(),
  primary key (thread_id, user_id)
);

create table if not exists public.collab_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.collab_threads (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.collab_files (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.collab_threads (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  file_url text not null,
  file_name text,
  created_at timestamptz not null default now()
);

-- 2) Triggers
create or replace function public.collab_touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trg_collab_threads_updated on public.collab_threads;
create trigger trg_collab_threads_updated
before update on public.collab_threads
for each row execute function public.collab_touch_updated_at();

-- 3) RLS
alter table public.collab_threads enable row level security;
alter table public.collab_participants enable row level security;
alter table public.collab_messages enable row level security;
alter table public.collab_files enable row level security;

-- Helpers: policy match if user is participant
create or replace function public.is_collab_participant(thread uuid)
returns boolean language sql stable as $$
  select exists (
    select 1 from public.collab_participants cp
    where cp.thread_id = thread and cp.user_id = auth.uid()
  );
$$;

-- collab_threads
drop policy if exists "collab_threads_select" on public.collab_threads;
create policy "collab_threads_select"
on public.collab_threads
for select
using (public.is_collab_participant(id));

drop policy if exists "collab_threads_insert" on public.collab_threads;
create policy "collab_threads_insert"
on public.collab_threads
for insert
with check (auth.uid() = created_by);

drop policy if exists "collab_threads_update" on public.collab_threads;
create policy "collab_threads_update"
on public.collab_threads
for update
using (public.is_collab_participant(id));

drop policy if exists "collab_threads_delete" on public.collab_threads;
create policy "collab_threads_delete"
on public.collab_threads
for delete
using (created_by = auth.uid());

-- collab_participants
drop policy if exists "collab_participants_select" on public.collab_participants;
create policy "collab_participants_select"
on public.collab_participants
for select
using (public.is_collab_participant(thread_id));

drop policy if exists "collab_participants_insert" on public.collab_participants;
create policy "collab_participants_insert"
on public.collab_participants
for insert
with check (
  -- only participant of thread (typically owner) může přidat dalšího
  public.is_collab_participant(thread_id)
);

drop policy if exists "collab_participants_delete" on public.collab_participants;
create policy "collab_participants_delete"
on public.collab_participants
for delete
using (public.is_collab_participant(thread_id));

-- collab_messages
drop policy if exists "collab_messages_select" on public.collab_messages;
create policy "collab_messages_select"
on public.collab_messages
for select
using (public.is_collab_participant(thread_id));

drop policy if exists "collab_messages_insert" on public.collab_messages;
create policy "collab_messages_insert"
on public.collab_messages
for insert
with check (public.is_collab_participant(thread_id) and user_id = auth.uid());

-- collab_files
drop policy if exists "collab_files_select" on public.collab_files;
create policy "collab_files_select"
on public.collab_files
for select
using (public.is_collab_participant(thread_id));

drop policy if exists "collab_files_insert" on public.collab_files;
create policy "collab_files_insert"
on public.collab_files
for insert
with check (public.is_collab_participant(thread_id) and user_id = auth.uid());

-- 4) Storage bucket (v SQL editoru nejde volat storage.create_bucket dle plánu z UI; vytvoř ručně v dashboardu jako `collabs`, public read, a přidej tyto policies v SQL editoru storage):
-- Pro bucket 'collabs':
--   insert into storage.policies (bucket_id, name, definition, action) ...
-- Nebo jednoduše v UI nastav: Read = public, Upload = authenticated, s prefixem user_id/… (doporučeno).


-- ---------------------------------------------------------------------------
-- Project access control: request/approve private previews
-- ---------------------------------------------------------------------------

-- 1) Schéma
alter table if exists public.projects
  add column if not exists access_mode text not null default 'public' check (access_mode in ('public','request','private'));

-- Pádově sjednotíme typy: použijeme %TYPE z public.projects.id, abychom se trefili do skutečného typu (bigint/uuid).
drop table if exists public.project_access_requests cascade;
drop table if exists public.project_access_grants cascade;

create table public.project_access_requests (
  id uuid primary key default gen_random_uuid(),
  project_id public.projects.id%TYPE not null references public.projects (id) on delete cascade,
  requester_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','approved','denied')),
  message text,
  decided_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.project_access_grants (
  id uuid primary key default gen_random_uuid(),
  project_id public.projects.id%TYPE not null references public.projects (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  granted_by uuid not null references auth.users (id) on delete cascade,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  unique (project_id, user_id)
);

create or replace function public.project_access_touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trg_project_access_requests_touch on public.project_access_requests;
create trigger trg_project_access_requests_touch
before update on public.project_access_requests
for each row execute function public.project_access_touch_updated_at();

-- 2) Helper funkce
create or replace function public.is_project_owner(pid public.projects.id%TYPE)
returns boolean language sql stable as $$
  select exists (select 1 from public.projects p where p.id = pid and p.user_id = auth.uid());
$$;

create or replace function public.has_project_grant(pid public.projects.id%TYPE)
returns boolean language sql stable as $$
  select exists (
    select 1 from public.project_access_grants g
    where g.project_id = pid
      and g.user_id = auth.uid()
      and (g.expires_at is null or g.expires_at > now())
  );
$$;

create or replace function public.can_view_project(pid public.projects.id%TYPE)
returns boolean language sql stable as $$
  select exists (select 1 from public.projects p where p.id = pid and p.access_mode = 'public')
    or public.is_project_owner(pid)
    or public.has_project_grant(pid);
$$;

-- 3) RLS
alter table public.projects enable row level security;
alter table public.project_access_requests enable row level security;
alter table public.project_access_grants enable row level security;

-- Projekty: metadata mohou vidět owner, public, držitel grantu a request mode (aby mohl podat žádost)
drop policy if exists "projects_select_access" on public.projects;
create policy "projects_select_access"
on public.projects
for select
using (
  access_mode = 'public'
  or access_mode = 'request'
  or public.is_project_owner(id)
  or public.has_project_grant(id)
);

drop policy if exists "projects_insert_owner" on public.projects;
create policy "projects_insert_owner"
on public.projects
for insert
with check (user_id = auth.uid());

drop policy if exists "projects_update_owner" on public.projects;
create policy "projects_update_owner"
on public.projects
for update
using (user_id = auth.uid());

drop policy if exists "projects_delete_owner" on public.projects;
create policy "projects_delete_owner"
on public.projects
for delete
using (user_id = auth.uid());

-- Requests: číst může owner projektu nebo requester
drop policy if exists "project_access_requests_select" on public.project_access_requests;
create policy "project_access_requests_select"
on public.project_access_requests
for select
using (
  requester_id = auth.uid()
  or public.is_project_owner(project_id)
);

drop policy if exists "project_access_requests_insert" on public.project_access_requests;
create policy "project_access_requests_insert"
on public.project_access_requests
for insert
with check (
  requester_id = auth.uid()
  and exists (select 1 from public.projects p where p.id = project_id and p.access_mode in ('request','private'))
);

-- Aktualizovat (approve/deny) může owner projektu
drop policy if exists "project_access_requests_update" on public.project_access_requests;
create policy "project_access_requests_update"
on public.project_access_requests
for update
using (public.is_project_owner(project_id))
with check (public.is_project_owner(project_id));

-- Grants: číst může owner nebo držitel
drop policy if exists "project_access_grants_select" on public.project_access_grants;
create policy "project_access_grants_select"
on public.project_access_grants
for select
using (
  user_id = auth.uid()
  or public.is_project_owner(project_id)
);

-- Přidat grant může jen owner projektu
drop policy if exists "project_access_grants_insert" on public.project_access_grants;
create policy "project_access_grants_insert"
on public.project_access_grants
for insert
with check (public.is_project_owner(project_id));

-- Odebrat grant může owner projektu
drop policy if exists "project_access_grants_delete" on public.project_access_grants;
create policy "project_access_grants_delete"
on public.project_access_grants
for delete
using (public.is_project_owner(project_id));

-- Projects: ponecháváme existující politiky; pro náhled chráněných projektů přidej (pokud ještě nejsou) selekt policy:
-- create policy "projects_select_access" on public.projects for select using (public.can_view_project(id) or access_mode = 'request');
-- nebo ručně uprav dle stávajícího nastavení.

-- ---------------------------------------------------------------------------
-- Veřejné profily – zpřístupnit čtení display_name/hardware/avatar pro anyone
-- ---------------------------------------------------------------------------
alter table if exists public.profiles enable row level security;

drop policy if exists "profiles_public_select" on public.profiles;
create policy "profiles_public_select"
on public.profiles
for select
using (true);

-- Vložit/aktualizovat/mazat ponecháváme pod existujícími pravidly Supabase (typicky jen owner).
