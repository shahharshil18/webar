-- ARgift Supabase Schema
-- Run this in your Supabase SQL editor

-- Enable UUID extension
create extension if not exists "pgcrypto";

-- Experiences table
create table if not exists public.experiences (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  product_id    text not null unique,
  title         text,
  experience_type text not null default 'text' check (experience_type in ('video','photo','text')),
  template_id   text not null default 'golden',
  text_message  text,
  media_url     text,
  media_urls    text[] default '{}',
  marker_url          text,
  marker_image_url    text,
  marker_aspect_ratio float default 1,
  cta_label     text,
  cta_url       text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Index for fast lookup by product_id (receiver side)
create index if not exists idx_experiences_product_id on public.experiences(product_id);
create index if not exists idx_experiences_user_id on public.experiences(user_id);

-- Row Level Security
alter table public.experiences enable row level security;

-- Owners can read/write their own experiences
create policy "Users manage own experiences"
  on public.experiences
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Anyone can READ an experience by product_id (receiver side - no auth needed)
create policy "Public read experiences by product_id"
  on public.experiences
  for select
  using (true);

-- Storage buckets
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('videos',  'videos',  true, 52428800, array['video/mp4','video/webm','video/ogg']),
  ('images',  'images',  true, 10485760, array['image/jpeg','image/png','image/webp','image/gif']),
  ('markers', 'markers', true, 5242880,  array['application/octet-stream'])
on conflict (id) do nothing;

-- Storage policies — authenticated users can upload to own folder
create policy "Authenticated users upload videos"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'videos' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Authenticated users upload images"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'images' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Authenticated users upload markers"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'markers' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Authenticated users update own files"
  on storage.objects for update
  to authenticated
  using (auth.uid()::text = (storage.foldername(name))[1]);

-- Public read for all storage (CDN delivery)
create policy "Public read videos"
  on storage.objects for select
  using (bucket_id = 'videos');

create policy "Public read images"
  on storage.objects for select
  using (bucket_id = 'images');

create policy "Public read markers"
  on storage.objects for select
  using (bucket_id = 'markers');
