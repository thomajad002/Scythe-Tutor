# Starter App Plan

## Goal
Create a reusable, dark-first Next.js + Tailwind starter app for CS4610 projects with clear setup documentation and extensibility for future features.

## Phase 1 — Foundation (Completed)
- Initialize Next.js App Router template
- Configure baseline TypeScript + ESLint + Tailwind v4
- Implement semantic dark theme tokens in `app/globals.css`
- Replace default landing screen with a clean starter UI
- Add project planning and task tracking docs

## Phase 2 — Feature Baseline (Completed)
- Add base app shell structure for authenticated pages
- Add reusable UI primitives (button, card, input) with tokenized styles
- Add environment variable documentation (`.env.local` expectations)
- Define starter folder conventions for future assignments

## Phase 3 — Supabase + Auth (Completed)
- Add Supabase client setup for server/client via `@supabase/ssr`
- Implement signup, login, logout, protected routes, and auth-aware home page
- Add `profiles` model with declarative schema and migration
- Add trigger-based automatic profile creation
- Add RLS policies for profile access
- Add avatar upload using Supabase Storage
- Add token refresh integration with `proxy.ts`

## Phase 4 — Developer Experience (Completed)
- Add setup automation script (`setup.sh`)
- Add unit testing baseline with example tests (Vitest + Testing Library)
- Add CI workflow for production migration automation
- Expand README with setup, architecture, auth, schema, deployment, and troubleshooting

## Maintenance Rule
Update `README.md` whenever a significant project change is made (architecture, setup, workflow, or developer experience).