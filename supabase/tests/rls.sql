-- RLS test plan for the owner-only + aal2 model.
-- These commands are intentionally not run in this workspace. not run

-- 1) anon can read only published rows and cannot insert or update anything
SELECT 'anon-can-read-published';
-- psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -c "set role anon; select * from public.skills where published = true limit 1;"
-- psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -c "set role anon; insert into public.skills (name, proficiency, label, published) values ('anon-test', 50, 'Test', true);"

-- 2) aal1 owner can read only published rows but cannot write or read unpublished data
SELECT 'aal1-owner-read-published-only';
-- psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -c "set role authenticated; select set_config('request.jwt.claims', '{\"sub\":\"<OWNER_UUID>\",\"aal\":\"aal1\"}', true); select * from public.certificates where published = true limit 1;"
-- psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -c "set role authenticated; select set_config('request.jwt.claims', '{\"sub\":\"<OWNER_UUID>\",\"aal\":\"aal1\"}', true); select * from public.certificates where published = false limit 1;"
-- psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -c "set role authenticated; select set_config('request.jwt.claims', '{\"sub\":\"<OWNER_UUID>\",\"aal\":\"aal1\"}', true); update public.site_settings set value = 'denied' where key = 'brand';"

-- 3) non-owner authenticated user cannot read unpublished data or write content
SELECT 'non-owner-user-denied';
-- psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -c "set role authenticated; select set_config('request.jwt.claims', '{\"sub\":\"<NON_OWNER_UUID>\",\"aal\":\"aal2\"}', true); select * from public.profile limit 1;"
-- psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -c "set role authenticated; select set_config('request.jwt.claims', '{\"sub\":\"<NON_OWNER_UUID>\",\"aal\":\"aal2\"}', true); insert into public.skills (name, proficiency, label, published) values ('non-owner-test', 80, 'Test', true);"

-- 4) aal2 owner can read and write content, including unpublished rows
SELECT 'aal2-owner-full-access';
-- psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -c "set role authenticated; select set_config('request.jwt.claims', '{\"sub\":\"<OWNER_UUID>\",\"aal\":\"aal2\"}', true); select * from public.site_settings limit 1;"
-- psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -c "set role authenticated; select set_config('request.jwt.claims', '{\"sub\":\"<OWNER_UUID>\",\"aal\":\"aal2\"}', true); insert into public.site_settings (key, value, published) values ('rls-test', 'ok', false);"
-- psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -c "set role authenticated; select set_config('request.jwt.claims', '{\"sub\":\"<OWNER_UUID>\",\"aal\":\"aal2\"}', true); update public.site_settings set value = 'updated' where key = 'rls-test';"

-- 5) message table remains private to owner + aal2 and has no public insert policy
SELECT 'messages-private';
-- psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -c "set role anon; insert into public.messages (name, email, message) values ('anon', 'anon@example.com', 'blocked');"
-- psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -c "set role authenticated; select set_config('request.jwt.claims', '{\"sub\":\"<OWNER_UUID>\",\"aal\":\"aal2\"}', true); select * from public.messages limit 1;"
