-- Přidá sloupec region (kraj) do profilu
alter table public.profiles
  add column if not exists region text;

-- Pokud je vyplněné staré pole city, přenes ho jako výchozí region (volitelné)
update public.profiles
set region = city
where region is null and city is not null;
