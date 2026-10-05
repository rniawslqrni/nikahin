-- =====================================================
-- Skema database Nikahin (Supabase / Postgres)
-- Cara pakai: Supabase Dashboard → SQL Editor → New query
--             → tempel seluruh isi file ini → Run
-- =====================================================

-- 1. Profil user (1 baris per user, dibuat otomatis saat daftar)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

-- 2. Undangan — SATU per user (user_id unique)
create table if not exists public.invitations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  slug text not null unique,
  data jsonb not null default '{}'::jsonb,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.invitations enable row level security;

-- 3. Helper cek admin (SECURITY DEFINER supaya tidak rekursi RLS)
create or replace function public.is_admin()
returns boolean language sql security definer set search_path = public as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$$;

-- 4. Policy tabel profiles
drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles for select
  using (auth.uid() = id or public.is_admin());

drop policy if exists "profiles_update" on public.profiles;
create policy "profiles_update" on public.profiles for update
  using (auth.uid() = id or public.is_admin());

-- 5. Policy tabel invitations
--    Publik (tanpa login) hanya boleh baca undangan yang dipublish
drop policy if exists "invitations_public_read" on public.invitations;
create policy "invitations_public_read" on public.invitations for select
  using (is_published = true);

--    Pemilik boleh kelola undangannya sendiri
drop policy if exists "invitations_owner_all" on public.invitations;
create policy "invitations_owner_all" on public.invitations for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

--    Admin boleh kelola semua
drop policy if exists "invitations_admin_all" on public.invitations;
create policy "invitations_admin_all" on public.invitations for all
  using (public.is_admin())
  with check (public.is_admin());

-- 6. Otomatis buat baris profile setiap ada user baru daftar
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- user pertama yang daftar otomatis jadi admin
  insert into public.profiles (id, email, is_admin)
  values (new.id, new.email,
          not exists (select 1 from public.profiles where is_admin = true))
  on conflict (id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users for each row execute function public.handle_new_user();

-- 7. updated_at otomatis terisi saat update
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end; $$;

drop trigger if exists invitations_touch on public.invitations;
create trigger invitations_touch
  before update on public.invitations for each row execute function public.touch_updated_at();

-- 8. Storage untuk foto undangan (bucket publik, tiap user hanya boleh
--    tulis di folder miliknya sendiri: <user_id>/...)
insert into storage.buckets (id, name, public)
values ('invitation-images', 'invitation-images', true)
on conflict (id) do nothing;

drop policy if exists "images_public_read" on storage.objects;
create policy "images_public_read" on storage.objects for select
  using (bucket_id = 'invitation-images');

drop policy if exists "images_owner_insert" on storage.objects;
create policy "images_owner_insert" on storage.objects for insert
  with check (bucket_id = 'invitation-images'
    and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "images_owner_update" on storage.objects;
create policy "images_owner_update" on storage.objects for update
  using (bucket_id = 'invitation-images'
    and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "images_owner_delete" on storage.objects;
create policy "images_owner_delete" on storage.objects for delete
  using (bucket_id = 'invitation-images'
    and (storage.foldername(name))[1] = auth.uid()::text);

-- 9. Tidak perlu query admin manual: user PERTAMA yang daftar otomatis
--    menjadi admin (lihat trigger handle_new_user di atas).
