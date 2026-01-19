-- Konvertor storage bucket + policy for uploads
insert into storage.buckets (id, name, public)
values ('konvertor', 'konvertor', false)
on conflict (id) do nothing;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'konvertor_insert_any'
  ) then
    create policy konvertor_insert_any
      on storage.objects
      for insert
      to anon, authenticated
      with check (bucket_id = 'konvertor');
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'konvertor_read_any'
  ) then
    create policy konvertor_read_any
      on storage.objects
      for select
      to anon, authenticated
      using (bucket_id = 'konvertor');
  end if;
end $$;
