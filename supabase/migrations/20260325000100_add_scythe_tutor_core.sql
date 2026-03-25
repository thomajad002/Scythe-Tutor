create table if not exists public.knowledge_components (
  id text primary key,
  name text not null,
  description text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.scoring_scenarios (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  difficulty smallint not null check (difficulty between 1 and 3),
  stars smallint not null check (stars >= 0),
  territories smallint not null check (territories >= 0),
  resources smallint not null check (resources >= 0),
  coins integer not null check (coins >= 0),
  popularity smallint not null check (popularity between 0 and 18),
  tags text[] not null default '{}',
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.scenario_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  scenario_id uuid not null references public.scoring_scenarios (id) on delete cascade,
  expected_total integer not null,
  submitted_total integer,
  is_correct boolean not null default false,
  error_codes text[] not null default '{}',
  started_at timestamptz not null default timezone('utc', now()),
  completed_at timestamptz
);

create table if not exists public.scenario_step_attempts (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.scenario_attempts (id) on delete cascade,
  step_key text not null check (step_key in ('stars', 'territories', 'resources', 'coins', 'total')),
  submitted_value integer,
  expected_value integer not null,
  is_correct boolean not null,
  feedback text,
  error_code text,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.error_events (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.scenario_attempts (id) on delete cascade,
  step_attempt_id uuid references public.scenario_step_attempts (id) on delete set null,
  user_id uuid not null references auth.users (id) on delete cascade,
  scenario_id uuid not null references public.scoring_scenarios (id) on delete cascade,
  error_code text not null,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.kc_mastery (
  user_id uuid not null references auth.users (id) on delete cascade,
  kc_id text not null references public.knowledge_components (id) on delete cascade,
  mastery numeric(5, 4) not null default 0,
  correct_attempts integer not null default 0,
  incorrect_attempts integer not null default 0,
  last_updated timestamptz not null default timezone('utc', now()),
  primary key (user_id, kc_id),
  check (mastery >= 0 and mastery <= 1)
);

create index if not exists idx_scenario_attempts_user_id on public.scenario_attempts (user_id);
create index if not exists idx_scenario_attempts_scenario_id on public.scenario_attempts (scenario_id);
create index if not exists idx_scenario_step_attempts_attempt_id on public.scenario_step_attempts (attempt_id);
create index if not exists idx_error_events_user_id on public.error_events (user_id);
create index if not exists idx_error_events_scenario_id on public.error_events (scenario_id);
create index if not exists idx_kc_mastery_user_id on public.kc_mastery (user_id);

alter table public.scoring_scenarios enable row level security;
alter table public.scenario_attempts enable row level security;
alter table public.scenario_step_attempts enable row level security;
alter table public.error_events enable row level security;
alter table public.kc_mastery enable row level security;

drop policy if exists "Authenticated users can read scenarios" on public.scoring_scenarios;
create policy "Authenticated users can read scenarios"
on public.scoring_scenarios
for select
to authenticated
using (true);

drop policy if exists "Authenticated users can create scenarios" on public.scoring_scenarios;
create policy "Authenticated users can create scenarios"
on public.scoring_scenarios
for insert
to authenticated
with check (auth.uid() = created_by);

drop policy if exists "Users can read own attempts" on public.scenario_attempts;
create policy "Users can read own attempts"
on public.scenario_attempts
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can create own attempts" on public.scenario_attempts;
create policy "Users can create own attempts"
on public.scenario_attempts
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update own attempts" on public.scenario_attempts;
create policy "Users can update own attempts"
on public.scenario_attempts
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can read own step attempts" on public.scenario_step_attempts;
create policy "Users can read own step attempts"
on public.scenario_step_attempts
for select
to authenticated
using (
  exists (
    select 1
    from public.scenario_attempts sa
    where sa.id = attempt_id
      and sa.user_id = auth.uid()
  )
);

drop policy if exists "Users can create own step attempts" on public.scenario_step_attempts;
create policy "Users can create own step attempts"
on public.scenario_step_attempts
for insert
to authenticated
with check (
  exists (
    select 1
    from public.scenario_attempts sa
    where sa.id = attempt_id
      and sa.user_id = auth.uid()
  )
);

drop policy if exists "Users can read own error events" on public.error_events;
create policy "Users can read own error events"
on public.error_events
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can create own error events" on public.error_events;
create policy "Users can create own error events"
on public.error_events
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can read own KC mastery" on public.kc_mastery;
create policy "Users can read own KC mastery"
on public.kc_mastery
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can upsert own KC mastery" on public.kc_mastery;
create policy "Users can upsert own KC mastery"
on public.kc_mastery
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
