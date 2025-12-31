alter table projects
add column if not exists release_formats text[],
add column if not exists purchase_url text;
