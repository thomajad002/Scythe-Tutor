# Scythe Scoring Intelligent Tutor

## Live Demo

Try the app live on Vercel:

[scythe-tutor.vercel.app](https://scythe-tutor.vercel.app)

**Note:** For best performance, especially if you notice slowness on the live app (due to free hosting tier limits), download and run locally using the instructions below.

---

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
- Redesigned tutor UI as a one-stage-at-a-time walkthrough with adaptive stage routing
- Added asset checklist and folder conventions (`assets.md`, `public/assets/`)
- Replaced manual gate toggles with real scoring submission forms for single-player and multiplayer stages
- Added temporary board-state scenario sourcing with deterministic scenario bank selection for tutor rounds
- Implemented layered hint levels (L1/L2/L3), decomposition summaries, and winner/tiebreaker evaluation
- Extended scoring engine to include Factory territory handling (+2 territory equivalent when controlled) and structure bonus coins
- Replaced procedural scenario generation with 120 real game scenarios (`data/games/scythe_scenarios.json`)
  - 20 scenarios per structure bonus tile (6 tiles total)
  - Complete game state data per player: units, structures, resources, popularity, power
  - Scenarios feature all 5 factions across varied board states
- Implemented scenario data loader (`lib/tutor/scenario-bank.ts`)
  - Converts raw game state to scoring inputs (stars, territories, resources, coins)
  - Handles Factory territory bonus calculation
  - Sorts players by estimated score for proper difficulty progression
- Updated scenario bank to serve real scenarios with player-count variants (1-5 players)
  - Maintains visualization rendering for all pieces and track positions
  - Supports filtering by structure bonus tile for targeted practice

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

### Local Setup Checklist

- Ensure Docker Desktop is running before starting.
- Run `./setup.sh` to generate `.env.local` and start Supabase.
- If you encounter port or migration errors, see the Troubleshooting section below.
- All required environment variables are set by the script; no manual `.env.local` editing is needed unless customizing.

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

- `/` Product landing page and learning flow overview
- `/login` Email/password sign-in form
- `/signup` Email/password sign-up form
- `/dashboard` Protected progress hub
- `/profile` Protected profile and avatar settings
- `/tutor` Protected gate-driven training route with skip-check persistence

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

### Walkthrough UX Model

`/tutor` now emphasizes one active stage at a time:

- Subtype walkthrough (inner loop)
- Single-player gate
- Multiplayer gate (outer loop progression from 2 to 5 players)
- Speed challenge unlock state

This reduces cognitive load and keeps progression visually explicit.

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
- [lib/scythe](lib/scythe): Scythe scoring engine and domain logic
- [lib/tutor](lib/tutor): Tutor progression, scenario loading, and server actions
- [hooks](hooks): reusable React hooks
- [types](types): shared TypeScript database types
- [tests](tests): unit tests
- [data/games](data/games): Real Scythe scenario data (120 scenarios, 20 per structure bonus tile)
- [assets.md](assets.md): asset planning checklist and naming conventions

## Tutor Flow and Learner Progression

The `/tutor` route implements a gated, stage-by-stage learning progression:

### Stage 1: Skip-Check Assessment (Optional Bypass)
- One full-game scoring scenario with all players
- If perfect: tutorial is bypassed, speed challenge unlocks immediately
- If not perfect: learner enters guided mastery path with low-scoring components highlighted

### Stage 2: Subtype Mastery (Guided Deep Dive)
Seven knowledge components are taught individually:
1. **Popularity Tiers**: Learn to classify popularity into low (0-6), mid (7-12), high (13-18) ranges
2. **Stars Scoring**: Calculate star coins using popularity tier multipliers (3/4/5)
3. **Territories Scoring**: Count controlled territories, handle Factory +3 territories bonus
4. **Resources Scoring**: Count resource pairs and apply popularity multiplier (1/2/3 coins per pair)
5. **Structure Bonus Scoring**: Award coins based on structure bonus tile achievement
6. **Total Scoring**: Sum all components correctly (no multiplier on coins or structure bonus)
7. **Winner & Tiebreakers**: Determine winner and apply tiebreaker order when scores are tied

Each subtype:
- Uses scenarios from [data/games/scythe_scenarios.json](data/games/scythe_scenarios.json)
- Provides 1-2 player scenarios with immediate feedback
- Offers layered hints (L1 conceptual, L2 targeted cue, L3 near-explicit)
- Requires 2 consecutive correct answers to mark mastery

### Stage 3: Single-Player Integration
- Full end-to-end score calculation for one player
- Must demonstrate 2 consecutive correct full-game calculations
- Unlocks multiplayer progression

### Stage 4: Multiplayer Progression (2-5 Players)
- Start with 2-player scenarios
- After one correct full-round calculation, unlock +1 player
- Progress to 3, 4, and finally 5 players
- Each round features multiple players scoring and tiebreaker resolution

### Stage 5: Speed Challenge (Stretch Goal)
- Unlocked after mastery path completion or perfect skip-check
- Future: timed full-game rounds with pressure-based fluency training

### Scenario and Player Selection Strategy
- **Subtype teaching**: Random scenarios from the 120-scenario bank, 1-2 players as needed
- **Multiplayer scenarios**: Players sorted by estimated score (highest first) to ensure graduated difficulty
- **Structure bonus tile support**: Can select specific scenarios by their structure bonus type (tunnel_adjacent, lake_adjacent, etc.)

## Scenario Data Structure

All practice scenarios come from [data/games/scythe_scenarios.json](data/games/scythe_scenarios.json):

- **120 total scenarios**: 20 scenarios per structure bonus tile type
- **Complete game state**: Each player includes:
  - Unit counts (workers, mechs, character position)
  - Controlled hexes and structure placements
  - Resource distribution on controlled territories
  - Power and popularity values
  - Star counts by category
- **Pre-calculated scoring**: Each scenario includes correct scores and tiebreaker stats
- **Faction diversity**: All 5 factions represented across varied board states

Scenario files are loaded via [lib/tutor/scenario-bank.ts](lib/tutor/scenario-bank.ts) which:
- Converts raw game state to scoring inputs (stars, territories, resources, coins)
- Calculates Factory territory bonus (+2 effective territories if controlled)
- Extracts structure bonus coins from scenario scoring data
- Sorts players by estimated score for difficulty progression

## Features Mapped to Proposal Sections

### 1. Teaching Scoring Categories
✅ **Subtypes 1-5** teach stars, territories, resources, coins, and structure bonus independently
✅ **Subtype 6** teaches accurate total computation by summing all components
✅ Real scenarios from JSON provide authentic practice contexts

### 2. Teaching Multiplier Application by Popularity
✅ **Subtype 1** explicitly teaches popularity tier classification  
✅ **Subtypes 2-4** show multiplier application (3/4/5 for stars, 2/3/4 for territories, 1/2/3 for resource pairs)
✅ Hints explain the tier-based lookup table with concrete examples

### 3. Teaching Accurate Component and Total Computation
✅ **Subtype 4** dedicated to territories including Factory rule (3 territories = 1 Factory)
✅ **Subtype 6** forces component-by-component breakdown followed by summation
✅ Error classification detects incorrect multipliers, arithmetic, and omitted categories

### 4. Supporting Correction of Common Mistakes
✅ **Error classification** in [lib/scythe/scoring.ts](lib/scythe/scoring.ts) identifies:
  - Incorrect multiplier application
  - Resource pair miscounting
  - Arithmetic/sum errors
  - Omitted categories
✅ **Layered hints** provide step-by-step correction guidance
✅ Immediate feedback on each step prevents error propagation

### 5. Supporting Sequential Reasoning and Attention-to-Detail Practice
✅ **Subtype progression** from simple (popularity tiers) to complex (full game + tiebreakers)
✅ **Single-player gate** enforces fluency before multiplayer complexity
✅ **Multiplayer 2-5 progression** gradually increases cognitive load
✅ High-quality real scenarios require careful attention to all details

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