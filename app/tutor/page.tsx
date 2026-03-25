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

function readParam(value: string | string[] | undefined): string | null {
  if (!value) {
    return null;
  }

  return Array.isArray(value) ? value[0] ?? null : value;
}

export default async function TutorPage({ searchParams }: TutorPageProps) {
  const user = await requireUser();
  const params = searchParams ? await searchParams : {};
  const successMessage = readParam(params.success);
  const errorMessage = readParam(params.error);

  const progress = await getTutorProgressState(user.id);
  const masteredAllSubtypes = allSubtypesMastered(progress.subtypeMastery);
  const singlePlayerUnlocked = progress.skipCheckPassed || masteredAllSubtypes;
  const multiplayerUnlocked = progress.skipCheckPassed || progress.singlePlayerMastered;

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
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-border bg-surface-2 p-3 text-sm">
              <p className="text-muted">Subtypes mastered</p>
              <p className="font-semibold">{masteredAllSubtypes ? "Complete" : "In progress"}</p>
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

        <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
          <Card className="space-y-3">
          <h2 className="text-xl font-semibold">Skip Check (Tutorial Bypass)</h2>
          <p className="text-sm text-muted">
            Submit one full-game assessment result. Perfect score unlocks tutorial completion and speed challenge.
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
              <Button type="submit" fullWidth>
                Submit Skip Check
              </Button>
            </div>
          </form>
          </Card>

          <Card className="space-y-3">
          <h2 className="text-xl font-semibold">Subtype Mastery</h2>
          <p className="text-sm text-muted">
            Record subtype practice outcomes. Mastery rule: 2 consecutive first-try correct or 80% in last 5.
          </p>
          <ul className="grid gap-2 sm:grid-cols-2">
            {SUBTYPE_IDS.map((subtypeId) => (
              <li key={subtypeId} className="rounded-lg border border-border bg-surface-2 p-3 text-sm">
                <span className="text-muted">{SUBTYPE_LABELS[subtypeId]}:</span>{" "}
                <span className="font-medium">{progress.subtypeMastery[subtypeId] ? "Mastered" : "Not mastered"}</span>
              </li>
            ))}
          </ul>

          <form action={recordSubtypePractice} className="grid gap-3 md:grid-cols-3">
            <label className="text-sm text-muted">
              Subtype
              <select
                name="subtype_id"
                className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-foreground"
                defaultValue={SUBTYPE_IDS[0]}
              >
                {SUBTYPE_IDS.map((subtypeId) => (
                  <option key={subtypeId} value={subtypeId}>
                    {SUBTYPE_LABELS[subtypeId]}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm text-muted">
              Result
              <select
                name="is_correct"
                className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-foreground"
                defaultValue="true"
              >
                <option value="true">Correct</option>
                <option value="false">Incorrect</option>
              </select>
            </label>

            <label className="text-sm text-muted">
              First try
              <select
                name="first_try_correct"
                className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-foreground"
                defaultValue="true"
              >
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            </label>
            <div className="md:col-span-3">
              <Button type="submit">Record Subtype Attempt</Button>
            </div>
          </form>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="space-y-3">
          <h2 className="text-xl font-semibold">Single-Player Gate</h2>
          <p className="text-sm text-muted">
            Locked until all subtypes are mastered (unless skip check passed). Requires 2 consecutive correct rounds.
          </p>
          {singlePlayerUnlocked ? (
            <div className="flex flex-wrap gap-3">
              <form action={recordSinglePlayerAttempt}>
                <input type="hidden" name="is_correct" value="true" />
                <Button type="submit">Record Correct Single-Player Round</Button>
              </form>
              <form action={recordSinglePlayerAttempt}>
                <input type="hidden" name="is_correct" value="false" />
                <Button type="submit" variant="secondary">
                  Record Incorrect Single-Player Round
                </Button>
              </form>
              <p className="text-sm text-muted">
                Current consecutive correct: {progress.singlePlayerConsecutiveCorrect}
              </p>
            </div>
          ) : (
            <p className="rounded-lg border border-border bg-surface-2 p-3 text-sm text-muted">
              Complete subtype mastery first to unlock single-player stage.
            </p>
          )}
          </Card>

          <Card className="space-y-3">
          <h2 className="text-xl font-semibold">Multiplayer Gate (2-5 Players)</h2>
          <p className="text-sm text-muted">
            Locked until single-player mastery. Correct result at current max unlocks the next player count.
          </p>
          {multiplayerUnlocked ? (
            <div className="space-y-3">
              <p className="text-sm text-muted">
                Current unlocked player count: <span className="font-semibold text-foreground">{progress.maxMultiplayerUnlocked}</span>
              </p>
              <div className="flex flex-wrap gap-3">
                <form action={recordMultiplayerAttempt}>
                  <input type="hidden" name="is_correct" value="true" />
                  <input
                    type="hidden"
                    name="player_count"
                    value={String(Math.max(2, progress.maxMultiplayerUnlocked))}
                  />
                  <Button type="submit">Record Correct Multiplayer Round</Button>
                </form>
                <form action={recordMultiplayerAttempt}>
                  <input type="hidden" name="is_correct" value="false" />
                  <input
                    type="hidden"
                    name="player_count"
                    value={String(Math.max(2, progress.maxMultiplayerUnlocked))}
                  />
                  <Button type="submit" variant="secondary">
                    Record Incorrect Multiplayer Round
                  </Button>
                </form>
              </div>
            </div>
          ) : (
            <p className="rounded-lg border border-border bg-surface-2 p-3 text-sm text-muted">
              Complete single-player gate first to unlock multiplayer progression.
            </p>
          )}
          </Card>
        </div>
      </div>
    </main>
  );
}
