create extension if not exists pgcrypto;

create table if not exists public.app_owner (
  id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.site_settings (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  value text not null,
  published boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists public.profile (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.app_owner(id) on delete cascade,
  display_name text,
  email text,
  bio text,
  published boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists public.skills (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  proficiency integer not null default 0 check (proficiency between 0 and 100),
  label text,
  published boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists public.certificates (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  type text not null,
  issuer text not null,
  date_earned date,
  verify_url text,
  public_file text,
  sha256 text,
  original_path text,
  published boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists public.eligibility (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  issuer text,
  conferment_date date,
  extra text,
  published boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists public.experience (
  id uuid primary key default gen_random_uuid(),
  category text not null check (category in ('work', 'internship', 'volunteer')),
  title text not null,
  employer text,
  start_date date,
  end_date date,
  summary text,
  responsibilities text[],
  accomplishments text[],
  published boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  summary text,
  purpose text,
  role text,
  technologies text[],
  features text[],
  contributions text[],
  project_url text,
  source_url text,
  published boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists public.project_images (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  caption text,
  image_path text not null,
  published boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists public.education (
  id uuid primary key default gen_random_uuid(),
  level text not null,
  institution text,
  course text,
  year_graduated text,
  achievement text,
  published boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists public.security_items (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  url text,
  kind text not null default 'profile',
  published boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  message text not null,
  read_at timestamptz,
  archived boolean not null default false,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.resume_versions (
  id uuid primary key default gen_random_uuid(),
  version_label text,
  storage_path text not null,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.media (
  id uuid primary key default gen_random_uuid(),
  label text,
  bucket text not null,
  path text not null,
  mime_type text,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.app_owner(id),
  action text not null,
  table_name text,
  record_id uuid,
  payload jsonb not null default '{}'::jsonb,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.content_versions (
  id uuid primary key default gen_random_uuid(),
  table_name text not null,
  row_id uuid not null,
  action text not null,
  diff jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.contact_rate_limits (
  id uuid primary key default gen_random_uuid(),
  ip_hash text not null,
  created_at timestamptz not null default now(),
  route text not null default '/functions/v1/contact'
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_catalog
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.record_content_version()
returns trigger
language plpgsql
set search_path = public, pg_catalog
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.content_versions (table_name, row_id, action, diff)
    values (tg_table_name, new.id, 'insert', to_jsonb(new));
    return new;
  elsif tg_op = 'UPDATE' then
    insert into public.content_versions (table_name, row_id, action, diff)
    values (tg_table_name, new.id, 'update', jsonb_build_object('before', to_jsonb(old), 'after', to_jsonb(new)));
    return new;
  end if;
  return new;
end;
$$;

drop trigger if exists skills_set_updated_at on public.skills;
create trigger skills_set_updated_at before update on public.skills for each row execute function public.set_updated_at();
drop trigger if exists skills_record_version on public.skills;
create trigger skills_record_version after insert or update on public.skills for each row execute function public.record_content_version();
drop trigger if exists certificates_set_updated_at on public.certificates;
create trigger certificates_set_updated_at before update on public.certificates for each row execute function public.set_updated_at();
drop trigger if exists certificates_record_version on public.certificates;
create trigger certificates_record_version after insert or update on public.certificates for each row execute function public.record_content_version();
drop trigger if exists site_settings_set_updated_at on public.site_settings;
create trigger site_settings_set_updated_at before update on public.site_settings for each row execute function public.set_updated_at();
drop trigger if exists site_settings_record_version on public.site_settings;
create trigger site_settings_record_version after insert or update on public.site_settings for each row execute function public.record_content_version();
drop trigger if exists profile_set_updated_at on public.profile;
create trigger profile_set_updated_at before update on public.profile for each row execute function public.set_updated_at();
drop trigger if exists profile_record_version on public.profile;
create trigger profile_record_version after insert or update on public.profile for each row execute function public.record_content_version();
drop trigger if exists eligibility_set_updated_at on public.eligibility;
create trigger eligibility_set_updated_at before update on public.eligibility for each row execute function public.set_updated_at();
drop trigger if exists eligibility_record_version on public.eligibility;
create trigger eligibility_record_version after insert or update on public.eligibility for each row execute function public.record_content_version();
drop trigger if exists experience_set_updated_at on public.experience;
create trigger experience_set_updated_at before update on public.experience for each row execute function public.set_updated_at();
drop trigger if exists experience_record_version on public.experience;
create trigger experience_record_version after insert or update on public.experience for each row execute function public.record_content_version();
drop trigger if exists projects_set_updated_at on public.projects;
create trigger projects_set_updated_at before update on public.projects for each row execute function public.set_updated_at();
drop trigger if exists projects_record_version on public.projects;
create trigger projects_record_version after insert or update on public.projects for each row execute function public.record_content_version();
drop trigger if exists project_images_set_updated_at on public.project_images;
create trigger project_images_set_updated_at before update on public.project_images for each row execute function public.set_updated_at();
drop trigger if exists project_images_record_version on public.project_images;
create trigger project_images_record_version after insert or update on public.project_images for each row execute function public.record_content_version();
drop trigger if exists education_set_updated_at on public.education;
create trigger education_set_updated_at before update on public.education for each row execute function public.set_updated_at();
drop trigger if exists education_record_version on public.education;
create trigger education_record_version after insert or update on public.education for each row execute function public.record_content_version();
drop trigger if exists security_items_set_updated_at on public.security_items;
create trigger security_items_set_updated_at before update on public.security_items for each row execute function public.set_updated_at();
drop trigger if exists security_items_record_version on public.security_items;
create trigger security_items_record_version after insert or update on public.security_items for each row execute function public.record_content_version();
drop trigger if exists messages_set_updated_at on public.messages;
create trigger messages_set_updated_at before update on public.messages for each row execute function public.set_updated_at();
drop trigger if exists messages_record_version on public.messages;
create trigger messages_record_version after insert or update on public.messages for each row execute function public.record_content_version();
drop trigger if exists resume_versions_set_updated_at on public.resume_versions;
create trigger resume_versions_set_updated_at before update on public.resume_versions for each row execute function public.set_updated_at();
drop trigger if exists resume_versions_record_version on public.resume_versions;
create trigger resume_versions_record_version after insert or update on public.resume_versions for each row execute function public.record_content_version();
drop trigger if exists media_set_updated_at on public.media;
create trigger media_set_updated_at before update on public.media for each row execute function public.set_updated_at();
drop trigger if exists media_record_version on public.media;
create trigger media_record_version after insert or update on public.media for each row execute function public.record_content_version();
drop trigger if exists audit_log_set_updated_at on public.audit_log;
create trigger audit_log_set_updated_at before update on public.audit_log for each row execute function public.set_updated_at();
drop trigger if exists audit_log_record_version on public.audit_log;
create trigger audit_log_record_version after insert or update on public.audit_log for each row execute function public.record_content_version();
