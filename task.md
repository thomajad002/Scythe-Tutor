# Scythe Score Tutor Task Checklist

## MVP Requirements
- [x] Create Supabase schema for scenarios, attempts, step responses, error events, and KC mastery.
- [x] Generate migration and update `types/database.ts`.
- [x] Seed at least 10 varied scoring scenarios.
- [x] Implement deterministic Scythe scoring engine (stars, territories, resources, coins, popularity multipliers).
- [x] Implement constraint-based rule checks.
- [x] Implement error classification for common mistakes.
- [x] Implement layered hints (L1/L2/L3).
- [x] Build authenticated `/tutor` step-by-step practice flow.
- [x] Persist learner responses and feedback events.
- [x] Build final attempt summary with score decomposition.
- [x] Build mastery/progress visualization by knowledge component.
- [x] Add test coverage for engine + classifier + tutor actions.
- [x] Add structure bonus tile scoring support.
- [x] Add winner tiebreaker walkthrough logic.
- [x] Add Factory as 3 territories rule handling.
- [x] Add tutorial bypass assessment and unlock logic.
- [x] Implement progression gates: subtype -> single-player -> 2-5 players.

## Proposal Alignment Checklist
- [x] Teach scoring categories (stars, territories, resources, coins).
- [x] Teach multiplier application by popularity.
- [x] Teach accurate component and total computation.
- [x] Support correction of common mistakes.
- [x] Support sequential reasoning and attention-to-detail practice.
- [x] Provide immediate step-level feedback.
- [x] Provide adaptive support via learner model (minimum: mastery tracking).
- [x] Support complete end-game scoring flow including structure bonus and tiebreakers.

## Stretch Goals
- [ ] Adaptive problem selection (outer loop ITS) - partial (infrastructure in place, full adaptation pending)
- [ ] Timed speedrun mode - partial (unlock gate in place, interactive implementation pending)
- [ ] Optional LLM hint wording (correctness remains rule-based) - not started

## Ongoing Rule
- [x] Each significant change must include a corresponding `README.md` update.

## Submission Readiness
- [x] End-to-end flow works from login -> tutor -> progress.
- [x] Automated tests pass.
- [x] README reflects architecture, setup, routes, and testing.
- [x] Features map cleanly to all five proposal sections.