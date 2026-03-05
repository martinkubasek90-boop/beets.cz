create extension if not exists pgcrypto;

create table if not exists public.bess_knowledge_sources (
  id uuid primary key default gen_random_uuid(),
  namespace text not null default 'bess',
  source_type text not null check (source_type in ('url', 'text')),
  source_label text,
  source_url text,
  content text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.bess_knowledge_chunks (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.bess_knowledge_sources(id) on delete cascade,
  chunk_index integer not null,
  chunk_text text not null,
  token_count integer,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_bess_knowledge_sources_namespace on public.bess_knowledge_sources(namespace);
create index if not exists idx_bess_knowledge_chunks_source_id on public.bess_knowledge_chunks(source_id);
create index if not exists idx_bess_knowledge_chunks_created_at on public.bess_knowledge_chunks(created_at desc);

alter table public.bess_knowledge_sources enable row level security;
alter table public.bess_knowledge_chunks enable row level security;

create table if not exists public.bess_admin_config (
  id text primary key,
  config jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

insert into public.bess_admin_config (id, config)
values ('default', '{}'::jsonb)
on conflict (id) do nothing;

alter table public.bess_admin_config enable row level security;
