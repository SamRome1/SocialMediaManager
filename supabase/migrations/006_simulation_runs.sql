-- Stores the analytics returned by Claude for each simulation batch
create table if not exists simulation_runs (
  id              uuid primary key default gen_random_uuid(),
  platform        text not null,
  format          text not null,
  topic           text not null,
  model_confidence jsonb not null default '{}',
  pattern_evidence jsonb not null default '{}',
  playbook        jsonb not null default '{}',
  optimal_specs   jsonb not null default '{}',
  created_at      timestamptz not null default now()
);

create index if not exists simulation_runs_created_at_idx on simulation_runs (created_at desc);

alter table simulation_runs enable row level security;

create policy "Allow read" on simulation_runs
  for select using (true);

create policy "Service role insert" on simulation_runs
  for insert with check (auth.role() = 'service_role');

-- Link simulations back to their run
alter table simulations add column if not exists run_id uuid references simulation_runs(id) on delete set null;
