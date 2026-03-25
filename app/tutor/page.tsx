import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/server";
import {
  recordMultiplayerAttempt,
  recordSinglePlayerAttempt,
  recordSubtypePractice,
  submitSkipCheckAssessment,
} from "@/lib/tutor/actions";
import { SUBTYPE_IDS, allSubtypesMastered } from "@/lib/tutor/progression";
import { getTutorProgressState } from "@/lib/tutor/server";

const SUBTYPE_LABELS: Record<(typeof SUBTYPE_IDS)[number], string> = {
  popularity_tiers: "Popularity tiers",
  stars_scoring: "Stars scoring",
  territories_scoring: "Territories scoring (Factory included)",
  resources_scoring: "Resources scoring (pairs)",
  structure_bonus_scoring: "Structure bonus tile",
  total_scoring: "Total scoring",
  winner_tiebreakers: "Winner and tiebreakers",
};

type TutorPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

type StageId = "subtype" | "skip-check" | "single-player" | "multiplayer" | "speed";

const STAGE_LABELS: Record<StageId, string> = {
  subtype: "1. Subtype Mastery",
  "skip-check": "Skip Check",
  "single-player": "2. Single Player",
  multiplayer: "3. Multiplayer",
  speed: "4. Speed Challenge",
};

function parseStage(value: string | null): StageId | null {
  if (!value) {
    return null;
  }

  const stage = value as StageId;
  if (!(stage in STAGE_LABELS)) {
    return null;
  }

  return stage;
}

function readParam(value: string | string[] | undefined): string | null {
  if (!value) {
    return null;
  }

  return Array.isArray(value) ? value[0] ?? null : value;
}

function stageAllowed(
  stage: StageId,
  progress: Awaited<ReturnType<typeof getTutorProgressState>>,
  masteredAllSubtypes: boolean,
): boolean {
  switch (stage) {
    case "subtype":
      return !progress.skipCheckPassed;
    case "skip-check":
      return !progress.tutorialCompleted;
    case "single-player":
      return progress.skipCheckPassed || masteredAllSubtypes;
    case "multiplayer":
      return progress.skipCheckPassed || progress.singlePlayerMastered;
    case "speed":
      return progress.speedChallengeUnlocked;
    default:
      return false;
  }
}

function getDefaultStage(
  progress: Awaited<ReturnType<typeof getTutorProgressState>>,
  masteredAllSubtypes: boolean,
): StageId {
  if (progress.speedChallengeUnlocked) {
    return "speed";
  }

  if (!progress.skipCheckPassed && !masteredAllSubtypes) {
    return "subtype";
  }

  if (progress.skipCheckPassed || !progress.singlePlayerMastered) {
    return progress.skipCheckPassed ? "multiplayer" : "single-player";
  }

  if (progress.maxMultiplayerUnlocked < 5) {
    return "multiplayer";
  }

  return "speed";
}

export default async function TutorPage({ searchParams }: TutorPageProps) {
  const user = await requireUser();
  const params = searchParams ? await searchParams : {};
  const successMessage = readParam(params.success);
  const errorMessage = readParam(params.error);
  const requestedStage = parseStage(readParam(params.stage));

  const progress = await getTutorProgressState(user.id);
  const masteredAllSubtypes = allSubtypesMastered(progress.subtypeMastery);
  const defaultStage = getDefaultStage(progress, masteredAllSubtypes);
  const activeStage = requestedStage && stageAllowed(requestedStage, progress, masteredAllSubtypes)
    ? requestedStage
    : defaultStage;

  const masteredCount = SUBTYPE_IDS.filter((subtypeId) => progress.subtypeMastery[subtypeId]).length;
  const nextSubtype = SUBTYPE_IDS.find((subtypeId) => !progress.subtypeMastery[subtypeId]) ?? SUBTYPE_IDS[0];
  const singlePlayerUnlocked = progress.skipCheckPassed || masteredAllSubtypes;
  const multiplayerUnlocked = progress.skipCheckPassed || progress.singlePlayerMastered;
  const activeMultiplayerTarget = Math.max(2, Math.min(5, progress.maxMultiplayerUnlocked));

  return (
    <main className="mx-auto min-h-full w-full max-w-6xl px-6 py-10 sm:px-10 sm:py-12">
      <div className="w-full space-y-6">
        <Card className="relative overflow-hidden space-y-5">
          <div className="pointer-events-none absolute -right-20 top-0 h-56 w-56 rounded-full bg-accent/20 blur-3xl" />
          <p className="text-xs uppercase tracking-[0.2em] text-accent-strong">Guided Mastery Track</p>
          <h1 className="text-4xl">Scythe Tutor</h1>
          <p className="max-w-3xl text-sm text-muted">
            Gate order is enforced in this MVP: subtypes -&gt; single-player -&gt; multiplayer 2-5 -&gt; speed challenge.
            Perfect skip-check can unlock immediately.
          </p>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-muted">
              <span>Subtype Mastery Progress</span>
              <span>{masteredCount}/{SUBTYPE_IDS.length}</span>
            </div>
            <div className="h-2 w-full rounded-full bg-surface-3">
              <div
                className="h-2 rounded-full bg-accent transition-all"
                style={{ width: `${(masteredCount / SUBTYPE_IDS.length) * 100}%` }}
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-border bg-surface-2 p-3 text-sm">
              <p className="text-muted">Subtypes mastered</p>
              <p className="font-semibold">{masteredAllSubtypes ? "Complete" : `${masteredCount} complete`}</p>
            </div>
            <div className="rounded-xl border border-border bg-surface-2 p-3 text-sm">
              <p className="text-muted">Single-player</p>
              <p className="font-semibold">{progress.singlePlayerMastered ? "Mastered" : "Locked/In progress"}</p>
            </div>
            <div className="rounded-xl border border-border bg-surface-2 p-3 text-sm">
              <p className="text-muted">Multiplayer unlocked up to</p>
              <p className="font-semibold">{progress.maxMultiplayerUnlocked} players</p>
            </div>
            <div className="rounded-xl border border-border bg-surface-2 p-3 text-sm">
              <p className="text-muted">Speed challenge</p>
              <p className="font-semibold">{progress.speedChallengeUnlocked ? "Unlocked" : "Locked"}</p>
            </div>
          </div>
          {successMessage ? (
            <p className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-200">
              {successMessage}
            </p>
          ) : null}
          {errorMessage ? (
            <p className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-200">
              {errorMessage}
            </p>
          ) : null}
        </Card>

        <Card className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {(Object.keys(STAGE_LABELS) as StageId[]).map((stage) => {
              const allowed = stageAllowed(stage, progress, masteredAllSubtypes);
              const active = activeStage === stage;

              return (
                <Link
                  key={stage}
                  href={`/tutor?stage=${encodeURIComponent(stage)}`}
                  aria-disabled={!allowed}
                  className={`rounded-lg border px-3 py-2 text-xs tracking-[0.04em] ${
                    active
                      ? "border-accent bg-accent text-[#201407]"
                      : allowed
                        ? "border-border bg-surface-2 text-foreground"
                        : "cursor-not-allowed border-border/40 bg-surface-2/40 text-muted"
                  }`}
                >
                  {STAGE_LABELS[stage]}
                </Link>
              );
            })}
          </div>

          {activeStage === "subtype" ? (
            <div className="space-y-4">
              <h2 className="text-2xl">Walkthrough: Subtype Mastery</h2>
              <p className="text-sm text-muted">
                Focus only on one subtype at a time. Current target: <span className="text-foreground">{SUBTYPE_LABELS[nextSubtype]}</span>
              </p>

              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {SUBTYPE_IDS.map((subtypeId) => (
                  <div key={subtypeId} className="rounded-lg border border-border bg-surface-2 p-3 text-sm">
                    <p className="text-muted">{SUBTYPE_LABELS[subtypeId]}</p>
                    <p className={`mt-1 font-medium ${progress.subtypeMastery[subtypeId] ? "text-emerald-300" : "text-amber-200"}`}>
                      {progress.subtypeMastery[subtypeId] ? "Mastered" : "In progress"}
                    </p>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap gap-3">
                <form action={recordSubtypePractice}>
                  <input type="hidden" name="subtype_id" value={nextSubtype} />
                  <input type="hidden" name="is_correct" value="true" />
                  <input type="hidden" name="first_try_correct" value="true" />
                  <Button type="submit">Correct On First Try</Button>
                </form>
                <form action={recordSubtypePractice}>
                  <input type="hidden" name="subtype_id" value={nextSubtype} />
                  <input type="hidden" name="is_correct" value="true" />
                  <input type="hidden" name="first_try_correct" value="false" />
                  <Button type="submit" variant="secondary">Correct After Hint</Button>
                </form>
                <form action={recordSubtypePractice}>
                  <input type="hidden" name="subtype_id" value={nextSubtype} />
                  <input type="hidden" name="is_correct" value="false" />
                  <input type="hidden" name="first_try_correct" value="false" />
                  <Button type="submit" variant="danger">Incorrect Attempt</Button>
                </form>
              </div>

              <Link href="/tutor?stage=skip-check" className="text-sm text-accent-strong hover:underline">
                Prefer to bypass tutorial? Try skip-check assessment.
              </Link>
            </div>
          ) : null}

          {activeStage === "skip-check" ? (
            <div className="space-y-4">
              <h2 className="text-2xl">Walkthrough: Skip Check</h2>
              <p className="text-sm text-muted">
                Submit one full-game scoring assessment. Perfect means immediate tutorial completion and speed unlock.
              </p>
              <form action={submitSkipCheckAssessment} className="grid gap-3 sm:grid-cols-3">
                <label className="text-sm text-muted">
                  Total players
                  <input
                    className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-foreground"
                    type="number"
                    name="total_players"
                    min={1}
                    max={7}
                    defaultValue={5}
                  />
                </label>
                <label className="text-sm text-muted">
                  Correct players
                  <input
                    className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-foreground"
                    type="number"
                    name="correct_players"
                    min={0}
                    max={7}
                    defaultValue={0}
                  />
                </label>
                <div className="flex items-end">
                  <Button type="submit" fullWidth>Submit Skip Check</Button>
                </div>
              </form>
            </div>
          ) : null}

          {activeStage === "single-player" ? (
            <div className="space-y-4">
              <h2 className="text-2xl">Walkthrough: Single-Player Gate</h2>
              <p className="text-sm text-muted">
                Require 2 consecutive correct full-score calculations before multiplayer unlocks.
              </p>
              {singlePlayerUnlocked ? (
                <div className="space-y-3">
                  <p className="text-sm text-muted">Consecutive correct: {progress.singlePlayerConsecutiveCorrect}</p>
                  <div className="flex flex-wrap gap-3">
                    <form action={recordSinglePlayerAttempt}>
                      <input type="hidden" name="is_correct" value="true" />
                      <Button type="submit">Record Correct Round</Button>
                    </form>
                    <form action={recordSinglePlayerAttempt}>
                      <input type="hidden" name="is_correct" value="false" />
                      <Button type="submit" variant="secondary">Record Incorrect Round</Button>
                    </form>
                  </div>
                </div>
              ) : (
                <p className="rounded-lg border border-border bg-surface-2 p-3 text-sm text-muted">
                  Locked until subtype mastery is complete.
                </p>
              )}
            </div>
          ) : null}

          {activeStage === "multiplayer" ? (
            <div className="space-y-4">
              <h2 className="text-2xl">Walkthrough: Multiplayer Gate</h2>
              <p className="text-sm text-muted">
                Current stage focuses on <span className="text-foreground">{activeMultiplayerTarget} players</span>. A correct round unlocks the next player count.
              </p>
              {multiplayerUnlocked ? (
                <div className="flex flex-wrap gap-3">
                  <form action={recordMultiplayerAttempt}>
                    <input type="hidden" name="is_correct" value="true" />
                    <input type="hidden" name="player_count" value={String(activeMultiplayerTarget)} />
                    <Button type="submit">Record Correct {activeMultiplayerTarget}-Player Round</Button>
                  </form>
                  <form action={recordMultiplayerAttempt}>
                    <input type="hidden" name="is_correct" value="false" />
                    <input type="hidden" name="player_count" value={String(activeMultiplayerTarget)} />
                    <Button type="submit" variant="secondary">Record Incorrect Round</Button>
                  </form>
                </div>
              ) : (
                <p className="rounded-lg border border-border bg-surface-2 p-3 text-sm text-muted">
                  Locked until single-player gate is mastered.
                </p>
              )}
            </div>
          ) : null}

          {activeStage === "speed" ? (
            <div className="space-y-4">
              <h2 className="text-2xl">Speed Challenge Unlocked</h2>
              <p className="text-sm text-muted">
                You have cleared all required gates. Next implementation step is timed full-game rounds with countdown and scoring latency tracking.
              </p>
              <p className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-200">
                Ready state reached. Build timed challenge interactions next.
              </p>
            </div>
          ) : null}
        </Card>
      </div>
    </main>
  );
}
