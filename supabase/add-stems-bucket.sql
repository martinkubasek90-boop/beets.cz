insert into storage.buckets (id, name, public)
values ('stems', 'stems', false)
on conflict (id) do nothing;

create policy "stems_insert_own" on storage.objects
for insert to authenticated
with check (
  bucket_id = 'stems'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "stems_select_own" on storage.objects
for select to authenticated
using (
  bucket_id = 'stems'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "stems_delete_own" on storage.objects
for delete to authenticated
using (
  bucket_id = 'stems'
  and auth.uid()::text = (storage.foldername(name))[1]
);
