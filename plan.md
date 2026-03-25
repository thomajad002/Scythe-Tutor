# Scythe Plan

Build Scythe Scoring Intelligent Tutor on top of the Next.js + Supabase starter by implementing a deterministic rule-based scoring tutor (inner loop ITS) first, then adding adaptive scenario selection (outer loop) as time allows.

## Scythe End and Scoring instructions from rule book
The game immediately ends when a player places their 6th star token, even if they have other things they could do that
turn or other things would happen afterwards.

### Edge Cases
If the 6th star comes from taking a bottom-row action, gain
the primary benefit, the coins, and the Recruit Ongoing
Benefit before placing the star.

If you have units (character, mechs, or workers) remaining
on a territory with an opponent’s units (from a Move
action), you must undo that portion of your Move action,
returning the unit(s) to the territory they moved from.

If you place a star for total popularity or total power as
a recruit bonus on an opponent’s turn, that placement
happens
after
the opponent takes the action (e.g., build
a structure) in clockwise order and only if that opponent
didn’t place their 6th star by taking that action.

    DESIGNER'S NOTE: Scythe incentivizes players to end the game
    if possible by making stars worth coins and denying
    additional turns to opponents. This may result in some
    opponents having one fewer overall turns than the player
    who placed their final star

### VARIANT (Optional)
DELAY OF GAME:
Because of the various end-game scoring
categories and their connection to popularity, it’s
difficult for players to determine who is in the lead (this
is intentional). However, it is possible for a player to
interrupt the game to calculate the final score for each
player as they plan out their next few moves. That’s not fun
for anyone. The Delay of Game variant says that if a player
delays the game (while the game is being played, not during
end-game scoring) for more than 10 seconds by trying to
calculate the final score, they lose 2 popularity.

Note: This is why what timed challenge mode will be important.

### GAME END AND SCORING
Accumulate your final fortune—coins you had before
the game end was triggered plus end-game coins—to
determine the winner. You should have a mound of coins
in front of you before announcing the total to the other
players.

To determine how many coins you earn for each of
the three scoring categories, look at your level on the
Popularity Track and pick up coins for that category (do this on your own-there is no need for a "banker").

    EXAMPLE: If you have 10 popularity, you will earn $4 for every star you placed, $3 for each territory you control, and $2 for every 2 resource tokens you control. If you have 18 popularity, you score within the 13-17 popularity level.

### SCORING CATEGORIES
COINS IN HAND:
The coins you accumulated during the game
count for end-game scoring.

EVERY STAR TOKEN PLACED:
Gain coins for every star token you
placed during the game.

* For 0-6 popularity, each star gains 3 coins.
* For 7-12 popularity, each star gains 4 coins.
* For 13-18 popularity, each star gains 5 coins. 

EVERY TERRITORY CONTROLLED:
Gain coins for every territory you
control (including lakes). Home bases aren’t territories. You
control each territory where you have a worker, mech, or
character, or where you have a structure (but no enemy units).

    FACTORY: At the end of the game, the Factory is counted as 3 territories to the player who controls it.

* For 0-6 popularity, each territory gains 2 coins.
* For 7-12 popularity, each territory gains 3 coins.
* For 13-18 popularity, each territory gains 4 coins. 

EVERY 2 RESOURCES CONTROLLED:
Gain coins for every 2 resource
tokens you control (e.g., if you control 13 resource tokens
and have 10 popularity, you’ll gain a total of 12 coins).
Workers are not resources. You control all resources on
territories where you have a character, worker, mech, or a
structure not occupied by an opponent’s unit.

* For 0-6 popularity, each pair of resources gains 1 coins.
* For 7-12 popularity, each pair of resources gains 2 coins.
* For 13-18 popularity, each pair of resources gains 3 coins. 

STRUCTURE BONUS TILE:
Gain coins based on the number of
structure bonuses you achieved. You gain this bonus even if you don’t control the territories your structures are on.

There are 6 bonus tiles:

1. Tunnel Adjacent: Number of tunnel
territories adjacent to your
structures. Only count each
tunnel once. A Mine does
not count as a tunnel for
this purpose, and rivers do
not break adjacency.
    * 1 : 2 coins
    * 2-3 : 4 coins
    * 4-5 : 6 coins
    * 6 : 9 coins

2. Lake Adjacent: 
The 6 structure bonus tiles are as follows:
Number of lakes adjacent to
your structures. Only count
each lake once.
    * 1 : 2 coins
    * 2-3 : 4 coins
    * 4-5 : 6 coins
    * 6-7 : 9 coins

3. Encounter Adjacent: Number of encounters
adjacent to your structures.
Only count each encounter
once. These count whether
or not the encounter tokens
are still there. Rivers do not
break adjacency.
    * 1 : 2 coins
    * 2-3 : 4 coins
    * 4-5 : 6 coins
    * 6-7 : 9 coins

4. On Tunnel: Number of tunnel
territories with your
structures on them. A Mine
does not count as a tunnel
for this purpose.
    * 1 : 2 coins
    * 2 : 4 coins
    * 3-4 : 6 coins

5. Row of Structures: Number of your structures
in a row (any continuous
straight line is fine; only
count the longest row of
structures you have; rivers
do not break continuity).
    * 1 : 2 coins
    * 2 : 4 coins
    * 3 : 6 coins
    * 4 : 9 coins

6. On Tundra or Farm: Number of farms and
tundras with your structures
on them.
    * 1 : 2 coins
    * 2 : 4 coins
    * 3 : 6 coins
    * 4 : 9 coins

### DECLARING THE WINNER
Announce your coin total, and the player with the most
coins wins! If multiple players have the same total, use the
following as tiebreakers (in order):
1. Number of workers, mechs, and structures
2. Power
3. Popularity
4. Number of resource tokens controlled
5. Number of territories controlled
6. Number of star tokens placed on board

## MVP Scope Decisions
- Include in MVP:
    - Coins in hand
    - Stars, territories, resources scoring with popularity multipliers
    - Factory territory rule (counts as 3 territories)
    - Structure bonus tile scoring
    - Winner determination and tiebreaker walkthrough
- Include in MVP tutorial flow:
    - 1 to 5 players full-game scoring scenarios
- Stretch:
    - 6 to 7 player scenarios (expansion support)
    - Delay of Game timed pressure framing inside speed challenge mode

## Target User Experience
1. Onboarding and placement check:
     - Short intro explains game-end trigger and scoring categories.
     - User chooses either `Learn Scoring` or `Skip Check`.
2. Skip check (tutorial bypass):
     - User receives one full-game scoring assessment.
     - If all player totals are correct, tutorial is marked complete and Speed Challenge unlocks.
     - If not perfect, user is routed to guided tutorial with weak areas highlighted.
3. Guided mastery path by scoring subtype:
     - Subtypes: popularity tiers, stars, territories (including Factory), resources (pairing), structure bonus, total sum, winner/tiebreakers.
     - Each subtype gives multiple examples and immediate feedback.
     - Because this content is straightforward, first-try correct responses can fast-track progression.
4. Single-player integration stage:
     - Learner computes full score for one player end-to-end.
     - Must demonstrate stable correctness before multiplayer mode unlocks.
5. Multiplayer integration stage:
     - Start with 2 players, then increase to 3, 4, and 5 players.
     - Learner computes all totals and identifies winner with tiebreaker rules when needed.
6. Speed Challenge unlock:
     - Unlocks after mastery path completion or perfect skip check.
     - Timed full-game scoring rounds emphasize fluency under pressure.

## Mastery and Unlock Rules
- Subtype mastery:
    - Mark mastered when user answers correctly on first attempt for 2 consecutive examples, or reaches >= 80% within last 5 attempts.
- Single-player gate:
    - Require 2 consecutive correct full single-player score calculations.
- Multiplayer gate progression:
    - Unlock N+1 players after one correct full-round calculation at N players.
- Speed Challenge unlock:
    - Unlock when all required subtypes + single-player + multiplayer (up to 5) are complete.
    - Also unlock if skip check assessment is perfect.

## Data and Telemetry Requirements for UX
- Track per-user progress by subtype/KC:
    - `locked`, `in_progress`, `mastered`
- Track attempt metadata:
    - `first_try_correct`, attempts per subtype, time-to-answer, hint count used
- Track unlock events:
    - `single_player_unlocked`, `multiplayer_2_unlocked` ... `multiplayer_5_unlocked`, `speed_challenge_unlocked`

## Content Authoring Plan
- Create scenario banks by subtype:
    - Easy, medium, and trap examples for each scoring category
- Create full-game banks:
    - Single-player full-score scenarios
    - Multiplayer scenarios with at least one tiebreaker case

## Phase 1: Foundation
1. Define MVP and stretch scope in project docs.
2. Extend Supabase schema for:
	- `knowledge_components`
	- `scoring_scenarios`
	- `scenario_attempts`
	- `scenario_step_attempts`
	- `kc_mastery`
3. Generate migration and update `types/database.ts`.
4. Seed representative Scythe scenarios by difficulty and KC coverage.

## Phase 2: Scoring Intelligence (Inner Loop)
1. Implement scoring engine:
	- Stars
	- Territories
	- Resources (pairs)
	- Coins
	- Popularity multipliers
2. Implement constraint-based rule checks.
3. Implement error classification:
	- Incorrect multiplier
	- Miscounted resources
	- Arithmetic/summing error
	- Omitted category
4. Implement layered hints:
	- Level 1 conceptual
	- Level 2 targeted cue
	- Level 3 near-explicit correction
5. Add unit tests for scoring and classifiers.

## Phase 3: Tutor Experience
1. Add `/tutor` step-by-step practice flow.
2. Persist each learner response and feedback event.
3. Display immediate correctness and hints.
4. Add final score decomposition and mistake summary.

## Phase 4: Learner Model + Adaptation
1. Add lightweight KC mastery updates after each attempt.
2. Build progress view for mastery and recurring mistakes.
3. Implement adaptive scenario selection by weakest KCs.

## Phase 5: Stretch
1. Add timed speedrun mode.
2. Add optional LLM hint wording while keeping rule-based correctness.

## Maintenance Rule
Update `README.md` whenever a significant project change is made (architecture, setup, workflow, or developer experience).