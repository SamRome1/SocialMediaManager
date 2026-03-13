-- ============================================================
-- Migration 002: Profiles table for per-platform channel data
-- Run in Supabase SQL Editor
-- ============================================================

create table if not exists profiles (
  id                  uuid primary key default gen_random_uuid(),
  platform            text not null,
  handle              text not null,
  followers           integer not null default 0,
  previous_followers  integer not null default 0,
  following           integer not null default 0,
  posts_count         integer not null default 0,
  scraped_at          timestamptz not null default now(),
  constraint profiles_platform_handle_key unique (platform, handle)
);

create index if not exists profiles_platform_idx on profiles (platform);

alter table profiles enable row level security;

create policy "Allow read" on profiles
  for select using (true);

create policy "Service role insert" on profiles
  for insert with check (auth.role() = 'service_role');

create policy "Service role update" on profiles
  for update using (auth.role() = 'service_role');

create policy "Service role delete" on profiles
  for delete using (auth.role() = 'service_role');
