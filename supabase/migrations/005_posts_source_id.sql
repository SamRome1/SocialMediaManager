-- Add source_id to posts for deduplication across scrape runs
-- source_id is the platform's native post identifier (e.g. Instagram shortCode)
alter table posts add column if not exists source_id text;

-- Partial unique index: only enforce uniqueness when source_id is set
-- NULL rows (legacy data) remain unaffected
create unique index if not exists posts_platform_source_id_idx
  on posts (platform, source_id)
  where source_id is not null;
