insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'public-media',
  'public-media',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'font/woff2']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

grant select (id, key, value, published, updated_at) on public.site_settings to anon, authenticated;
grant insert, update, delete on public.site_settings to authenticated;
grant select on public.published_sections to anon, authenticated;

drop policy if exists "portfolio media is publicly readable" on storage.objects;
create policy "portfolio media is publicly readable"
on storage.objects for select
using (bucket_id = 'public-media');

drop policy if exists "portfolio media uploads require owner and aal2" on storage.objects;
create policy "portfolio media uploads require owner and aal2"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'public-media'
  and public.is_owner()
  and (select auth.jwt()->>'aal') = 'aal2'
);

drop policy if exists "portfolio media updates require owner and aal2" on storage.objects;
create policy "portfolio media updates require owner and aal2"
on storage.objects for update to authenticated
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

drop policy if exists "portfolio media deletes require owner and aal2" on storage.objects;
create policy "portfolio media deletes require owner and aal2"
on storage.objects for delete to authenticated
using (
  bucket_id = 'public-media'
  and public.is_owner()
  and (select auth.jwt()->>'aal') = 'aal2'
);
