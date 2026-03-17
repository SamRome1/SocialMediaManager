-- ============================================================
-- Fix Simulations Schema — ensure all required columns exist
-- ============================================================

-- Add all missing columns to simulations table
alter table simulations
  add column if not exists content_type text not null default '',
  add column if not exists is_proven boolean not null default false,
  add column if not exists estimated_time text not null default '',
  add column if not exists views_low integer not null default 0,
  add column if not exists views_high integer not null default 0,
  add column if not exists eng_low numeric(5,2) not null default 0,
  add column if not exists eng_high numeric(5,2) not null default 0,
  add column if not exists followers_low integer not null default 0,
  add column if not exists followers_high integer not null default 0,
  add column if not exists signal text not null default 'TEST';

-- Verify the table structure
-- You can verify with: SELECT column_name FROM information_schema.columns WHERE table_name='simulations' ORDER BY ordinal_position;
