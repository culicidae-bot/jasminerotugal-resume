create table if not exists public.public_asset_cleanup_queue (
  storage_path text primary key,
  created_at timestamptz not null default now(),
  constraint public_asset_cleanup_queue_valid_path check (
    storage_path <> ''
    and storage_path !~ '^/'
    and storage_path not like '%//%'
    and storage_path !~ '(^|/)\.\.?(/|$)'
    and position(chr(92) in storage_path) = 0
  )
);

create or replace function public.guard_published_public_assets()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  asset_match record;
begin
  if new.published then
    if exists (
      select 1
      from public.public_asset_cleanup_queue queue
      where position(queue.storage_path in new.value) > 0
    ) then
      raise exception 'A published asset is currently queued for cleanup.';
    end if;

    for asset_match in
      select regexp_matches(
        new.value,
        '/storage/v1/object/public/public-media/([^"?#]+)',
        'g'
      ) as captures
    loop
      if not exists (
        select 1
        from storage.objects object
        where object.bucket_id = 'public-media'
          and object.name = asset_match.captures[1]
      ) then
        raise exception 'A published public-media object does not exist.';
      end if;
    end loop;
  end if;
  return new;
end;
$$;

revoke all on function public.guard_published_public_assets() from public, anon, authenticated;

drop trigger if exists site_settings_public_assets_guard on public.site_settings;
create trigger site_settings_public_assets_guard
before insert or update on public.site_settings
for each row execute function public.guard_published_public_assets();

alter table public.public_asset_cleanup_queue enable row level security;

revoke all on table public.public_asset_cleanup_queue from public, anon, authenticated;
grant select, insert, delete on table public.public_asset_cleanup_queue to authenticated;

drop policy if exists "Portfolio cleanup queue owner aal2 reads" on public.public_asset_cleanup_queue;
create policy "Portfolio cleanup queue owner aal2 reads"
on public.public_asset_cleanup_queue for select to authenticated
using (public.is_owner() and (select auth.jwt()->>'aal') = 'aal2');

drop policy if exists "Portfolio cleanup queue owner aal2 inserts" on public.public_asset_cleanup_queue;
create policy "Portfolio cleanup queue owner aal2 inserts"
on public.public_asset_cleanup_queue for insert to authenticated
with check (public.is_owner() and (select auth.jwt()->>'aal') = 'aal2');

drop policy if exists "Portfolio cleanup queue owner aal2 deletes" on public.public_asset_cleanup_queue;
create policy "Portfolio cleanup queue owner aal2 deletes"
on public.public_asset_cleanup_queue for delete to authenticated
using (public.is_owner() and (select auth.jwt()->>'aal') = 'aal2');
