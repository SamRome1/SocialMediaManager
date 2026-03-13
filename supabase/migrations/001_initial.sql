-- ============================================================
-- Social Media Manager — Initial Schema
-- Run this in your Supabase SQL editor or via supabase db push
-- ============================================================

-- Enable UUID extension
create extension if not exists "pgcrypto";

-- ──────────────────────────────────────────────────────────────
-- posts
-- ──────────────────────────────────────────────────────────────
create table if not exists posts (
  id              uuid primary key default gen_random_uuid(),
  platform        text not null,
  content         text not null default '',
  format          text not null default 'post',
  likes           integer not null default 0,
  comments        integer not null default 0,
  shares          integer not null default 0,
  reach           integer not null default 0,
  score           integer,
  posted_at       timestamptz not null default now(),
  raw_apify_data  jsonb,
  created_at      timestamptz not null default now()
);

create index if not exists posts_platform_idx     on posts (platform);
create index if not exists posts_posted_at_idx    on posts (posted_at desc);
create index if not exists posts_score_idx        on posts (score);

-- RLS
alter table posts enable row level security;

-- Allow all reads (public dashboard)
create policy "Allow read" on posts
  for select using (true);

-- Only service role can insert/update/delete (enforced via supabaseAdmin)
create policy "Service role insert" on posts
  for insert with check (auth.role() = 'service_role');

create policy "Service role update" on posts
  for update using (auth.role() = 'service_role');

create policy "Service role delete" on posts
  for delete using (auth.role() = 'service_role');


-- ──────────────────────────────────────────────────────────────
-- audits
-- ──────────────────────────────────────────────────────────────
create table if not exists audits (
  id              uuid primary key default gen_random_uuid(),
  platform        text not null,
  summary         text not null default '',
  action_items    jsonb not null default '[]',
  avg_score       numeric(5,2) not null default 0,
  top_post_id     uuid references posts(id) on delete set null,
  model_used      text not null default 'claude-sonnet-4-6',
  created_at      timestamptz not null default now()
);

create index if not exists audits_platform_idx   on audits (platform);
create index if not exists audits_created_at_idx on audits (created_at desc);

alter table audits enable row level security;

create policy "Allow read" on audits
  for select using (true);

create policy "Service role insert" on audits
  for insert with check (auth.role() = 'service_role');

create policy "Service role update" on audits
  for update using (auth.role() = 'service_role');

create policy "Service role delete" on audits
  for delete using (auth.role() = 'service_role');


-- ──────────────────────────────────────────────────────────────
-- simulations
-- ──────────────────────────────────────────────────────────────
create table if not exists simulations (
  id              uuid primary key default gen_random_uuid(),
  platform        text not null,
  format          text not null default 'post',
  topic           text not null default '',
  hook            text not null default '',
  script          text not null default '',
  cta             text not null default '',
  predicted_score integer not null default 0,
  why             text not null default '',
  published       boolean not null default false,
  created_at      timestamptz not null default now()
);

create index if not exists simulations_platform_idx   on simulations (platform);
create index if not exists simulations_created_at_idx on simulations (created_at desc);
create index if not exists simulations_published_idx  on simulations (published);

alter table simulations enable row level security;

create policy "Allow read" on simulations
  for select using (true);

create policy "Service role insert" on simulations
  for insert with check (auth.role() = 'service_role');

create policy "Service role update" on simulations
  for update using (auth.role() = 'service_role');

create policy "Service role delete" on simulations
  for delete using (auth.role() = 'service_role');


-- ──────────────────────────────────────────────────────────────
-- settings
-- ──────────────────────────────────────────────────────────────
create table if not exists settings (
  id              uuid primary key default gen_random_uuid(),
  brand_name      text not null default '',
  niche           text not null default '',
  tone            text not null default 'Professional',
  platforms       text[] not null default '{}',
  apify_token     text not null default '',
  -- scrape_schedule stores JSON: { "instagram": "@handle", "tiktok": "@handle" }
  scrape_schedule text not null default '{}',
  updated_at      timestamptz not null default now()
);

alter table settings enable row level security;

-- Only one settings row should ever exist
create policy "Allow read" on settings
  for select using (true);

create policy "Service role insert" on settings
  for insert with check (auth.role() = 'service_role');

create policy "Service role update" on settings
  for update using (auth.role() = 'service_role');

create policy "Service role delete" on settings
  for delete using (auth.role() = 'service_role');
