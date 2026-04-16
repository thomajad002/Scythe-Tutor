import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BoardMap } from "@/components/tutor/board-map";
import { CoinPile } from "@/components/tutor/coin-pile";
import { FactionLabel, formatFactionLabel } from "@/components/tutor/faction-label";
import { TotalScoringForm } from "@/components/tutor/total-scoring-form";
import { requireUser } from "@/lib/auth/server";
import { loadScytheBoardData } from "@/lib/scythe/board-data";
import {
  refreshTemporaryMultiplayerScenario,
  refreshTemporarySinglePlayerScenario,
  refreshTemporarySubtypeScenario,
  submitSubtypeTutorAttempt,
  submitMultiplayerScoringAttempt,
  submitSinglePlayerScoringAttempt,
} from "@/lib/tutor/actions";
import { SUBTYPE_IDS, allSubtypesMastered, getAdaptiveWinnerTiebreakerPlayerCount, isSubtypeUnlocked } from "@/lib/tutor/progression";
import { getSubtypeAttemptHistory, getTerritoriesFactoryCoverage, getTutorProgressState } from "@/lib/tutor/server";
import {
  getTemporaryScenarioById,
  getTemporaryScenarioForPlayerCount,
  type PiecePlacement,
} from "@/lib/tutor/scenario-bank";

const SUBTYPE_LABELS: Record<(typeof SUBTYPE_IDS)[number], string> = {
  popularity_tiers: "Popularity tiers",
  stars_scoring: "Stars scoring",
  territories_scoring: "Territories scoring (Factory included)",
  resources_scoring: "Resources scoring (pairs)",
  structure_bonus_farm_or_tundra: "Structure bonus: farm or tundra",
  structure_bonus_tunnel_with_structures: "Structure bonus: tunnel with structures",
  structure_bonus_longest_structure_row: "Structure bonus: longest structure row",
  structure_bonus_tunnel_adjacent: "Structure bonus: tunnel adjacent",
  structure_bonus_encounter_adjacent: "Structure bonus: encounter adjacent",
  structure_bonus_lake_adjacent: "Structure bonus: lake adjacent",
  total_scoring: "Total scoring",
  winner_tiebreakers: "Tie training: winner and reason",
};

const WINNER_TIEBREAK_REASON_LABELS: Record<string, string> = {
  unitsAndStructures: "Workers + mechs + structures",
  power: "Power",
  popularity: "Popularity",
  resources: "Resource tokens controlled",
  territories: "Territories controlled",
  stars: "Stars placed",
  shared: "Shared tiebreak stats",
};

type TutorPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

type StageId = "subtype" | "single-player" | "multiplayer" | "speed";

const STAGE_LABELS: Record<StageId, string> = {
  subtype: "1. Subtype Mastery",
  "single-player": "2. Single Player",
  multiplayer: "3. Multiplayer",
  speed: "4. Speed Challenge",
};

const STRUCTURE_BONUS_SUBTYPE_IDS = new Set([
  "structure_bonus_farm_or_tundra",
  "structure_bonus_tunnel_with_structures",
  "structure_bonus_longest_structure_row",
  "structure_bonus_tunnel_adjacent",
  "structure_bonus_encounter_adjacent",
  "structure_bonus_lake_adjacent",
]);

const HEX_DETAIL_SUBTYPE_IDS = new Set([
  "territories_scoring",
  "resources_scoring",
  "structure_bonus_farm_or_tundra",
  "structure_bonus_tunnel_with_structures",
  "structure_bonus_longest_structure_row",
  "structure_bonus_tunnel_adjacent",
  "structure_bonus_encounter_adjacent",
  "structure_bonus_lake_adjacent",
  "total_scoring",
  "winner_tiebreakers",
]);

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

function parseHintsMessage(message: string | null): string[] {
  if (!message) {
    return [];
  }

  return message
    .split(" | ")
    .map((hint) => hint.trim())
    .filter(Boolean);
}

function HintList({ message }: { message: string | null }) {
  const hints = parseHintsMessage(message);

  if (hints.length === 0) {
    return null;
  }

  return (
    <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-200">
      <p className="font-medium">Hints</p>
      <ul className="mt-2 list-disc space-y-1 pl-5">
        {hints.map((hint, index) => (
          <li key={`${index}-${hint}`}>{hint}</li>
        ))}
      </ul>
    </div>
  );
}

function chooseTerritoriesFactoryMode(coverage: Awaited<ReturnType<typeof getTerritoriesFactoryCoverage>>): "with_factory" | "without_factory" {
  if (!coverage.attemptedWithFactory && !coverage.attemptedWithoutFactory) {
    return "without_factory";
  }

  if (!coverage.attemptedWithFactory) {
    return "with_factory";
  }

  if (!coverage.attemptedWithoutFactory) {
    return "without_factory";
  }

  if (coverage.correctWithFactory && !coverage.correctWithoutFactory) {
    return "without_factory";
  }

  if (!coverage.correctWithFactory && coverage.correctWithoutFactory) {
    return "with_factory";
  }

  return Math.random() < 0.5 ? "with_factory" : "without_factory";
}

function stageAllowed(
  stage: StageId,
  progress: Awaited<ReturnType<typeof getTutorProgressState>>,
  masteredAllSubtypes: boolean,
): boolean {
  switch (stage) {
    case "subtype":
      return true;
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

function parseHexId(piece: PiecePlacement): number | null {
  if (piece.kind === "worker") {
    const match = piece.id.match(/-worker-(\d+)-/);
    return match ? Number.parseInt(match[1], 10) : null;
  }

  if (piece.kind === "mech") {
    const match = piece.id.match(/-mech-(\d+)(?:-|$)/);
    return match ? Number.parseInt(match[1], 10) : null;
  }

  if (piece.kind === "structure") {
    const match = piece.id.match(/-structure-(\d+)-/);
    return match ? Number.parseInt(match[1], 10) : null;
  }

  if (piece.kind === "resource") {
    const match = piece.id.match(/-resource-(\d+)-/);
    return match ? Number.parseInt(match[1], 10) : null;
  }

  return null;
}

function dedupeByHexForKind(pieces: PiecePlacement[], kind: PiecePlacement["kind"]): PiecePlacement[] {
  const seenHexes = new Set<number>();
  const deduped: PiecePlacement[] = [];

  for (const piece of pieces) {
    if (piece.kind !== kind) {
      continue;
    }

    const hexId = parseHexId(piece);
    if (hexId === null) {
      deduped.push(piece);
      continue;
    }

    if (seenHexes.has(hexId)) {
      continue;
    }

    seenHexes.add(hexId);
    deduped.push(piece);
  }

  return deduped;
}

function filterSubtypePlacements(
  subtypeId: (typeof SUBTYPE_IDS)[number],
  placements: PiecePlacement[],
  focusPlayerId: string,
): PiecePlacement[] {
  const playerPieces = placements.filter((piece) => piece.playerId === focusPlayerId);
  const boardPieces = placements.filter((piece) => piece.playerId === "board");

  const popularity = playerPieces.filter((piece) => piece.kind === "popularity");
  const stars = playerPieces.filter((piece) => piece.kind === "star");
  const characters = playerPieces.filter((piece) => piece.kind === "character");
  const structures = playerPieces.filter((piece) => piece.kind === "structure");
  const mechsByHex = dedupeByHexForKind(playerPieces, "mech");
  const workersByHex = dedupeByHexForKind(playerPieces, "worker");

  if (subtypeId === "popularity_tiers") {
    return popularity;
  }

  if (subtypeId === "stars_scoring") {
    return [...popularity, ...stars];
  }

  if (subtypeId === "territories_scoring") {
    return [...popularity, ...characters, ...mechsByHex, ...workersByHex, ...structures];
  }

  if (subtypeId === "resources_scoring") {
    const relevantHexes = new Set<number>();
    for (const piece of [...mechsByHex, ...workersByHex, ...structures]) {
      const hexId = parseHexId(piece);
      if (hexId !== null) {
        relevantHexes.add(hexId);
      }
    }

    const relevantResources = boardPieces.filter((piece) => {
      if (piece.kind !== "resource") {
        return false;
      }

      const hexId = parseHexId(piece);
      return hexId !== null && relevantHexes.has(hexId);
    });

    return [...popularity, ...characters, ...mechsByHex, ...workersByHex, ...structures, ...relevantResources];
  }

  if (
    subtypeId === "structure_bonus_farm_or_tundra"
    || subtypeId === "structure_bonus_tunnel_with_structures"
    || subtypeId === "structure_bonus_longest_structure_row"
    || subtypeId === "structure_bonus_tunnel_adjacent"
    || subtypeId === "structure_bonus_encounter_adjacent"
    || subtypeId === "structure_bonus_lake_adjacent"
  ) {
    const structureBonusTile = boardPieces.filter((piece) => piece.kind === "structure_bonus");
    return [...structures, ...structureBonusTile];
  }

  if (subtypeId === "total_scoring") {
    const playerWithoutPower = playerPieces.filter((piece) => piece.kind !== "strength" && piece.kind !== "worker");
    return [...playerWithoutPower, ...workersByHex, ...boardPieces];
  }

  return placements;
}

export default async function TutorPage({ searchParams }: TutorPageProps) {
  const user = await requireUser();
  const params = searchParams ? await searchParams : {};
  const successMessage = readParam(params.success);
  const errorMessage = readParam(params.error);
  const summaryMessage = readParam(params.summary);
  const hintsMessage = readParam(params.hints);
  const resultMessage = readParam(params.result);
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
  const activeSubtype = requestedSubtypeId && isSubtypeUnlocked(requestedSubtypeId, progress.subtypeMastery)
    ? requestedSubtypeId
    : nextSubtype;
  const singlePlayerUnlocked = progress.skipCheckPassed || masteredAllSubtypes;
  const multiplayerUnlocked = progress.skipCheckPassed || progress.singlePlayerMastered;
  const activeMultiplayerTarget = Math.max(2, Math.min(5, progress.maxMultiplayerUnlocked));
  const selectedMultiplayerCount = requestedPlayers && requestedPlayers >= 2 && requestedPlayers <= 5
    ? requestedPlayers
    : activeMultiplayerTarget;

  const winnerAttempts = activeSubtype === "winner_tiebreakers"
    ? await getSubtypeAttemptHistory(user.id, "winner_tiebreakers", 10)
    : [];
  const subtypePlayerCount = activeSubtype === "winner_tiebreakers"
    ? getAdaptiveWinnerTiebreakerPlayerCount(winnerAttempts)
    : 1;
  const territoriesFactoryMode = activeSubtype === "territories_scoring"
    ? chooseTerritoriesFactoryMode(await getTerritoriesFactoryCoverage(user.id))
    : "any";
  const fallbackSubtypeScenario = await getTemporaryScenarioForPlayerCount(
    user.id,
    subtypePlayerCount,
    activeSubtype,
    { territoriesFactoryMode },
  );
  const subtypeScenarioCandidate = requestedScenarioId
    ? await getTemporaryScenarioById(requestedScenarioId)
    : null;
  const subtypeScenario = subtypeScenarioCandidate
    && subtypeScenarioCandidate.playerCount === subtypePlayerCount
    && (activeSubtype !== "winner_tiebreakers" || subtypeScenarioCandidate.scenarioKind === "tie-training")
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
  const subtypeRailItems = SUBTYPE_IDS.map((subtypeId) => {
    const mastered = progress.subtypeMastery[subtypeId] === true;
    const locked = !isSubtypeUnlocked(subtypeId, progress.subtypeMastery);

    return {
      subtypeId,
      mastered,
      locked,
      active: activeSubtype === subtypeId,
    };
  });
  const coreSubtypeRailItems = subtypeRailItems.filter((item) => !STRUCTURE_BONUS_SUBTYPE_IDS.has(item.subtypeId));
  const structureBonusRailItems = subtypeRailItems.filter((item) => STRUCTURE_BONUS_SUBTYPE_IDS.has(item.subtypeId));
  const structureBonusActive = structureBonusRailItems.some((item) => item.active);
  const structureBonusComplete = structureBonusRailItems.every((item) => item.mastered);
  const resourcesCoreIndex = coreSubtypeRailItems.findIndex((item) => item.subtypeId === "resources_scoring");
  const coreItemsBeforeStructure = resourcesCoreIndex >= 0
    ? coreSubtypeRailItems.slice(0, resourcesCoreIndex + 1)
    : coreSubtypeRailItems;
  const coreItemsAfterStructure = resourcesCoreIndex >= 0
    ? coreSubtypeRailItems.slice(resourcesCoreIndex + 1)
    : [];
  const subtypeBoardPlacements = filterSubtypePlacements(
    activeSubtype,
    subtypeScenario.piecePlacements,
    subtypeScenario.players[0]?.playerId ?? "p1",
  );
  const activeSubtypeMastered = progress.subtypeMastery[activeSubtype] === true;
  const moveOnSubtype = SUBTYPE_IDS.find((subtypeId) => !progress.subtypeMastery[subtypeId] && subtypeId !== activeSubtype)
    ?? nextSubtype;
  const subtypeFeedbackTone = resultMessage === "correct"
    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
    : resultMessage === "incorrect"
      ? "border-rose-500/40 bg-rose-500/10 text-rose-200"
      : "border-emerald-500/40 bg-emerald-500/10 text-emerald-200";
  const boardData = await loadScytheBoardData();
  const enableHexDetails = activeStage !== "subtype" || HEX_DETAIL_SUBTYPE_IDS.has(activeSubtype);

  return (
    <main className="mx-auto min-h-full w-full max-w-6xl px-4 py-4 sm:px-6 sm:py-5">
      <div className="grid gap-4 2xl:grid-cols-[minmax(0,1fr)_300px]">
        <Card className="space-y-4">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.2em] text-accent-strong">Guided Mastery Track</p>

          </div>

          {activeStage === "subtype" ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <h2 className="text-2xl">Walkthrough: Subtype Mastery</h2>
                <p className="text-sm text-muted">
                  Focus on one subtype at a time. Current target: <span className="text-foreground">{SUBTYPE_LABELS[activeSubtype]}</span>
                </p>
              </div>

              <p className="text-sm text-muted">Scenario <span className="text-foreground">{subtypeScenario.id}</span></p>
              <BoardMap
                boardImagePath={subtypeScenario.boardImagePath}
                boardImageWidth={subtypeScenario.boardImageWidth}
                boardImageHeight={subtypeScenario.boardImageHeight}
                piecePlacements={subtypeBoardPlacements}
                boardHexes={boardData.hexes}
                players={subtypeScenario.players}
                enableHexDetails={enableHexDetails}
                showTouchMapLayer
                className="w-full"
              />

              {activeSubtype === "total_scoring" || activeSubtype === "winner_tiebreakers" ? (
                <CoinPile
                  hidePlayerTotals={activeSubtype === "total_scoring"}
                  scenarioId={subtypeScenario.id}
                  players={subtypeScenario.players.map((player) => ({
                    playerId: player.playerId,
                    displayName: player.displayName,
                    coins: player.coins,
                  }))}
                />
              ) : null}

              {activeSubtype === "total_scoring" ? (
                <TotalScoringForm
                  action={submitSubtypeTutorAttempt}
                  scenarioId={subtypeScenario.id}
                  subtypeId={activeSubtype}
                />
              ) : (
                <form action={submitSubtypeTutorAttempt} className="space-y-3">
                  <input type="hidden" name="subtype_id" value={activeSubtype} />
                  <input type="hidden" name="scenario_id" value={subtypeScenario.id} />

                  {activeSubtype === "winner_tiebreakers" ? (
                    <p className="rounded-xl border border-border bg-surface-2 p-3 text-sm text-muted">
                      All players are tied at the coin total. Pick the winner and the tiebreak reason.
                    </p>
                  ) : null}

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
                    <div className="grid gap-3 sm:grid-cols-2">
                      <fieldset className="rounded-xl border border-border bg-surface-2 p-3">
                        <legend className="px-1 text-sm text-muted">Winner</legend>
                        <div className="mt-2 space-y-2">
                          {subtypeScenario.players.map((player) => (
                            <label key={player.playerId} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-foreground">
                              <input type="radio" name="winner_id" value={player.playerId} defaultChecked={player.playerId === subtypeScenario.players[0]?.playerId} />
                              <FactionLabel value={player.displayName} />
                            </label>
                          ))}
                        </div>
                      </fieldset>

                      <fieldset className="rounded-xl border border-border bg-surface-2 p-3">
                        <legend className="px-1 text-sm text-muted">Reason</legend>
                        <div className="mt-2 space-y-2">
                          {Object.entries(WINNER_TIEBREAK_REASON_LABELS).map(([reasonId, reasonLabel]) => (
                            <label key={reasonId} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-foreground">
                              <input type="radio" name="reason_id" value={reasonId} defaultChecked={reasonId === "unitsAndStructures"} />
                              <span>{reasonLabel}</span>
                            </label>
                          ))}
                        </div>
                      </fieldset>
                    </div>
                  ) : null}

                  {activeSubtype !== "popularity_tiers" && activeSubtype !== "winner_tiebreakers" ? (
                    <label className="block text-sm text-muted">
                      Enter computed value for {SUBTYPE_LABELS[activeSubtype]}
                      <input className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-foreground" type="number" name="value" required />
                    </label>
                  ) : null}

                  <div className="flex flex-wrap gap-2">
                    {resultMessage === "correct" ? (
                      <Button type="submit" formAction={refreshTemporarySubtypeScenario} formNoValidate>
                        Next question
                      </Button>
                    ) : (
                      <Button type="submit">Submit Answer</Button>
                    )}
                  </div>
                </form>
              )}

              {successMessage ? (
                <p className={`rounded-xl border p-3 text-sm ${subtypeFeedbackTone}`}>
                  {successMessage}
                </p>
              ) : null}
              {errorMessage ? (
                <p className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-200">
                  {errorMessage}
                </p>
              ) : null}
              {summaryMessage && activeStage !== "subtype" ? (
                <p className="rounded-xl border border-sky-500/40 bg-sky-500/10 p-3 text-sm text-sky-200">
                  {summaryMessage}
                </p>
              ) : null}
              <HintList message={hintsMessage} />

              {activeSubtypeMastered ? (
                masteredAllSubtypes ? (
                  <form action={refreshTemporarySinglePlayerScenario}>
                    <Button type="submit" variant="secondary">Move on to next section</Button>
                  </form>
                ) : (
                  <form action={refreshTemporarySubtypeScenario}>
                    <input type="hidden" name="subtype_id" value={moveOnSubtype} />
                    <Button type="submit" variant="secondary">Move on to next section</Button>
                  </form>
                )
              ) : null}
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
                    boardHexes={boardData.hexes}
                    players={singleScenario.players}
                    enableHexDetails={enableHexDetails}
                    showTouchMapLayer
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
                    <p className="sm:col-span-2 lg:col-span-3">Faction: <FactionLabel value={singleScenario.players[0].faction} /></p>
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
                      <Button type="submit">Submit Answer</Button>
                    </div>
                  </form>

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
                  <HintList message={hintsMessage} />

                  <form action={refreshTemporarySinglePlayerScenario}>
                    <Button type="submit" variant="secondary">Next question</Button>
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
                    boardHexes={boardData.hexes}
                    players={multiplayerScenario.players}
                    enableHexDetails={enableHexDetails}
                    showTouchMapLayer
                    className="w-full"
                  />

                  <form action={submitMultiplayerScoringAttempt} className="space-y-3">
                    <input type="hidden" name="scenario_id" value={multiplayerScenario.id} />
                    <input type="hidden" name="player_count" value={String(selectedMultiplayerCount)} />

                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {multiplayerScenario.players.map((player) => (
                        <label key={player.playerId} className="text-sm text-muted">
                          <FactionLabel value={player.displayName} className="text-sm" /> total (Stars {player.stars}, Territories {player.territories}, Resources {player.resources}, Coins {player.coins}, Pop {player.popularity})
                          <input className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-foreground" type="number" name={`total_${player.playerId}`} required />
                        </label>
                      ))}
                    </div>

                    <label className="text-sm text-muted">
                      Winner
                      <select name="winner_id" className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-foreground">
                        {multiplayerScenario.players.map((player) => (
                          <option key={player.playerId} value={player.playerId}>{formatFactionLabel(player.displayName)}</option>
                        ))}
                      </select>
                    </label>

                    <Button type="submit">Submit Multiplayer Round</Button>
                  </form>

                  <form action={refreshTemporaryMultiplayerScenario}>
                    <input type="hidden" name="player_count" value={String(selectedMultiplayerCount)} />
                    <Button type="submit" variant="secondary">Next question</Button>
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
              <details
                className={`rounded-lg border p-2 ${
                  activeStage === "subtype"
                    ? "border-accent bg-accent/15"
                    : "border-border bg-surface-2"
                }`}
                open={activeStage === "subtype"}
              >
                <summary className="cursor-pointer list-none px-1 py-1 [&::-webkit-details-marker]:hidden">
                  <span className="block text-center text-muted">Subtypes</span>
                  <span className="block text-center font-medium text-foreground">{masteredAllSubtypes ? "Complete" : `${masteredCount} complete`}</span>
                </summary>
                <p className="mt-2 text-xs text-muted">
                  Core and structure-bonus tile sections stay open together. Total scoring and winner unlock after all prior sections are mastered.
                </p>
                <div className="mt-3 space-y-2">
                  {coreItemsBeforeStructure.map((item) => (
                    <form key={item.subtypeId} method="get" action="/tutor">
                      <input type="hidden" name="stage" value="subtype" />
                      <input type="hidden" name="subtype" value={item.subtypeId} />
                      <button
                        type="submit"
                        disabled={item.locked}
                        className={`w-full rounded-2xl border px-3 py-3 text-left transition-colors ${
                          item.active
                            ? "border-accent bg-accent/15 text-foreground"
                            : item.locked
                              ? "border-border/40 bg-surface-2/50 text-muted"
                              : item.mastered
                                ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-100"
                                : "border-border bg-surface-2 text-foreground hover:bg-surface-3"
                        }`}
                      >
                        <span className="block text-sm font-medium">{SUBTYPE_LABELS[item.subtypeId]}</span>
                        <span className="mt-1 block text-[11px] uppercase tracking-[0.16em] text-current/70">
                          {item.locked ? "Locked" : item.mastered ? "Mastered" : "In progress"}
                        </span>
                      </button>
                    </form>
                  ))}

                  <details
                    className={`rounded-lg border p-2 ${
                      structureBonusActive
                        ? "border-accent bg-accent/15"
                        : "border-border bg-surface-2"
                    }`}
                    open={structureBonusActive}
                  >
                    <summary className="cursor-pointer list-none px-1 py-1 [&::-webkit-details-marker]:hidden">
                      <span className="block text-center text-muted">Structure bonus</span>
                      <span className="block text-center font-medium text-foreground">
                        {structureBonusComplete
                          ? "Complete"
                          : `${structureBonusRailItems.filter((item) => item.mastered).length} complete`}
                      </span>
                    </summary>
                    <div className="mt-2 space-y-2">
                      {structureBonusRailItems.map((item) => (
                        <form key={item.subtypeId} method="get" action="/tutor">
                          <input type="hidden" name="stage" value="subtype" />
                          <input type="hidden" name="subtype" value={item.subtypeId} />
                          <button
                            type="submit"
                            disabled={item.locked}
                            className={`w-full rounded-2xl border px-3 py-3 text-left transition-colors ${
                              item.active
                                ? "border-accent bg-accent/15 text-foreground"
                                : item.locked
                                  ? "border-border/40 bg-surface-2/50 text-muted"
                                  : item.mastered
                                    ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-100"
                                    : "border-border bg-surface-2 text-foreground hover:bg-surface-3"
                            }`}
                          >
                            <span className="block text-sm font-medium">{SUBTYPE_LABELS[item.subtypeId]}</span>
                            <span className="mt-1 block text-[11px] uppercase tracking-[0.16em] text-current/70">
                              {item.locked ? "Locked" : item.mastered ? "Mastered" : "In progress"}
                            </span>
                          </button>
                        </form>
                      ))}
                    </div>
                  </details>

                  {coreItemsAfterStructure.map((item) => (
                    <form key={item.subtypeId} method="get" action="/tutor">
                      <input type="hidden" name="stage" value="subtype" />
                      <input type="hidden" name="subtype" value={item.subtypeId} />
                      <button
                        type="submit"
                        disabled={item.locked}
                        className={`w-full rounded-2xl border px-3 py-3 text-left transition-colors ${
                          item.active
                            ? "border-accent bg-accent/15 text-foreground"
                            : item.locked
                              ? "border-border/40 bg-surface-2/50 text-muted"
                              : item.mastered
                                ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-100"
                                : "border-border bg-surface-2 text-foreground hover:bg-surface-3"
                        }`}
                      >
                        <span className="block text-sm font-medium">{SUBTYPE_LABELS[item.subtypeId]}</span>
                        <span className="mt-1 block text-[11px] uppercase tracking-[0.16em] text-current/70">
                          {item.locked ? "Locked" : item.mastered ? "Mastered" : "In progress"}
                        </span>
                      </button>
                    </form>
                  ))}
                </div>
              </details>
              <form method="get" action="/tutor">
                <input type="hidden" name="stage" value="single-player" />
                <button
                  type="submit"
                  disabled={!stageAllowed("single-player", progress, masteredAllSubtypes)}
                  className={`w-full rounded-lg border px-3 py-2 text-left transition-colors ${
                    activeStage === "single-player"
                      ? "border-accent bg-accent/15 text-foreground"
                      : stageAllowed("single-player", progress, masteredAllSubtypes)
                        ? "border-border bg-surface-2 text-foreground hover:bg-surface-3"
                        : "cursor-not-allowed border-border/40 bg-surface-2/40 text-muted"
                  }`}
                >
                  <span className="block text-muted">Single-player</span>
                  <span className="block font-medium">{progress.singlePlayerMastered ? "Mastered" : "In progress"}</span>
                </button>
              </form>
              <form method="get" action="/tutor">
                <input type="hidden" name="stage" value="multiplayer" />
                <button
                  type="submit"
                  disabled={!stageAllowed("multiplayer", progress, masteredAllSubtypes)}
                  className={`w-full rounded-lg border px-3 py-2 text-left transition-colors ${
                    activeStage === "multiplayer"
                      ? "border-accent bg-accent/15 text-foreground"
                      : stageAllowed("multiplayer", progress, masteredAllSubtypes)
                        ? "border-border bg-surface-2 text-foreground hover:bg-surface-3"
                        : "cursor-not-allowed border-border/40 bg-surface-2/40 text-muted"
                  }`}
                >
                  <span className="block text-muted">Multiplayer</span>
                  <span className="block font-medium">Up to {progress.maxMultiplayerUnlocked} players</span>
                </button>
              </form>
              <form method="get" action="/tutor">
                <input type="hidden" name="stage" value="speed" />
                <button
                  type="submit"
                  disabled={!stageAllowed("speed", progress, masteredAllSubtypes)}
                  className={`w-full rounded-lg border px-3 py-2 text-left transition-colors ${
                    activeStage === "speed"
                      ? "border-accent bg-accent/15 text-foreground"
                      : stageAllowed("speed", progress, masteredAllSubtypes)
                        ? "border-border bg-surface-2 text-foreground hover:bg-surface-3"
                        : "cursor-not-allowed border-border/40 bg-surface-2/40 text-muted"
                  }`}
                >
                  <span className="block text-muted">Speed challenge</span>
                  <span className="block font-medium">{progress.speedChallengeUnlocked ? "Unlocked" : "Locked"}</span>
                </button>
              </form>
            </div>
          </Card>

          {activeStage === "single-player" || activeStage === "multiplayer" ? (
            <CoinPile
              scenarioId={activeCoinScenarioId}
              players={coinPlayers.map((player) => ({
                playerId: player.playerId,
                displayName: player.displayName,
                coins: player.coins,
              }))}
            />
          ) : null}
        </aside>
      </div>
    </main>
  );
}
