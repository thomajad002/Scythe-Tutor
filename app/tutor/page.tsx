import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BoardMap } from "@/components/tutor/board-map";
import { CoinPile } from "@/components/tutor/coin-pile";
import { requireUser } from "@/lib/auth/server";
import {
  refreshTemporarySubtypeScenario,
  refreshTemporaryMultiplayerScenario,
  refreshTemporarySinglePlayerScenario,
  submitSubtypeTutorAttempt,
  submitMultiplayerScoringAttempt,
  submitSinglePlayerScoringAttempt,
  submitSkipCheckAssessment,
} from "@/lib/tutor/actions";
import { SUBTYPE_IDS, allSubtypesMastered } from "@/lib/tutor/progression";
import { getTutorProgressState } from "@/lib/tutor/server";
import {
  getTemporaryScenarioById,
  getTemporaryScenarioForPlayerCount,
} from "@/lib/tutor/temp-scenarios";

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

function parseSubtypeId(value: string | null): (typeof SUBTYPE_IDS)[number] | null {
  if (!value) {
    return null;
  }

  const subtypeId = value as (typeof SUBTYPE_IDS)[number];
  return SUBTYPE_IDS.includes(subtypeId) ? subtypeId : null;
}

function readParam(value: string | string[] | undefined): string | null {
  if (!value) {
    return null;
  }

  return Array.isArray(value) ? value[0] ?? null : value;
}

function readIntParam(value: string | string[] | undefined): number | null {
  const parsed = Number.parseInt(readParam(value) ?? "", 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function stageAllowed(
  stage: StageId,
  progress: Awaited<ReturnType<typeof getTutorProgressState>>,
  masteredAllSubtypes: boolean,
): boolean {
  switch (stage) {
    case "subtype":
      return true;
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
  const summaryMessage = readParam(params.summary);
  const hintsMessage = readParam(params.hints);
  const requestedStage = parseStage(readParam(params.stage));
  const requestedSubtypeId = parseSubtypeId(readParam(params.subtype));
  const requestedScenarioId = readParam(params.scenario);
  const requestedPlayers = readIntParam(params.players);

  const progress = await getTutorProgressState(user.id);
  const masteredAllSubtypes = allSubtypesMastered(progress.subtypeMastery);
  const defaultStage = getDefaultStage(progress, masteredAllSubtypes);
  const activeStage = requestedStage && stageAllowed(requestedStage, progress, masteredAllSubtypes)
    ? requestedStage
    : defaultStage;

  const masteredCount = SUBTYPE_IDS.filter((subtypeId) => progress.subtypeMastery[subtypeId]).length;
  const nextSubtype = SUBTYPE_IDS.find((subtypeId) => !progress.subtypeMastery[subtypeId]) ?? SUBTYPE_IDS[0];
  const activeSubtype = requestedSubtypeId ?? nextSubtype;
  const singlePlayerUnlocked = progress.skipCheckPassed || masteredAllSubtypes;
  const multiplayerUnlocked = progress.skipCheckPassed || progress.singlePlayerMastered;
  const activeMultiplayerTarget = Math.max(2, Math.min(5, progress.maxMultiplayerUnlocked));
  const selectedMultiplayerCount = requestedPlayers && requestedPlayers >= 2 && requestedPlayers <= 5
    ? requestedPlayers
    : activeMultiplayerTarget;

  const subtypePlayerCount = activeSubtype === "winner_tiebreakers" ? 2 : 1;
  const fallbackSubtypeScenario = await getTemporaryScenarioForPlayerCount(user.id, subtypePlayerCount);
  const subtypeScenarioCandidate = requestedScenarioId
    ? await getTemporaryScenarioById(requestedScenarioId)
    : null;
  const subtypeScenario = subtypeScenarioCandidate && subtypeScenarioCandidate.playerCount === subtypePlayerCount
    ? subtypeScenarioCandidate
    : fallbackSubtypeScenario;

  const fallbackSingleScenario = await getTemporaryScenarioForPlayerCount(user.id, 1);
  const singleScenarioCandidate = requestedScenarioId
    ? await getTemporaryScenarioById(requestedScenarioId)
    : null;
  const singleScenario = singleScenarioCandidate && singleScenarioCandidate.playerCount === 1
    ? singleScenarioCandidate
    : fallbackSingleScenario;

  const fallbackMultiplayerScenario = await getTemporaryScenarioForPlayerCount(user.id, selectedMultiplayerCount);
  const multiplayerScenarioCandidate = requestedScenarioId
    ? await getTemporaryScenarioById(requestedScenarioId)
    : null;
  const multiplayerScenario = multiplayerScenarioCandidate && multiplayerScenarioCandidate.playerCount === selectedMultiplayerCount
    ? multiplayerScenarioCandidate
    : fallbackMultiplayerScenario;

  const coinPlayers =
    activeStage === "multiplayer"
      ? multiplayerScenario.players
      : activeStage === "subtype"
        ? subtypeScenario.players
        : singleScenario.players;

  const activeCoinScenarioId =
    activeStage === "multiplayer"
      ? multiplayerScenario.id
      : activeStage === "subtype"
        ? subtypeScenario.id
        : singleScenario.id;

  return (
    <main className="mx-auto min-h-full w-full max-w-6xl px-4 py-4 sm:px-6 sm:py-5">
      <div className="grid gap-4 2xl:grid-cols-[minmax(0,1fr)_300px]">
        <Card className="space-y-4">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.2em] text-accent-strong">Guided Mastery Track</p>
            <h1 className="text-3xl">Scythe Tutor</h1>
            <p className="text-sm text-muted">
              Gate order: subtypes -&gt; single-player -&gt; multiplayer 2-5 -&gt; speed challenge.
            </p>
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
          {summaryMessage ? (
            <p className="rounded-xl border border-sky-500/40 bg-sky-500/10 p-3 text-sm text-sky-200">
              {summaryMessage}
            </p>
          ) : null}
          {hintsMessage ? (
            <p className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-200">
              Hints: {hintsMessage}
            </p>
          ) : null}

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
                Focus on one subtype at a time. Current target: <span className="text-foreground">{SUBTYPE_LABELS[activeSubtype]}</span>
              </p>

              <form method="get" className="flex flex-wrap items-end gap-2 rounded-lg border border-border bg-surface-2 p-3">
                <input type="hidden" name="stage" value="subtype" />
                <label className="text-sm text-muted">
                  Review subtype
                  <select
                    name="subtype"
                    defaultValue={activeSubtype}
                    className="mt-1 min-w-[220px] rounded-lg border border-border bg-surface px-3 py-2 text-foreground"
                  >
                    {SUBTYPE_IDS.map((subtypeId) => (
                      <option key={subtypeId} value={subtypeId}>{SUBTYPE_LABELS[subtypeId]}</option>
                    ))}
                  </select>
                </label>
                <Button type="submit" variant="secondary">Load Subtype</Button>
              </form>

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

              <p className="text-sm text-muted">Scenario <span className="text-foreground">{subtypeScenario.id}</span></p>
              <BoardMap
                boardImagePath={subtypeScenario.boardImagePath}
                boardImageWidth={subtypeScenario.boardImageWidth}
                boardImageHeight={subtypeScenario.boardImageHeight}
                piecePlacements={subtypeScenario.piecePlacements}
                className="w-full"
              />

              <div className="grid gap-2 rounded-xl border border-border bg-surface-2 p-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
                {subtypeScenario.players.map((player) => (
                  <div key={player.playerId} className="rounded-lg border border-border/60 bg-surface p-3">
                    <p className="font-medium">{player.displayName}</p>
                    <p className="text-muted">Stars {player.stars} | Territories {player.territories}</p>
                    <p className="text-muted">Resources {player.resources} | Coins {player.coins}</p>
                    <p className="text-muted">Popularity {player.popularity} | Factory {player.factoryControlled ? "Yes" : "No"}</p>
                    <p className="text-muted">Structure bonus {player.structureBonusCoins ?? 0}</p>
                  </div>
                ))}
              </div>

              <form action={submitSubtypeTutorAttempt} className="space-y-3">
                <input type="hidden" name="subtype_id" value={activeSubtype} />
                <input type="hidden" name="scenario_id" value={subtypeScenario.id} />

                {activeSubtype === "popularity_tiers" ? (
                  <label className="block text-sm text-muted">
                    Select popularity tier
                    <select name="value" className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-foreground" defaultValue="low">
                      <option value="low">low (0-6)</option>
                      <option value="mid">mid (7-12)</option>
                      <option value="high">high (13-18)</option>
                    </select>
                  </label>
                ) : null}

                {activeSubtype === "winner_tiebreakers" ? (
                  <label className="block text-sm text-muted">
                    Choose winner
                    <select name="winner_id" className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-foreground" defaultValue={subtypeScenario.players[0]?.playerId}>
                      {subtypeScenario.players.map((player) => (
                        <option key={player.playerId} value={player.playerId}>{player.displayName}</option>
                      ))}
                    </select>
                  </label>
                ) : null}

                {activeSubtype !== "popularity_tiers" && activeSubtype !== "winner_tiebreakers" ? (
                  <label className="block text-sm text-muted">
                    Enter computed value for {SUBTYPE_LABELS[activeSubtype]}
                    <input className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-foreground" type="number" name="value" required />
                  </label>
                ) : null}

                <div className="flex flex-wrap gap-2">
                  <Button type="submit" name="hint_level" value="1">Submit (L1 Hint)</Button>
                  <Button type="submit" name="hint_level" value="2" variant="secondary">Submit (L2 Hint)</Button>
                  <Button type="submit" name="hint_level" value="3" variant="danger">Submit (L3 Hint)</Button>
                </div>
              </form>

              <form action={refreshTemporarySubtypeScenario}>
                <input type="hidden" name="subtype_id" value={activeSubtype} />
                <Button type="submit" variant="secondary">Load Different Temporary Scenario</Button>
              </form>
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
                  <input className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-foreground" type="number" name="total_players" min={1} max={7} defaultValue={5} />
                </label>
                <label className="text-sm text-muted">
                  Correct players
                  <input className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-foreground" type="number" name="correct_players" min={0} max={7} defaultValue={0} />
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
              {singlePlayerUnlocked ? (
                <div className="space-y-3">
                  <p className="text-sm text-muted">Scenario <span className="text-foreground">{singleScenario.id}</span> | Consecutive correct: {progress.singlePlayerConsecutiveCorrect}</p>
                  <BoardMap
                    boardImagePath={singleScenario.boardImagePath}
                    boardImageWidth={singleScenario.boardImageWidth}
                    boardImageHeight={singleScenario.boardImageHeight}
                    piecePlacements={singleScenario.piecePlacements}
                    className="w-full"
                  />

                  <div className="grid gap-2 rounded-xl border border-border bg-surface-2 p-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
                    <p>Stars: {singleScenario.players[0].stars}</p>
                    <p>Territories: {singleScenario.players[0].territories}</p>
                    <p>Resources: {singleScenario.players[0].resources}</p>
                    <p>Coins: {singleScenario.players[0].coins}</p>
                    <p>Popularity: {singleScenario.players[0].popularity}</p>
                    <p>Factory controlled: {singleScenario.players[0].factoryControlled ? "Yes" : "No"}</p>
                    <p>Structure bonus: {singleScenario.players[0].structureBonusCoins ?? 0}</p>
                    <p className="sm:col-span-2 lg:col-span-3">Temporary unit hexes: {singleScenario.players[0].temporaryLocations.unitHexes.join(", ")}</p>
                  </div>

                  <form action={submitSinglePlayerScoringAttempt} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <input type="hidden" name="scenario_id" value={singleScenario.id} />
                    <label className="text-sm text-muted">Stars points<input className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-foreground" type="number" name="stars" required /></label>
                    <label className="text-sm text-muted">Territories points<input className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-foreground" type="number" name="territories" required /></label>
                    <label className="text-sm text-muted">Resources points<input className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-foreground" type="number" name="resources" required /></label>
                    <label className="text-sm text-muted">Coins points<input className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-foreground" type="number" name="coins" required /></label>
                    <label className="text-sm text-muted">Structure bonus points<input className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-foreground" type="number" name="structure_bonus" required /></label>
                    <label className="text-sm text-muted">Total<input className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-foreground" type="number" name="total" required /></label>
                    <div className="flex flex-wrap gap-2 sm:col-span-2 lg:col-span-3">
                      <Button type="submit" name="hint_level" value="1">Submit (L1 Hint)</Button>
                      <Button type="submit" name="hint_level" value="2" variant="secondary">Submit (L2 Hint)</Button>
                      <Button type="submit" name="hint_level" value="3" variant="danger">Submit (L3 Hint)</Button>
                    </div>
                  </form>

                  <form action={refreshTemporarySinglePlayerScenario}>
                    <Button type="submit" variant="secondary">Load Different Temporary Scenario</Button>
                  </form>
                </div>
              ) : (
                <p className="rounded-lg border border-border bg-surface-2 p-3 text-sm text-muted">Locked until subtype mastery is complete.</p>
              )}
            </div>
          ) : null}

          {activeStage === "multiplayer" ? (
            <div className="space-y-4">
              <h2 className="text-2xl">Walkthrough: Multiplayer Gate</h2>
              <p className="text-sm text-muted">Current stage focuses on <span className="text-foreground">{selectedMultiplayerCount} players</span>.</p>
              {multiplayerUnlocked ? (
                <div className="space-y-3">
                  <p className="text-sm text-muted">Scenario <span className="text-foreground">{multiplayerScenario.id}</span></p>
                  <BoardMap
                    boardImagePath={multiplayerScenario.boardImagePath}
                    boardImageWidth={multiplayerScenario.boardImageWidth}
                    boardImageHeight={multiplayerScenario.boardImageHeight}
                    piecePlacements={multiplayerScenario.piecePlacements}
                    className="w-full"
                  />

                  <form action={submitMultiplayerScoringAttempt} className="space-y-3">
                    <input type="hidden" name="scenario_id" value={multiplayerScenario.id} />
                    <input type="hidden" name="player_count" value={String(selectedMultiplayerCount)} />

                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {multiplayerScenario.players.map((player) => (
                        <label key={player.playerId} className="text-sm text-muted">
                          {player.displayName} total (Stars {player.stars}, Territories {player.territories}, Resources {player.resources}, Coins {player.coins}, Pop {player.popularity})
                          <input className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-foreground" type="number" name={`total_${player.playerId}`} required />
                        </label>
                      ))}
                    </div>

                    <label className="text-sm text-muted">
                      Winner
                      <select name="winner_id" className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-foreground">
                        {multiplayerScenario.players.map((player) => (
                          <option key={player.playerId} value={player.playerId}>{player.displayName}</option>
                        ))}
                      </select>
                    </label>

                    <Button type="submit">Submit Multiplayer Round</Button>
                  </form>

                  <form action={refreshTemporaryMultiplayerScenario}>
                    <input type="hidden" name="player_count" value={String(selectedMultiplayerCount)} />
                    <Button type="submit" variant="secondary">Load Different Temporary Scenario</Button>
                  </form>
                </div>
              ) : (
                <p className="rounded-lg border border-border bg-surface-2 p-3 text-sm text-muted">Locked until single-player gate is mastered.</p>
              )}
            </div>
          ) : null}

          {activeStage === "speed" ? (
            <div className="space-y-4">
              <h2 className="text-2xl">Speed Challenge Unlocked</h2>
              <p className="text-sm text-muted">
                You have cleared all required gates. Next implementation step is timed full-game rounds with countdown and scoring latency tracking.
              </p>
              <p className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-200">Ready state reached.</p>
            </div>
          ) : null}
        </Card>

        <aside className="space-y-4">
          <Card className="space-y-3">
            <h3 className="text-sm uppercase tracking-[0.08em] text-accent-strong">Mastery Progress</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-muted">
                <span>Subtype Mastery</span>
                <span>{masteredCount}/{SUBTYPE_IDS.length}</span>
              </div>
              <div className="h-2 w-full rounded-full bg-surface-3">
                <div className="h-2 rounded-full bg-accent" style={{ width: `${(masteredCount / SUBTYPE_IDS.length) * 100}%` }} />
              </div>
            </div>

            <div className="grid gap-2 text-sm">
              <div className="rounded-lg border border-border bg-surface-2 p-2">
                <p className="text-muted">Subtypes</p>
                <p className="font-medium">{masteredAllSubtypes ? "Complete" : `${masteredCount} complete`}</p>
              </div>
              <div className="rounded-lg border border-border bg-surface-2 p-2">
                <p className="text-muted">Single-player</p>
                <p className="font-medium">{progress.singlePlayerMastered ? "Mastered" : "In progress"}</p>
              </div>
              <div className="rounded-lg border border-border bg-surface-2 p-2">
                <p className="text-muted">Multiplayer</p>
                <p className="font-medium">Up to {progress.maxMultiplayerUnlocked} players</p>
              </div>
              <div className="rounded-lg border border-border bg-surface-2 p-2">
                <p className="text-muted">Speed challenge</p>
                <p className="font-medium">{progress.speedChallengeUnlocked ? "Unlocked" : "Locked"}</p>
              </div>
            </div>
          </Card>

          <CoinPile
            scenarioId={activeCoinScenarioId}
            players={coinPlayers.map((player) => ({
              playerId: player.playerId,
              displayName: player.displayName,
              coins: player.coins,
            }))}
          />
        </aside>
      </div>
    </main>
  );
}
