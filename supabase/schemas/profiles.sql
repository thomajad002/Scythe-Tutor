create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text unique,
  full_name text,
  avatar_url text,
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.profiles enable row level security;
