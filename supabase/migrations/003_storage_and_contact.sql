-- Storage configuration (not run here; apply in the Supabase dashboard SQL editor or CLI)

-- Bucket setup
-- insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
-- values ('originals', 'originals', false, 10485760, ARRAY['application/pdf','image/jpeg','image/png','image/webp']);
-- insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
-- values ('public-media', 'public-media', true, 2097152, ARRAY['image/jpeg','image/png','image/webp','font/woff2','application/pdf']);

-- Bucket policies
-- create policy "private originals are owner-only" on storage.objects for all using (bucket_id = 'originals' and public.is_owner() and (select auth.jwt()->>'aal') = 'aal2') with check (bucket_id = 'originals' and public.is_owner() and (select auth.jwt()->>'aal') = 'aal2');
-- create policy "public media is readable without auth" on storage.objects for select using (bucket_id = 'public-media');
-- create policy "public media writes require owner and aal2" on storage.objects for insert with check (bucket_id = 'public-media' and public.is_owner() and (select auth.jwt()->>'aal') = 'aal2');
-- create policy "public media updates require owner and aal2" on storage.objects for update using (bucket_id = 'public-media' and public.is_owner() and (select auth.jwt()->>'aal') = 'aal2') with check (bucket_id = 'public-media' and public.is_owner() and (select auth.jwt()->>'aal') = 'aal2');

-- Edge function contract:
-- POST /functions/v1/contact
-- Body: { name, email, message, subject, honeypot }
-- Response: { ok: true, message: 'Your message was sent' }
-- No direct error details exposed to the browser.
