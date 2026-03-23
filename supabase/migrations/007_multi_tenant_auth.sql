-- Multi-tenant auth migration
-- Adds user_id to all tables, updates RLS to user-scoped policies,
-- updates profiles unique constraint for multi-tenancy.

-- ── 1. Add user_id columns ────────────────────────────────────────────────────

alter table posts             add column if not exists user_id uuid;
alter table audits            add column if not exists user_id uuid;
alter table simulations       add column if not exists user_id uuid;
alter table simulation_runs   add column if not exists user_id uuid;
alter table settings          add column if not exists user_id uuid;
alter table profiles          add column if not exists user_id uuid;

-- ── 2. Add FK constraints to auth.users ───────────────────────────────────────

alter table posts           add constraint posts_user_fk
  foreign key (user_id) references auth.users(id) on delete cascade;
alter table audits          add constraint audits_user_fk
  foreign key (user_id) references auth.users(id) on delete cascade;
alter table simulations     add constraint simulations_user_fk
  foreign key (user_id) references auth.users(id) on delete cascade;
alter table simulation_runs add constraint simulation_runs_user_fk
  foreign key (user_id) references auth.users(id) on delete cascade;
alter table settings        add constraint settings_user_fk
  foreign key (user_id) references auth.users(id) on delete cascade;
alter table profiles        add constraint profiles_user_fk
  foreign key (user_id) references auth.users(id) on delete cascade;

-- One settings row per user
alter table settings add constraint settings_user_id_unique unique (user_id);

-- ── 3. Drop old open-read policies ────────────────────────────────────────────

drop policy if exists "Allow public read" on posts;
drop policy if exists "Allow read" on posts;
drop policy if exists "Service role insert" on posts;
drop policy if exists "Service role update" on posts;
drop policy if exists "Service role delete" on posts;

drop policy if exists "Allow public read" on audits;
drop policy if exists "Allow read" on audits;
drop policy if exists "Service role insert" on audits;
drop policy if exists "Service role update" on audits;
drop policy if exists "Service role delete" on audits;

drop policy if exists "Allow public read" on simulations;
drop policy if exists "Allow read" on simulations;
drop policy if exists "Service role insert" on simulations;
drop policy if exists "Service role update" on simulations;
drop policy if exists "Service role delete" on simulations;

drop policy if exists "Allow public read" on simulation_runs;
drop policy if exists "Allow read" on simulation_runs;
drop policy if exists "Service role insert" on simulation_runs;

drop policy if exists "Allow public read" on settings;
drop policy if exists "Allow read" on settings;
drop policy if exists "Service role insert" on settings;
drop policy if exists "Service role update" on settings;
drop policy if exists "Service role delete" on settings;

drop policy if exists "Allow public read" on profiles;
drop policy if exists "Allow read" on profiles;
drop policy if exists "Service role insert" on profiles;
drop policy if exists "Service role update" on profiles;
drop policy if exists "Service role delete" on profiles;

-- ── 4. New user-scoped RLS policies ───────────────────────────────────────────

-- posts
create policy "Users read own posts" on posts
  for select using (auth.uid() = user_id);
create policy "Users insert own posts" on posts
  for insert with check (auth.uid() = user_id);
create policy "Users update own posts" on posts
  for update using (auth.uid() = user_id);
create policy "Users delete own posts" on posts
  for delete using (auth.uid() = user_id);

-- audits
create policy "Users read own audits" on audits
  for select using (auth.uid() = user_id);
create policy "Users insert own audits" on audits
  for insert with check (auth.uid() = user_id);
create policy "Users update own audits" on audits
  for update using (auth.uid() = user_id);
create policy "Users delete own audits" on audits
  for delete using (auth.uid() = user_id);

-- simulations
create policy "Users read own simulations" on simulations
  for select using (auth.uid() = user_id);
create policy "Users insert own simulations" on simulations
  for insert with check (auth.uid() = user_id);
create policy "Users update own simulations" on simulations
  for update using (auth.uid() = user_id);
create policy "Users delete own simulations" on simulations
  for delete using (auth.uid() = user_id);

-- simulation_runs
create policy "Users read own simulation_runs" on simulation_runs
  for select using (auth.uid() = user_id);
create policy "Users insert own simulation_runs" on simulation_runs
  for insert with check (auth.uid() = user_id);

-- settings
create policy "Users read own settings" on settings
  for select using (auth.uid() = user_id);
create policy "Users insert own settings" on settings
  for insert with check (auth.uid() = user_id);
create policy "Users update own settings" on settings
  for update using (auth.uid() = user_id);
create policy "Users delete own settings" on settings
  for delete using (auth.uid() = user_id);

-- profiles
create policy "Users read own profiles" on profiles
  for select using (auth.uid() = user_id);
create policy "Users insert own profiles" on profiles
  for insert with check (auth.uid() = user_id);
create policy "Users update own profiles" on profiles
  for update using (auth.uid() = user_id);
create policy "Users delete own profiles" on profiles
  for delete using (auth.uid() = user_id);

-- ── 5. Update profiles unique constraint for multi-tenancy ────────────────────
-- Old constraint was (platform, handle) — two users could manage the same handle.
-- New constraint is (user_id, platform, handle).

alter table profiles drop constraint if exists profiles_platform_handle_key;
alter table profiles add constraint profiles_user_platform_handle_unique
  unique (user_id, platform, handle);

-- ── 6. Indexes on user_id for query performance ───────────────────────────────

create index if not exists posts_user_id_idx           on posts (user_id);
create index if not exists audits_user_id_idx          on audits (user_id);
create index if not exists simulations_user_id_idx     on simulations (user_id);
create index if not exists simulation_runs_user_id_idx on simulation_runs (user_id);
create index if not exists profiles_user_id_idx        on profiles (user_id);

-- ── NOTE: Claiming existing data ──────────────────────────────────────────────
-- After running this migration, existing rows have user_id = null and are
-- invisible to RLS. To claim existing data for your account, run:
--
--   update posts           set user_id = '<your-uuid>' where user_id is null;
--   update audits          set user_id = '<your-uuid>' where user_id is null;
--   update simulations     set user_id = '<your-uuid>' where user_id is null;
--   update simulation_runs set user_id = '<your-uuid>' where user_id is null;
--   update settings        set user_id = '<your-uuid>' where user_id is null;
--   update profiles        set user_id = '<your-uuid>' where user_id is null;
--
-- Find your UUID in Supabase dashboard → Authentication → Users.
