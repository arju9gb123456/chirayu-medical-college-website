-- =========================================================
-- Chirayu Medical College & Hospital — website admin backend
-- Run this once in Supabase → SQL Editor → New query → Run
-- =========================================================

-- 1) Page content (one row per page: 'home', later 'about', 'events' ...)
create table if not exists public.site_content (
  key         text primary key,
  data        jsonb not null,
  updated_at  timestamptz not null default now(),
  updated_by  text
);

-- 2) Who is allowed to edit (email must match their Supabase Auth login)
create table if not exists public.site_admins (
  email     text primary key,
  added_at  timestamptz not null default now()
);

-- 3) Every save keeps the previous version here (for "Restore")
create table if not exists public.site_content_history (
  id        bigserial primary key,
  key       text not null,
  data      jsonb not null,
  saved_at  timestamptz not null default now(),
  saved_by  text
);
create index if not exists site_content_history_key_idx on public.site_content_history (key, saved_at desc);

-- Helper: is the logged-in user an admin?
create or replace function public.is_site_admin()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.site_admins
    where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

-- Keep a copy of the old content before each update
create or replace function public.site_content_keep_history()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' then
    insert into public.site_content_history (key, data, saved_by)
    values (old.key, old.data, old.updated_by);
  end if;
  return new;
end;
$$;

drop trigger if exists site_content_history_trg on public.site_content;
create trigger site_content_history_trg
  before update on public.site_content
  for each row execute function public.site_content_keep_history();

-- ---------- Row Level Security ----------
alter table public.site_content          enable row level security;
alter table public.site_admins           enable row level security;
alter table public.site_content_history  enable row level security;

-- Anyone (the public website) can read content
drop policy if exists "content public read" on public.site_content;
create policy "content public read" on public.site_content
  for select to anon, authenticated using (true);

-- Only admins can create / change content
drop policy if exists "content admin insert" on public.site_content;
create policy "content admin insert" on public.site_content
  for insert to authenticated with check (public.is_site_admin());

drop policy if exists "content admin update" on public.site_content;
create policy "content admin update" on public.site_content
  for update to authenticated using (public.is_site_admin()) with check (public.is_site_admin());

-- A logged-in user can only see whether THEY are an admin
drop policy if exists "admins see self" on public.site_admins;
create policy "admins see self" on public.site_admins
  for select to authenticated using (lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')));

-- History: admins only
drop policy if exists "history admin read" on public.site_content_history;
create policy "history admin read" on public.site_content_history
  for select to authenticated using (public.is_site_admin());

-- ---------- Storage (photos & PDFs) ----------
insert into storage.buckets (id, name, public)
values ('site-media', 'site-media', true)
on conflict (id) do nothing;

drop policy if exists "media public read" on storage.objects;
create policy "media public read" on storage.objects
  for select to anon, authenticated using (bucket_id = 'site-media');

drop policy if exists "media admin upload" on storage.objects;
create policy "media admin upload" on storage.objects
  for insert to authenticated with check (bucket_id = 'site-media' and public.is_site_admin());

drop policy if exists "media admin update" on storage.objects;
create policy "media admin update" on storage.objects
  for update to authenticated using (bucket_id = 'site-media' and public.is_site_admin());

drop policy if exists "media admin delete" on storage.objects;
create policy "media admin delete" on storage.objects
  for delete to authenticated using (bucket_id = 'site-media' and public.is_site_admin());

-- ---------- First admin ----------
-- Add every person who should edit the website (same email they log in with):
insert into public.site_admins (email) values ('arjunahirwar895909@gmail.com')
on conflict (email) do nothing;
