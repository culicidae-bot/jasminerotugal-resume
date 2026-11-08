drop policy if exists "portfolio media is publicly readable" on storage.objects;
drop policy if exists "portfolio media uploads require owner and aal2" on storage.objects;
drop policy if exists "portfolio media updates require owner and aal2" on storage.objects;
drop policy if exists "portfolio media deletes require owner and aal2" on storage.objects;

revoke all on table public.site_settings from public, anon, authenticated;
revoke select (id, key, value, published, updated_at) on table public.site_settings from public, anon, authenticated;
revoke insert (key, value, published) on table public.site_settings from public, anon, authenticated;
revoke update (key, value, published) on table public.site_settings from public, anon, authenticated;

grant select (id, key, value, published, updated_at) on table public.site_settings to anon, authenticated;
grant insert (key, value, published) on table public.site_settings to authenticated;
grant update (key, value, published) on table public.site_settings to authenticated;
grant delete on table public.site_settings to authenticated;

revoke all on table public.published_skills from public, anon, authenticated;
revoke all on table public.published_certificates from public, anon, authenticated;
revoke all on table public.published_projects from public, anon, authenticated;
revoke all on table public.published_sections from public, anon, authenticated;
grant select on table public.published_sections to anon, authenticated;
