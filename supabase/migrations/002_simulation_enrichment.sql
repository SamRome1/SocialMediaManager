-- ============================================================
-- Simulation Enrichment — adds content metadata columns
-- ============================================================

alter table simulations
  add column if not exists content_type  text not null default '',
  add column if not exists is_proven     boolean not null default false,
  add column if not exists estimated_time text not null default '';
