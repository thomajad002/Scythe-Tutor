# Scythe Scoring Intelligent Tutor

Project for building an intelligent tutoring system that teaches Scythe end-game scoring with deterministic rule-based feedback.

This repository started from a reusable Next.js + Supabase starter and now includes the first Scythe-specific implementation slice.

## Current Implementation Status

Completed in this milestone:

- Planning docs upgraded for proposal-aligned implementation (`plan.md`, `task.md`)
- Core tutoring domain schema + migration added (`knowledge_components`, `scoring_scenarios`, attempts, step attempts, error events, KC mastery)
- Seed data added with 10 Scythe scoring scenarios and 5 knowledge components
- Deterministic scoring + mistake classification module added (`lib/scythe/scoring.ts`)
- Test suite extended for scoring engine and constraints (`tests/lib/scythe-scoring.test.ts`)

Completed in current milestone:

- Added authenticated `/tutor` route with enforced gate model
- Added skip-check assessment flow and persistence
- Added progression persistence (`tutor_progress`, `subtype_attempt_events`, `skip_check_attempts`)
- Added tutor progression logic module (`lib/tutor/progression.ts`) and tests

Starter foundation retained:

- Next.js App Router + TypeScript + Tailwind CSS v4
- Supabase auth integration using `@supabase/ssr`
- Protected routes and profile management
- Declarative schema + migration workflow
- Setup automation script
- Unit testing baseline (Vitest + Testing Library)

## Prerequisites

- Node.js 20+
- npm 10+
- Docker Desktop (required for local Supabase)

## Quick Start (Recommended)

Run the automated setup script:

```bash
./setup.sh
npm run dev
```

The script installs dependencies, starts Supabase, writes `.env.local`, and resets local DB migrations.
If Docker is not running, the script now exits gracefully after preparing `.env.local` and prints next steps.

## Manual Setup

```bash
npm install
npx supabase start
npx supabase status
npx supabase db reset --local --yes
cp .env.example .env.local
```

Set these values in `.env.local` (or let `setup.sh` set them):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SITE_URL`

## Routes Included

- `/` Home page with auth status + links
- `/login` Email/password sign-in form
- `/signup` Email/password sign-up form
- `/dashboard` Protected route showing user/profile data
- `/profile` Protected route for profile updates + avatar upload
- `/tutor` Protected route for gated mastery flow and skip-check unlock logic

## Authentication Pattern

Authentication is standardized with reusable helpers:

- Server auth utilities in [lib/auth/server.ts](lib/auth/server.ts)
	- `getOptionalUser()` for optional auth checks
	- `requireUser()` for protected pages
- Server actions in [lib/auth/actions.ts](lib/auth/actions.ts)
	- `signIn`, `signUp`, `signOut`, `updateProfile`, `uploadAvatar`
- Client hook in [hooks/use-auth.ts](hooks/use-auth.ts)
	- `useAuth()` for reactive auth state in client components
- Token refresh middleware in [proxy.ts](proxy.ts) with [lib/supabase/middleware.ts](lib/supabase/middleware.ts)

## Supabase Structure

- Declarative schema: [supabase/schemas/profiles.sql](supabase/schemas/profiles.sql)
- Declarative schema: [supabase/schemas/scythe_tutor.sql](supabase/schemas/scythe_tutor.sql)
- Migration SQL: [supabase/migrations/20260225000100_init_profiles_and_auth.sql](supabase/migrations/20260225000100_init_profiles_and_auth.sql)
- Migration SQL: [supabase/migrations/20260325000100_add_scythe_tutor_core.sql](supabase/migrations/20260325000100_add_scythe_tutor_core.sql)
- Migration SQL: [supabase/migrations/20260325000200_add_tutor_progression.sql](supabase/migrations/20260325000200_add_tutor_progression.sql)
- Supabase config: [supabase/config.toml](supabase/config.toml)
- Seed data: [supabase/seed.sql](supabase/seed.sql)

Generate a migration after declarative schema changes:

```bash
npx supabase db diff -f <migration_name>
```

### Profiles Model

`public.profiles`:

- `id uuid primary key references auth.users(id)`
- `email text`
- `full_name text`
- `avatar_url text`
- `updated_at timestamptz`

### Scythe Tutor Models (Initial)

- `public.knowledge_components`
- `public.scoring_scenarios`
- `public.scenario_attempts`
- `public.scenario_step_attempts`
- `public.error_events`
- `public.kc_mastery`
- `public.tutor_progress`
- `public.subtype_attempt_events`
- `public.skip_check_attempts`

These tables provide the core data model for the inner tutoring loop: scenario selection, step-level submissions, feedback/error tracking, and per-KC mastery progress.

### Tutor Progression Model

`/tutor` currently enforces this gate order:

- Subtype mastery
- Single-player full-score gate
- Multiplayer progression from 2 to 5 players
- Speed challenge unlock

Skip-check can bypass tutorial gates only if the full assessment is perfect.

## Scoring Engine

Core rule-based scoring and constraint evaluation live in [lib/scythe/scoring.ts](lib/scythe/scoring.ts).

Implemented capabilities:

- Popularity tier classification (`low`, `mid`, `high`)
- Category scoring for stars, territories, resource pairs, and coins
- Total score calculation
- Constraint checks and error classification for:
	- incorrect multiplier usage
	- resource pair counting mistakes
	- arithmetic sum errors
	- omitted category entries

### Automatic Profile Creation

The migration includes:

- `handle_new_user()` trigger function
- `on_auth_user_created` trigger (`AFTER INSERT ON auth.users`)

This inserts a profile row automatically when a user signs up.

### Row Level Security (RLS)

RLS is enabled on `public.profiles` with policies for authenticated users:

- Select own profile (`auth.uid() = id`)
- Update own profile
- Insert own profile

### Avatar Upload

The migration creates public bucket `avatars` and storage policies to allow users to manage only their own avatar objects under a folder keyed by user id.
Server Actions request size is configured to `10mb`, and app-level avatar validation enforces an `8MB` max file size.

## Project Organization

- [app](app): App Router pages/routes
- [components/ui](components/ui): reusable primitive UI components
- [lib/auth](lib/auth): auth actions and server helpers
- [lib/supabase](lib/supabase): Supabase client/middleware utilities
- [hooks](hooks): reusable React hooks
- [types](types): shared TypeScript database types
- [tests](tests): unit tests

## Theme + Styling

Dark-first tokenized palette is defined in [app/globals.css](app/globals.css) to keep colors easy to swap for future templates.

## Header Navigation Customization

The app now uses a shared header navigation rendered from [lib/navigation.ts](lib/navigation.ts).

- Update `brand.label` and `brand.href` to rename your app header brand.
- Edit `commonItems` for links visible to everyone.
- Edit `authenticatedItems` and `unauthenticatedItems` for auth-aware nav links.

This keeps navigation updates centralized for reuse across different app ideas.

## Testing

Run tests:

```bash
npm run test
```

Watch mode:

```bash
npm run test:watch
```

Example tests included:

- React component test: [tests/components/button.test.tsx](tests/components/button.test.tsx)
- Utility test: [tests/lib/format-date.test.ts](tests/lib/format-date.test.ts)
- Auth-related test: [tests/auth/actions.test.ts](tests/auth/actions.test.ts)
- Scythe scoring engine test: [tests/lib/scythe-scoring.test.ts](tests/lib/scythe-scoring.test.ts)
- Tutor progression logic test: [tests/lib/tutor-progression.test.ts](tests/lib/tutor-progression.test.ts)

## GitHub Actions (DB Migrations)

Workflow: [.github/workflows/supabase-migrations.yml](.github/workflows/supabase-migrations.yml)

Triggers on push to `main`/`production` and runs `supabase db push` against your linked production project.

### Required GitHub Secrets

- `SUPABASE_ACCESS_TOKEN`
- `SUPABASE_PROJECT_REF`
- `SUPABASE_DB_PASSWORD`

### Setup Steps

1. In Supabase Dashboard, open **Project Settings → General** and copy your **Project Reference ID**.
2. In Supabase Dashboard, ensure you know the **database password** for the production project.
3. In Supabase Dashboard, create a **Personal Access Token** (for CI CLI auth).
4. In GitHub, open **Settings → Secrets and variables → Actions**.
5. Add repository secrets with these exact names:
	- `SUPABASE_ACCESS_TOKEN` = your Supabase personal access token
	- `SUPABASE_PROJECT_REF` = production project reference (20-char id)
	- `SUPABASE_DB_PASSWORD` = production database password

### What the Workflow Does

- Validates all required secrets before running any migration commands.
- Links the repository to your production Supabase project.
- Runs pending migrations with `supabase db push --linked`.
- Fails fast with clear errors if secrets are missing/misconfigured.

### Template / Local-Only Usage

If you are using this repo as a starter template and only running local Supabase, the workflow will now skip migration execution automatically when production secrets are not set.

- Result: pushes to `main`/`production` do not fail just because production Supabase is not configured yet.
- To enable production migrations later, add all three required secrets in GitHub Actions settings.

### Common Failure: "Cannot find project ref"

If CI shows:

`Cannot find project ref. Have you run supabase link?`

that usually means `SUPABASE_PROJECT_REF` is empty, misspelled, or set to the wrong value.

Checklist:

- Secret name is exactly `SUPABASE_PROJECT_REF` (case-sensitive).
- Secret value is the project ref (not URL, not anon key, not project name).
- Secret exists in the same repository where Actions runs.
- If using environments, secret is defined for that environment as well.

## Deployment Guide (Production)

1. Create a Supabase production project.
2. Apply migrations to production (`supabase link` + `supabase db push`).
3. Deploy app to platform (Vercel recommended).
4. Configure environment variables in deployment platform:
	 - `NEXT_PUBLIC_SUPABASE_URL`
	 - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
	 - `NEXT_PUBLIC_SITE_URL`
5. Confirm auth redirect URLs in Supabase Auth settings match production domain.

## How to Reuse This Starter

1. Copy this repository or select this template from new github project.
2. Run `./setup.sh`.
3. Update naming/routes/components as desired.
4. Keep database changes declarative in `supabase/schemas/` and generate migrations.

## Troubleshooting

- `supabase start` fails: verify Docker Desktop is running.
- `./setup.sh` warns about Docker: start Docker Desktop, then run `./setup.sh` again to complete Supabase startup and migrations.
- `./setup.sh` reports "port is already allocated" for `54322`: the script will auto-try `supabase stop --all` once; if it still fails, use the printed container/process diagnostics and stop the owner of port `54322`.
- Missing env error at runtime: run `./setup.sh` again.
- Login/signup errors: inspect Supabase logs with `npx supabase status` and Studio auth settings.
- Migration conflicts: run `npx supabase db reset --local --yes`.

## Planning Docs

- [plan.md](plan.md)
- [task.md](task.md)
