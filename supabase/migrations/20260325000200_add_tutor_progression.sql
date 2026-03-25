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

create index if not exists idx_subtype_attempt_events_user_subtype_created
  on public.subtype_attempt_events (user_id, subtype_id, created_at desc);
create index if not exists idx_skip_check_attempts_user_created
  on public.skip_check_attempts (user_id, created_at desc);

alter table public.tutor_progress enable row level security;
alter table public.subtype_attempt_events enable row level security;
alter table public.skip_check_attempts enable row level security;

drop policy if exists "Users can read own tutor progress" on public.tutor_progress;
create policy "Users can read own tutor progress"
on public.tutor_progress
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can upsert own tutor progress" on public.tutor_progress;
create policy "Users can upsert own tutor progress"
on public.tutor_progress
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can read own subtype attempts" on public.subtype_attempt_events;
create policy "Users can read own subtype attempts"
on public.subtype_attempt_events
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can create own subtype attempts" on public.subtype_attempt_events;
create policy "Users can create own subtype attempts"
on public.subtype_attempt_events
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can read own skip checks" on public.skip_check_attempts;
create policy "Users can read own skip checks"
on public.skip_check_attempts
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can create own skip checks" on public.skip_check_attempts;
create policy "Users can create own skip checks"
on public.skip_check_attempts
for insert
to authenticated
with check (auth.uid() = user_id);

drop trigger if exists on_tutor_progress_updated on public.tutor_progress;
create trigger on_tutor_progress_updated
before update on public.tutor_progress
for each row
execute function public.set_updated_at();
