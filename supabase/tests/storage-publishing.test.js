import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const migration = async (name) =>
  readFile(new URL(`../migrations/${name}`, import.meta.url), 'utf8');

test('storage buckets separate private originals from public publication copies', async () => {
  const sql = await migration('20261108000300_storage_and_contact.sql');
  assert.match(sql, /'originals',\s*'originals',\s*false/i);
  assert.match(sql, /'public-media',\s*'public-media',\s*true/i);
  assert.match(sql, /create policy "portfolio originals owner and aal2"[\s\S]*?to authenticated[\s\S]*?bucket_id = 'originals'[\s\S]*?public\.is_owner\(\)[\s\S]*?aal2/i);
  assert.match(sql, /create policy "portfolio public media owner and aal2"[\s\S]*?to authenticated[\s\S]*?bucket_id = 'public-media'[\s\S]*?public\.is_owner\(\)[\s\S]*?aal2/i);
});

test('unauthorized and AAL1 users cannot upload to either bucket', async () => {
  const sql = await migration('20261108000300_storage_and_contact.sql');
  for (const bucket of ['originals', 'public-media']) {
    const policy = sql.match(
      new RegExp(`create policy "portfolio ${bucket === 'originals' ? 'originals' : 'public media'} owner and aal2"[\\s\\S]*?;`, 'i'),
    )?.[0];
    assert.ok(policy, `expected owner-only ${bucket} policy`);
    assert.match(policy, /for all to authenticated/i);
    assert.match(policy, /public\.is_owner\(\)/i);
    assert.match(policy, /auth\.jwt\(\)->>'aal'\) = 'aal2'/i);
  }
});

test('public object listing is not granted to anonymous users', async () => {
  const [storage, grants, rls] = await Promise.all([
    migration('20261108000300_storage_and_contact.sql'),
    migration('20261108000400_portfolio_media.sql'),
    migration('20261108000200_rls_and_views.sql'),
  ]);
  assert.doesNotMatch(storage, /for select[\s\S]*?to anon[\s\S]*?bucket_id = 'public-media'/i);
  assert.match(grants, /drop policy if exists "portfolio media is publicly readable"/i);
  assert.match(grants, /grant select on table public\.published_sections to anon, authenticated/i);
  assert.match(rls, /create or replace view public\.published_sections with \(security_invoker = true\)/i);
  for (const view of ['published_skills', 'published_certificates', 'published_projects']) {
    assert.match(grants, new RegExp(`revoke all on table public\\.${view} from public, anon, authenticated`, 'i'));
    assert.doesNotMatch(grants, new RegExp(`grant select on table public\\.${view}`, 'i'));
  }
});

test('owner audit history and RLS safeguards remain in the migrations', async () => {
  const [core, rls] = await Promise.all([
    migration('20261108000100_core_schema.sql'),
    migration('20261108000200_rls_and_views.sql'),
  ]);
  assert.match(core, /create table if not exists public\.audit_log/i);
  assert.match(core, /create table if not exists public\.content_versions/i);
  assert.match(rls, /create policy "Owner reads auditable events"[\s\S]*?public\.is_owner\(\)[\s\S]*?aal2/i);
  assert.match(rls, /create policy "Owner cannot update audit log" on public\.audit_log for update using \(false\)/i);
  assert.match(rls, /create policy "Owner cannot delete audit log" on public\.audit_log for delete using \(false\)/i);
});

test('SQL migrations are structured for safe reapplication', async () => {
  const [core, rls, storage, grants, cleanup] = await Promise.all([
    migration('20261108000100_core_schema.sql'),
    migration('20261108000200_rls_and_views.sql'),
    migration('20261108000300_storage_and_contact.sql'),
    migration('20261108000400_portfolio_media.sql'),
    migration('20261108000500_public_asset_cleanup_queue.sql'),
  ]);
  assert.match(core, /drop trigger if exists skills_set_updated_at/i);
  assert.match(rls, /create or replace view public\.published_sections/i);
  assert.match(rls, /drop policy if exists %I on %I\.%I/i);
  assert.match(storage, /on conflict \(id\) do update/i);
  assert.match(storage, /drop policy if exists "portfolio originals owner and aal2"/i);
  assert.match(grants, /revoke all on table public\.site_settings/i);
  assert.match(cleanup, /create table if not exists public\.public_asset_cleanup_queue/i);
  assert.match(cleanup, /drop trigger if exists site_settings_public_assets_guard/i);
  assert.match(cleanup, /drop policy if exists "Portfolio cleanup queue owner aal2 reads"/i);
  assert.match(cleanup, /public\.is_owner\(\)[\s\S]*?auth\.jwt\(\)->>'aal'\) = 'aal2'/i);
});

test('cleanup queue migration protects queued assets during concurrent publication', async () => {
  const cleanup = await migration('20261108000500_public_asset_cleanup_queue.sql');
  assert.match(cleanup, /alter table public\.public_asset_cleanup_queue enable row level security/i);
  assert.match(cleanup, /grant select, insert, delete on table public\.public_asset_cleanup_queue to authenticated/i);
  assert.match(cleanup, /for select to authenticated[\s\S]*?public\.is_owner\(\)[\s\S]*?aal2/i);
  assert.match(cleanup, /for insert to authenticated[\s\S]*?public\.is_owner\(\)[\s\S]*?aal2/i);
  assert.match(cleanup, /for delete to authenticated[\s\S]*?public\.is_owner\(\)[\s\S]*?aal2/i);
  assert.match(cleanup, /before insert or update on public\.site_settings/i);
  assert.match(cleanup, /queued for cleanup/i);
  assert.match(cleanup, /storage\.objects/i);
});

test('legacy inventory tool requires owner authentication and explicit per-object review', async () => {
  const script = await readFile(new URL('../../scripts/reconcile-public-media.mjs', import.meta.url), 'utf8');
  assert.match(script, /signInWithPassword/);
  assert.match(script, /auth\.mfa\.verify/);
  assert.match(script, /from\('app_owner'\)/);
  assert.match(script, /listPublicMediaInventoryWithClient/);
  assert.match(script, /\[K\]eep public \/ \[M\]ove to private originals \/ \[S\]kip/);
  assert.doesNotMatch(script, /SUPABASE_SERVICE_ROLE_KEY/);
});
