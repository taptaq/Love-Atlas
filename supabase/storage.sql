-- Storage bucket and policies for present-moment image uploads.
-- Run this once in Supabase Dashboard -> SQL Editor for the active project.

insert into storage.buckets (id, name, public)
values ('present-moment', 'present-moment', true)
on conflict (id) do update
set name = excluded.name,
    public = excluded.public;

drop policy if exists "present-moment-upload" on storage.objects;
create policy "present-moment-upload"
on storage.objects for insert
to authenticated
with check (bucket_id = 'present-moment');

drop policy if exists "present-moment-read" on storage.objects;
create policy "present-moment-read"
on storage.objects for select
to public
using (bucket_id = 'present-moment');

drop policy if exists "present-moment-update-owner" on storage.objects;
create policy "present-moment-update-owner"
on storage.objects for update
to authenticated
using (
  bucket_id = 'present-moment'
  and owner = auth.uid()
)
with check (
  bucket_id = 'present-moment'
  and owner = auth.uid()
);

drop policy if exists "present-moment-delete-owner" on storage.objects;
create policy "present-moment-delete-owner"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'present-moment'
  and owner = auth.uid()
);
