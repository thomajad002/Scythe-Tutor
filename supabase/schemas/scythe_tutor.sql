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

create table if not exists public.tutor_progress (
  user_id uuid primary key references auth.users (id) on delete cascade,
  subtype_mastery jsonb not null default '{}'::jsonb,
  single_player_consecutive_correct integer not null default 0,
  single_player_mastered boolean not null default false,
  max_multiplayer_unlocked smallint not null default 1 check (max_multiplayer_unlocked between 1 and 7),
  speed_challenge_unlocked boolean not null default false,
  tutorial_completed boolean not null default false,
  skip_check_passed boolean not null default false,
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.subtype_attempt_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  subtype_id text not null,
  is_correct boolean not null,
  first_try_correct boolean not null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.skip_check_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  total_players smallint not null check (total_players between 1 and 7),
  correct_players smallint not null check (correct_players >= 0),
  is_perfect boolean not null,
  created_at timestamptz not null default timezone('utc', now()),
  check (correct_players <= total_players)
);

alter table public.scoring_scenarios enable row level security;
alter table public.scenario_attempts enable row level security;
alter table public.scenario_step_attempts enable row level security;
alter table public.error_events enable row level security;
alter table public.kc_mastery enable row level security;
alter table public.tutor_progress enable row level security;
alter table public.subtype_attempt_events enable row level security;
alter table public.skip_check_attempts enable row level security;
