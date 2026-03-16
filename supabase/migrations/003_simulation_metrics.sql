-- ============================================================
-- Simulation Metrics — adds per-idea range + signal columns
-- ============================================================

alter table simulations
  add column if not exists views_low      integer not null default 0,
  add column if not exists views_high     integer not null default 0,
  add column if not exists eng_low        numeric(5,2) not null default 0,
  add column if not exists eng_high       numeric(5,2) not null default 0,
  add column if not exists followers_low  integer not null default 0,
  add column if not exists followers_high integer not null default 0,
  add column if not exists signal         text not null default 'TEST';
