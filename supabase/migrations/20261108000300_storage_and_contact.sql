insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'originals',
  'originals',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'font/woff2']
)
on conflict (id) do update
set name = excluded.name,
    public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'public-media',
  'public-media',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'font/woff2']
)
on conflict (id) do update
set name = excluded.name,
    public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "portfolio originals owner and aal2" on storage.objects;
create policy "portfolio originals owner and aal2"
on storage.objects for all to authenticated
using (
  bucket_id = 'originals'
  and public.is_owner()
  and (select auth.jwt()->>'aal') = 'aal2'
)
with check (
  bucket_id = 'originals'
  and public.is_owner()
  and (select auth.jwt()->>'aal') = 'aal2'
);

drop policy if exists "portfolio public media owner and aal2" on storage.objects;
create policy "portfolio public media owner and aal2"
on storage.objects for all to authenticated
using (
  bucket_id = 'public-media'
  and public.is_owner()
  and (select auth.jwt()->>'aal') = 'aal2'
)
with check (
  bucket_id = 'public-media'
  and public.is_owner()
  and (select auth.jwt()->>'aal') = 'aal2'
);
