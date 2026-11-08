create or replace function public.is_owner()
returns boolean
language sql
stable
security definer
set search_path = public, pg_catalog
as $$
  select exists (
    select 1 from public.app_owner where id = auth.uid()
  );
$$;

revoke all on function public.is_owner() from public;
grant execute on function public.is_owner() to authenticated;

create view public.published_skills with (security_invoker = true) as
select id, name, proficiency, label, published, updated_at
from public.skills
where published = true;

create view public.published_certificates with (security_invoker = true) as
select id, title, type, issuer, date_earned, verify_url, public_file, published, updated_at
from public.certificates
where published = true;

create view public.published_projects with (security_invoker = true) as
select id, title, summary, purpose, role, technologies, features, contributions, project_url, source_url, published, updated_at
from public.projects
where published = true;

create view public.published_sections with (security_invoker = true) as
select id, key, value, published, updated_at
from public.site_settings
where published = true;

alter table public.app_owner enable row level security;
alter table public.site_settings enable row level security;
alter table public.profile enable row level security;
alter table public.skills enable row level security;
alter table public.certificates enable row level security;
alter table public.eligibility enable row level security;
alter table public.experience enable row level security;
alter table public.projects enable row level security;
alter table public.project_images enable row level security;
alter table public.education enable row level security;
alter table public.security_items enable row level security;
alter table public.messages enable row level security;
alter table public.resume_versions enable row level security;
alter table public.media enable row level security;
alter table public.audit_log enable row level security;
alter table public.content_versions enable row level security;
alter table public.contact_rate_limits enable row level security;

create policy "Published rows are readable by anon and auth" on public.site_settings for select using (published = true);
create policy "Owner and aal2 can read unpublished site settings" on public.site_settings for select using (public.is_owner() and (select auth.jwt()->>'aal') = 'aal2');
create policy "Owner manages site settings" on public.site_settings for all using (public.is_owner() and (select auth.jwt()->>'aal') = 'aal2') with check (public.is_owner() and (select auth.jwt()->>'aal') = 'aal2');
create policy "Published rows are readable by anon and auth" on public.profile for select using (published = true);
create policy "Owner and aal2 can read unpublished profile" on public.profile for select using (public.is_owner() and (select auth.jwt()->>'aal') = 'aal2');
create policy "Owner manages profile" on public.profile for all using (public.is_owner() and (select auth.jwt()->>'aal') = 'aal2') with check (public.is_owner() and (select auth.jwt()->>'aal') = 'aal2');
create policy "Published rows are readable by anon and auth" on public.skills for select using (published = true);
create policy "Owner and aal2 can read unpublished skills" on public.skills for select using (public.is_owner() and (select auth.jwt()->>'aal') = 'aal2');
create policy "Owner manages skills" on public.skills for all using (public.is_owner() and (select auth.jwt()->>'aal') = 'aal2') with check (public.is_owner() and (select auth.jwt()->>'aal') = 'aal2');
create policy "Published rows are readable by anon and auth" on public.certificates for select using (published = true);
create policy "Owner and aal2 can read unpublished certificates" on public.certificates for select using (public.is_owner() and (select auth.jwt()->>'aal') = 'aal2');
create policy "Owner manages certificates" on public.certificates for all using (public.is_owner() and (select auth.jwt()->>'aal') = 'aal2') with check (public.is_owner() and (select auth.jwt()->>'aal') = 'aal2');
create policy "Published rows are readable by anon and auth" on public.eligibility for select using (published = true);
create policy "Owner and aal2 can read unpublished eligibility" on public.eligibility for select using (public.is_owner() and (select auth.jwt()->>'aal') = 'aal2');
create policy "Owner manages eligibility" on public.eligibility for all using (public.is_owner() and (select auth.jwt()->>'aal') = 'aal2') with check (public.is_owner() and (select auth.jwt()->>'aal') = 'aal2');
create policy "Published rows are readable by anon and auth" on public.experience for select using (published = true);
create policy "Owner and aal2 can read unpublished experience" on public.experience for select using (public.is_owner() and (select auth.jwt()->>'aal') = 'aal2');
create policy "Owner manages experience" on public.experience for all using (public.is_owner() and (select auth.jwt()->>'aal') = 'aal2') with check (public.is_owner() and (select auth.jwt()->>'aal') = 'aal2');
create policy "Published rows are readable by anon and auth" on public.projects for select using (published = true);
create policy "Owner and aal2 can read unpublished projects" on public.projects for select using (public.is_owner() and (select auth.jwt()->>'aal') = 'aal2');
create policy "Owner manages projects" on public.projects for all using (public.is_owner() and (select auth.jwt()->>'aal') = 'aal2') with check (public.is_owner() and (select auth.jwt()->>'aal') = 'aal2');
create policy "Published rows are readable by anon and auth" on public.project_images for select using (published = true);
create policy "Owner and aal2 can read unpublished project images" on public.project_images for select using (public.is_owner() and (select auth.jwt()->>'aal') = 'aal2');
create policy "Owner manages project images" on public.project_images for all using (public.is_owner() and (select auth.jwt()->>'aal') = 'aal2') with check (public.is_owner() and (select auth.jwt()->>'aal') = 'aal2');
create policy "Published rows are readable by anon and auth" on public.education for select using (published = true);
create policy "Owner and aal2 can read unpublished education" on public.education for select using (public.is_owner() and (select auth.jwt()->>'aal') = 'aal2');
create policy "Owner manages education" on public.education for all using (public.is_owner() and (select auth.jwt()->>'aal') = 'aal2') with check (public.is_owner() and (select auth.jwt()->>'aal') = 'aal2');
create policy "Published rows are readable by anon and auth" on public.security_items for select using (published = true);
create policy "Owner and aal2 can read unpublished security items" on public.security_items for select using (public.is_owner() and (select auth.jwt()->>'aal') = 'aal2');
create policy "Owner manages security items" on public.security_items for all using (public.is_owner() and (select auth.jwt()->>'aal') = 'aal2') with check (public.is_owner() and (select auth.jwt()->>'aal') = 'aal2');
create policy "Owner and aal2 can read unpublished content versions" on public.content_versions for select using (public.is_owner() and (select auth.jwt()->>'aal') = 'aal2');
create policy "Owner manages content versions" on public.content_versions for all using (public.is_owner() and (select auth.jwt()->>'aal') = 'aal2') with check (public.is_owner() and (select auth.jwt()->>'aal') = 'aal2');
create policy "Owner and aal2 can read unpublished resume versions" on public.resume_versions for select using (public.is_owner() and (select auth.jwt()->>'aal') = 'aal2');
create policy "Owner manages resume versions" on public.resume_versions for all using (public.is_owner() and (select auth.jwt()->>'aal') = 'aal2') with check (public.is_owner() and (select auth.jwt()->>'aal') = 'aal2');
create policy "Owner and aal2 can read unpublished media" on public.media for select using (public.is_owner() and (select auth.jwt()->>'aal') = 'aal2');
create policy "Owner manages media" on public.media for all using (public.is_owner() and (select auth.jwt()->>'aal') = 'aal2') with check (public.is_owner() and (select auth.jwt()->>'aal') = 'aal2');
create policy "Owner reads auditable events" on public.audit_log for select using (public.is_owner() and (select auth.jwt()->>'aal') = 'aal2');
create policy "Owner appends audit events" on public.audit_log for insert with check (public.is_owner() and (select auth.jwt()->>'aal') = 'aal2');
create policy "Owner cannot update or delete audit log" on public.audit_log for update using (false) with check (false);
create policy "Owner cannot update or delete audit log" on public.audit_log for delete using (false);
create policy "Messages require owner and aal2 for reads and updates" on public.messages for select using (public.is_owner() and (select auth.jwt()->>'aal') = 'aal2');
create policy "Messages require owner and aal2 for updates" on public.messages for update using (public.is_owner() and (select auth.jwt()->>'aal') = 'aal2') with check (public.is_owner() and (select auth.jwt()->>'aal') = 'aal2');
create policy "Messages require owner and aal2 for deletes" on public.messages for delete using (public.is_owner() and (select auth.jwt()->>'aal') = 'aal2');
create policy "No direct message inserts" on public.messages for insert with check (false);
create policy "Contact rate limit records are service-role only" on public.contact_rate_limits for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
create policy "Owner and aal2 can manage app_owner" on public.app_owner for all using (public.is_owner() and (select auth.jwt()->>'aal') = 'aal2') with check (public.is_owner() and (select auth.jwt()->>'aal') = 'aal2');
