-- Přidá roli uživatele do profilu
alter table public.profiles
  add column if not exists role text
  check (role in ('superadmin','admin','creator','mc'))
  default 'creator';

-- U starších záznamů doplň default
update public.profiles
set role = 'creator'
where role is null;
