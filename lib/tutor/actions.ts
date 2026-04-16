"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/server";
import {
  evaluateFullBreakdownAttempt,
  getPopularityTier,
  getLayeredHints,
  scoreFullScenario,
  scoreMultiplayerRound,
  type BreakdownAttempt,
  type LayeredHintLevel,
} from "@/lib/scythe/scoring";
import {
  SUBTYPE_IDS,
  allSubtypesMastered,
  applySkipCheckResult,
  evaluateSubtypeMastery,
  isSubtypeUnlocked,
  recomputeUnlockState,
  type SubtypeAttempt,
  type SubtypeId,
} from "@/lib/tutor/progression";
import { getTerritoriesFactoryCoverage, getTutorProgressState } from "@/lib/tutor/server";
import {
  getTemporaryScenarioById,
  getTemporaryScenarioForPlayerCount,
} from "@/lib/tutor/scenario-bank";
import { createClient } from "@/lib/supabase/server";

const TUTOR_PATH = "/tutor";

function toBoolean(value: FormDataEntryValue | null): boolean {
  return String(value ?? "").toLowerCase() === "true";
}

function toInt(value: FormDataEntryValue | null, fallback: number): number {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toSubtypeId(value: FormDataEntryValue | null): SubtypeId | null {
  const subtypeId = String(value ?? "") as SubtypeId;
  return SUBTYPE_IDS.includes(subtypeId) ? subtypeId : null;
}

function sendError(message: string): never {
  redirect(`${TUTOR_PATH}?error=${encodeURIComponent(message)}`);
}

function sendSuccess(message: string): never {
  revalidatePath(TUTOR_PATH);
  redirect(`${TUTOR_PATH}?success=${encodeURIComponent(message)}`);
}

function sendSuccessWithStage(
  message: string,
  stage: "subtype" | "single-player" | "multiplayer",
  summary?: string,
  hints?: string[],
  extraParams?: Record<string, string>,
): never {
  revalidatePath(TUTOR_PATH);

  const params = new URLSearchParams({
    success: message,
    stage,
  });

  if (summary) {
    params.set("summary", summary);
  }

  if (hints && hints.length > 0) {
    params.set("hints", hints.join(" | "));
  }

  if (extraParams) {
    Object.entries(extraParams).forEach(([key, value]) => {
      params.set(key, value);
    });
  }

  redirect(`${TUTOR_PATH}?${params.toString()}`);
}

function chooseAdaptiveHintLevel(
  correctCount: number,
  incorrectCount: number,
  constraintViolationCount: number,
): LayeredHintLevel {
  const difficultySignal = Math.max(0, incorrectCount - correctCount) + constraintViolationCount;

  if (difficultySignal >= 4) {
    return 3;
  }

  if (difficultySignal >= 2) {
    return 2;
  }

  return 1;
}

async function chooseTerritoriesFactoryMode(userId: string): Promise<"with_factory" | "without_factory"> {
  const coverage = await getTerritoriesFactoryCoverage(userId);

  if (!coverage.attemptedWithFactory && !coverage.attemptedWithoutFactory) {
    return Math.random() < 0.5 ? "with_factory" : "without_factory";
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

async function getSubtypeAttemptCounts(userId: string, subtypeId: SubtypeId): Promise<{ correct: number; incorrect: number }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("subtype_attempt_events")
    .select("is_correct")
    .eq("user_id", userId)
    .eq("subtype_id", subtypeId)
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) {
    sendError(error.message);
  }

  const correct = (data ?? []).filter((row) => row.is_correct).length;
  return {
    correct,
    incorrect: (data ?? []).length - correct,
  };
}

function getSubtypeHint(subtypeId: SubtypeId, level: LayeredHintLevel): string {
  const bySubtype: Record<SubtypeId, Record<LayeredHintLevel, string>> = {
    popularity_tiers: {
      1: "Find the popularity tier first.",
      2: "Use low for 0-6, mid for 7-12, high for 13-18.",
      3: "Example: popularity 10 is mid tier.",
    },
    stars_scoring: {
      1: "Use the star multiplier from the popularity tier.",
      2: "Compute stars x tier.starMultiplier.",
      3: "Tier multipliers for stars are 3/4/5.",
    },
    territories_scoring: {
      1: "Use territory multiplier and check Factory rule.",
      2: "If Factory is controlled, add +2 effective territories.",
      3: "Territory points = (territories + factory bonus) x tier territory multiplier.",
    },
    resources_scoring: {
      1: "Resources score in pairs.",
      2: "Compute floor(resources / 2), then multiply by tier resource value.",
      3: "Example: 11 resources => 5 pairs.",
    },
    structure_bonus_farm_or_tundra: {
      1: "Count structures on farm or tundra hexes only.",
      2: "Use the active structure bonus tile and award only its matching pattern.",
      3: "Structure bonus coins are added as-is and are not popularity-multiplied.",
    },
    structure_bonus_tunnel_with_structures: {
      1: "Count structures on tunnel hexes only.",
      2: "Use the active structure bonus tile and award only its matching pattern.",
      3: "Structure bonus coins are added as-is and are not popularity-multiplied.",
    },
    structure_bonus_longest_structure_row: {
      1: "Find the longest connected structure row first.",
      2: "Use the active structure bonus tile and award only its matching pattern.",
      3: "Structure bonus coins are added as-is and are not popularity-multiplied.",
    },
    structure_bonus_tunnel_adjacent: {
      1: "Count structures adjacent to tunnel hexes only.",
      2: "Use the active structure bonus tile and award only its matching pattern.",
      3: "Structure bonus coins are added as-is and are not popularity-multiplied.",
    },
    structure_bonus_encounter_adjacent: {
      1: "Count structures adjacent to encounter hexes only.",
      2: "Use the active structure bonus tile and award only its matching pattern.",
      3: "Structure bonus coins are added as-is and are not popularity-multiplied.",
    },
    structure_bonus_lake_adjacent: {
      1: "Count structures adjacent to lakes only.",
      2: "Use the active structure bonus tile and award only its matching pattern.",
      3: "Structure bonus coins are added as-is and are not popularity-multiplied.",
    },
    total_scoring: {
      1: "Add all components exactly once.",
      2: "Total = stars + territories + resources + coins + structure bonus.",
      3: "Recompute each component, then sum left-to-right.",
    },
    winner_tiebreakers: {
      1: "Compare totals first.",
      2: "If tied, use tiebreak order from the rules.",
      3: "Tiebreak order: units+structures, power, popularity, resources, territories, stars.",
    },
  };

  return bySubtype[subtypeId][level];
}

async function recomputeSubtypeProgressForUser(userId: string, subtypeId: SubtypeId) {
  const supabase = await createClient();
  const { data: attemptsData, error: attemptsError } = await supabase
    .from("subtype_attempt_events")
    .select("subtype_id, is_correct, first_try_correct")
    .eq("user_id", userId)
    .eq("subtype_id", subtypeId)
    .order("created_at", { ascending: false })
    .limit(5);

  if (attemptsError) {
    sendError(attemptsError.message);
  }

  const attempts: SubtypeAttempt[] = (attemptsData ?? []).map((row) => ({
    subtypeId: row.subtype_id as SubtypeId,
    isCorrect: row.is_correct,
    firstTryCorrect: row.first_try_correct,
  }));

  let mastered = evaluateSubtypeMastery(attempts);
  if (subtypeId === "territories_scoring") {
    const coverage = await getTerritoriesFactoryCoverage(userId);
    mastered = coverage.correctWithFactory && coverage.correctWithoutFactory;
  }
  const current = await getTutorProgressState(userId);
  const next = recomputeUnlockState({
    ...current,
    subtypeMastery: {
      ...current.subtypeMastery,
      [subtypeId]: mastered || current.subtypeMastery[subtypeId] === true,
    },
  });

  await persistProgress(userId, next);
  return { next, mastered };
}

function toOptionalInt(value: FormDataEntryValue | null): number | undefined {
  if (value === null || value === "") {
    return undefined;
  }

  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isFinite(parsed)) {
    return undefined;
  }

  return parsed;
}

async function persistProgress(
  userId: string,
  next: Awaited<ReturnType<typeof getTutorProgressState>>,
): Promise<void> {
  const supabase = await createClient();
  const { error: upsertError } = await supabase.from("tutor_progress").upsert({
    user_id: userId,
    subtype_mastery: next.subtypeMastery,
    single_player_consecutive_correct: next.singlePlayerConsecutiveCorrect,
    single_player_mastered: next.singlePlayerMastered,
    max_multiplayer_unlocked: next.maxMultiplayerUnlocked,
    speed_challenge_unlocked: next.speedChallengeUnlocked,
    tutorial_completed: next.tutorialCompleted,
    skip_check_passed: next.skipCheckPassed,
  });

  if (upsertError) {
    sendError(upsertError.message);
  }
}

export async function submitSkipCheckAssessment(formData: FormData) {
  const user = await requireUser();
  const supabase = await createClient();
  const totalPlayers = toInt(formData.get("total_players"), 5);
  const correctPlayers = toInt(formData.get("correct_players"), 0);

  if (totalPlayers < 1 || totalPlayers > 7) {
    sendError("Total players for skip check must be between 1 and 7.");
  }

  if (correctPlayers < 0 || correctPlayers > totalPlayers) {
    sendError("Correct players must be between 0 and total players.");
  }

  const isPerfect = totalPlayers > 0 && correctPlayers === totalPlayers;

  const { error: insertError } = await supabase.from("skip_check_attempts").insert({
    user_id: user.id,
    total_players: totalPlayers,
    correct_players: correctPlayers,
    is_perfect: isPerfect,
  });

  if (insertError) {
    sendError(insertError.message);
  }

  const current = await getTutorProgressState(user.id);
  const next = applySkipCheckResult(current, correctPlayers, totalPlayers);

  const { error: upsertError } = await supabase.from("tutor_progress").upsert({
    user_id: user.id,
    subtype_mastery: next.subtypeMastery,
    single_player_consecutive_correct: next.singlePlayerConsecutiveCorrect,
    single_player_mastered: next.singlePlayerMastered,
    max_multiplayer_unlocked: next.maxMultiplayerUnlocked,
    speed_challenge_unlocked: next.speedChallengeUnlocked,
    tutorial_completed: next.tutorialCompleted,
    skip_check_passed: next.skipCheckPassed,
  });

  if (upsertError) {
    sendError(upsertError.message);
  }

  if (isPerfect) {
    sendSuccess("Perfect skip check. Tutorial and speed challenge unlocked.");
  }

  sendSuccess("Skip check saved. Continue with guided mastery.");
}

export async function recordSubtypePractice(formData: FormData) {
  const user = await requireUser();
  const supabase = await createClient();
  const subtypeId = toSubtypeId(formData.get("subtype_id"));

  if (!subtypeId) {
    sendError("Choose a valid subtype.");
  }

  const isCorrect = toBoolean(formData.get("is_correct"));
  const firstTryCorrect = toBoolean(formData.get("first_try_correct"));

  const { error: insertError } = await supabase.from("subtype_attempt_events").insert({
    user_id: user.id,
    subtype_id: subtypeId,
    is_correct: isCorrect,
    first_try_correct: firstTryCorrect,
  });

  if (insertError) {
    sendError(insertError.message);
  }

  const { data: attemptsData, error: attemptsError } = await supabase
    .from("subtype_attempt_events")
    .select("subtype_id, is_correct, first_try_correct")
    .eq("user_id", user.id)
    .eq("subtype_id", subtypeId)
    .order("created_at", { ascending: false })
    .limit(5);

  if (attemptsError) {
    sendError(attemptsError.message);
  }

  const attempts: SubtypeAttempt[] = (attemptsData ?? []).map((row) => ({
    subtypeId: row.subtype_id as SubtypeId,
    isCorrect: row.is_correct,
    firstTryCorrect: row.first_try_correct,
  }));

  const mastered = evaluateSubtypeMastery(attempts);
  const current = await getTutorProgressState(user.id);
  const next = recomputeUnlockState({
    ...current,
    subtypeMastery: {
      ...current.subtypeMastery,
      [subtypeId]: mastered || current.subtypeMastery[subtypeId] === true,
    },
  });

  const { error: upsertError } = await supabase.from("tutor_progress").upsert({
    user_id: user.id,
    subtype_mastery: next.subtypeMastery,
    single_player_consecutive_correct: next.singlePlayerConsecutiveCorrect,
    single_player_mastered: next.singlePlayerMastered,
    max_multiplayer_unlocked: next.maxMultiplayerUnlocked,
    speed_challenge_unlocked: next.speedChallengeUnlocked,
    tutorial_completed: next.tutorialCompleted,
    skip_check_passed: next.skipCheckPassed,
  });

  if (upsertError) {
    sendError(upsertError.message);
  }

  const label = mastered ? "mastered" : "recorded";
  sendSuccess(`Subtype practice ${label}: ${subtypeId.replaceAll("_", " ")}.`);
}

export async function submitSubtypeTutorAttempt(formData: FormData) {
  const user = await requireUser();
  const supabase = await createClient();
  const subtypeId = toSubtypeId(formData.get("subtype_id"));
  const scenarioId = String(formData.get("scenario_id") ?? "");

  if (!subtypeId) {
    sendError("Choose a valid subtype.");
  }

  const current = await getTutorProgressState(user.id);
  if (!isSubtypeUnlocked(subtypeId, current.subtypeMastery)) {
    sendError("That subtype is locked until the first five are mastered.");
  }

  const requiredPlayerCount = subtypeId === "winner_tiebreakers" ? 2 : 1;
  const territoriesFactoryMode = subtypeId === "territories_scoring"
    ? await chooseTerritoriesFactoryMode(user.id)
    : "any";
  const scenarioCandidate = await getTemporaryScenarioById(scenarioId);
  const scenario = scenarioCandidate
    && scenarioCandidate.playerCount === requiredPlayerCount
    ? scenarioCandidate
    : await getTemporaryScenarioForPlayerCount(user.id, requiredPlayerCount, subtypeId, {
      territoriesFactoryMode,
    });

  let isCorrect = false;
  let summary = "";
  let constraintViolationCount = 0;
  let adaptiveHints: string[] = [];

  const priorAttemptCounts = await getSubtypeAttemptCounts(user.id, subtypeId);

  if (subtypeId === "winner_tiebreakers") {
    const submittedWinnerId = String(formData.get("winner_id") ?? "");
    const round = scoreMultiplayerRound(scenario.players);
    isCorrect = submittedWinnerId === round.winnerPlayerId;
    summary = `Expected winner: ${round.winnerPlayerId.toUpperCase()} | Tiebreak reason: ${round.tiebreakReason}`;
  } else {
    const player = scenario.players[0];
    const full = scoreFullScenario(player);
    const submittedRaw = formData.get("value");

    if (subtypeId === "popularity_tiers") {
      const submittedTier = String(submittedRaw ?? "").toLowerCase();
      const expectedTier = getPopularityTier(player.popularity);
      isCorrect = submittedTier === expectedTier;
      summary = `Expected tier: ${expectedTier} (popularity ${player.popularity})`;

      if (!isCorrect) {
        const adaptiveLevel = chooseAdaptiveHintLevel(priorAttemptCounts.correct, priorAttemptCounts.incorrect + 1, 1);
        adaptiveHints = [getSubtypeHint(subtypeId, adaptiveLevel)];
      }
    } else {
      const submittedValue = toOptionalInt(submittedRaw);
      const expectedBySubtype: Record<Exclude<SubtypeId, "popularity_tiers" | "winner_tiebreakers">, number> = {
        stars_scoring: full.points.stars,
        territories_scoring: full.points.territories,
        resources_scoring: full.points.resources,
        structure_bonus_farm_or_tundra: full.points.structureBonus,
        structure_bonus_tunnel_with_structures: full.points.structureBonus,
        structure_bonus_longest_structure_row: full.points.structureBonus,
        structure_bonus_tunnel_adjacent: full.points.structureBonus,
        structure_bonus_encounter_adjacent: full.points.structureBonus,
        structure_bonus_lake_adjacent: full.points.structureBonus,
        total_scoring: full.points.total,
      };

      const expectedValue = expectedBySubtype[subtypeId as Exclude<SubtypeId, "popularity_tiers" | "winner_tiebreakers">];
      isCorrect = submittedValue === expectedValue;
      summary = `Expected value: ${expectedValue}`;

      const fieldBySubtype: Record<Exclude<SubtypeId, "popularity_tiers" | "winner_tiebreakers">, keyof BreakdownAttempt> = {
        stars_scoring: "stars",
        territories_scoring: "territories",
        resources_scoring: "resources",
        structure_bonus_farm_or_tundra: "structureBonus",
        structure_bonus_tunnel_with_structures: "structureBonus",
        structure_bonus_longest_structure_row: "structureBonus",
        structure_bonus_tunnel_adjacent: "structureBonus",
        structure_bonus_encounter_adjacent: "structureBonus",
        structure_bonus_lake_adjacent: "structureBonus",
        total_scoring: "total",
      };
      const activeField = fieldBySubtype[subtypeId as Exclude<SubtypeId, "popularity_tiers" | "winner_tiebreakers">];

      const cbmEvaluation = evaluateFullBreakdownAttempt(player, {
        [activeField]: submittedValue,
      });

      const violations = cbmEvaluation.errors.filter((error) => error.field === activeField);
      constraintViolationCount = violations.length;

      if (!isCorrect) {
        const adaptiveLevel = chooseAdaptiveHintLevel(
          priorAttemptCounts.correct,
          priorAttemptCounts.incorrect + 1,
          Math.max(1, constraintViolationCount),
        );
        adaptiveHints = [
          getSubtypeHint(subtypeId, adaptiveLevel),
          ...getLayeredHints(violations, adaptiveLevel),
        ];
      }
    }
  }

  const firstTryCorrect = isCorrect;
  const { error: insertError } = await supabase.from("subtype_attempt_events").insert({
    user_id: user.id,
    subtype_id: subtypeId,
    is_correct: isCorrect,
    first_try_correct: firstTryCorrect,
    had_factory: subtypeId === "territories_scoring" ? scenario.players[0]?.factoryControlled === true : null,
  });

  if (insertError) {
    sendError(insertError.message);
  }

  const { next, mastered } = await recomputeSubtypeProgressForUser(user.id, subtypeId);

  if (isCorrect) {
    sendSuccessWithStage(
      mastered
        ? `Correct. ${subtypeId.replaceAll("_", " ")} is now mastered.`
        : `Correct. ${subtypeId.replaceAll("_", " ")} progress updated.`,
      "subtype",
      summary,
      undefined,
      { subtype: subtypeId, result: "correct" },
    );
  }

  if (adaptiveHints.length === 0) {
    const fallbackLevel = chooseAdaptiveHintLevel(priorAttemptCounts.correct, priorAttemptCounts.incorrect + 1, Math.max(1, constraintViolationCount));
    adaptiveHints = [getSubtypeHint(subtypeId, fallbackLevel)];
  }

  sendSuccessWithStage(
    `Incorrect for ${subtypeId.replaceAll("_", " ")}. Keep going.`,
    "subtype",
    summary + ` | First-try streak: ${next.subtypeMastery[subtypeId] ? "mastered" : "building"}`,
    adaptiveHints,
    { subtype: subtypeId, result: "incorrect" },
  );
}

export async function recordSinglePlayerAttempt(formData: FormData) {
  const user = await requireUser();
  const supabase = await createClient();
  const isCorrect = toBoolean(formData.get("is_correct"));

  const current = await getTutorProgressState(user.id);
  const unlocked = current.skipCheckPassed || allSubtypesMastered(current.subtypeMastery);
  if (!unlocked) {
    sendError("Single-player stage is locked until all subtypes are mastered.");
  }

  const consecutive = isCorrect ? current.singlePlayerConsecutiveCorrect + 1 : 0;
  const next = recomputeUnlockState({
    ...current,
    singlePlayerConsecutiveCorrect: consecutive,
    singlePlayerMastered: current.singlePlayerMastered || consecutive >= 2,
  });

  const { error: upsertError } = await supabase.from("tutor_progress").upsert({
    user_id: user.id,
    subtype_mastery: next.subtypeMastery,
    single_player_consecutive_correct: next.singlePlayerConsecutiveCorrect,
    single_player_mastered: next.singlePlayerMastered,
    max_multiplayer_unlocked: next.maxMultiplayerUnlocked,
    speed_challenge_unlocked: next.speedChallengeUnlocked,
    tutorial_completed: next.tutorialCompleted,
    skip_check_passed: next.skipCheckPassed,
  });

  if (upsertError) {
    sendError(upsertError.message);
  }

  sendSuccess(
    isCorrect
      ? `Single-player attempt recorded. Consecutive correct: ${next.singlePlayerConsecutiveCorrect}.`
      : "Single-player attempt recorded as incorrect. Streak reset.",
  );
}

export async function recordMultiplayerAttempt(formData: FormData) {
  const user = await requireUser();
  const supabase = await createClient();
  const isCorrect = toBoolean(formData.get("is_correct"));
  const playerCount = toInt(formData.get("player_count"), 2);

  const current = await getTutorProgressState(user.id);
  const unlocked = current.skipCheckPassed || current.singlePlayerMastered;
  if (!unlocked) {
    sendError("Multiplayer stage is locked until single-player is mastered.");
  }

  if (playerCount > current.maxMultiplayerUnlocked) {
    sendError("That player count is still locked.");
  }

  let nextUnlocked = current.maxMultiplayerUnlocked;
  if (isCorrect && playerCount === current.maxMultiplayerUnlocked && current.maxMultiplayerUnlocked < 5) {
    nextUnlocked = current.maxMultiplayerUnlocked + 1;
  }

  const next = recomputeUnlockState({
    ...current,
    maxMultiplayerUnlocked: nextUnlocked,
  });

  const { error: upsertError } = await supabase.from("tutor_progress").upsert({
    user_id: user.id,
    subtype_mastery: next.subtypeMastery,
    single_player_consecutive_correct: next.singlePlayerConsecutiveCorrect,
    single_player_mastered: next.singlePlayerMastered,
    max_multiplayer_unlocked: next.maxMultiplayerUnlocked,
    speed_challenge_unlocked: next.speedChallengeUnlocked,
    tutorial_completed: next.tutorialCompleted,
    skip_check_passed: next.skipCheckPassed,
  });

  if (upsertError) {
    sendError(upsertError.message);
  }

  if (isCorrect && nextUnlocked > current.maxMultiplayerUnlocked) {
    sendSuccess(`Great run. ${nextUnlocked}-player scenarios are now unlocked.`);
  }

  sendSuccess("Multiplayer attempt saved.");
}

export async function submitSinglePlayerScoringAttempt(formData: FormData) {
  const user = await requireUser();
  const scenarioId = String(formData.get("scenario_id") ?? "");

  const scenario = await getTemporaryScenarioById(scenarioId);
  if (!scenario || scenario.playerCount < 1) {
    sendError("Single-player scenario was not found. Refresh and try again.");
  }

  const player = scenario.players[0];

  const current = await getTutorProgressState(user.id);
  const unlocked = current.skipCheckPassed || allSubtypesMastered(current.subtypeMastery);
  if (!unlocked) {
    sendError("Single-player stage is locked until all subtypes are mastered.");
  }

  const attempt: BreakdownAttempt = {
    stars: toOptionalInt(formData.get("stars")),
    territories: toOptionalInt(formData.get("territories")),
    resources: toOptionalInt(formData.get("resources")),
    coins: toOptionalInt(formData.get("coins")),
    structureBonus: toOptionalInt(formData.get("structure_bonus")),
    total: toOptionalInt(formData.get("total")),
  };

  const evaluation = evaluateFullBreakdownAttempt(player, attempt);
  const isCorrect = evaluation.isFullyCorrect;

  const consecutive = isCorrect ? current.singlePlayerConsecutiveCorrect + 1 : 0;
  const next = recomputeUnlockState({
    ...current,
    singlePlayerConsecutiveCorrect: consecutive,
    singlePlayerMastered: current.singlePlayerMastered || consecutive >= 2,
  });

  await persistProgress(user.id, next);

  const summary = [
    `Expected stars: ${evaluation.expected.stars}`,
    `territories: ${evaluation.expected.territories}`,
    `resources: ${evaluation.expected.resources}`,
    `coins: ${evaluation.expected.coins}`,
    `structure bonus: ${(evaluation.expected as { structureBonus?: number }).structureBonus ?? 0}`,
    `total: ${evaluation.expected.total}`,
  ].join(" | ");

  if (isCorrect) {
    sendSuccessWithStage(
      `Correct. Single-player streak is now ${next.singlePlayerConsecutiveCorrect}.`,
      "single-player",
      summary,
      undefined,
      { result: "correct" },
    );
  }

  const adaptiveHintLevel = chooseAdaptiveHintLevel(
    current.singlePlayerConsecutiveCorrect,
    1,
    evaluation.errors.length,
  );
  const hints = getLayeredHints(evaluation.errors, adaptiveHintLevel);
  sendSuccessWithStage(
    "Attempt evaluated. Review hints and decomposition, then try again.",
    "single-player",
    summary,
    hints,
    { result: "incorrect" },
  );
}

export async function submitMultiplayerScoringAttempt(formData: FormData) {
  const user = await requireUser();
  const scenarioId = String(formData.get("scenario_id") ?? "");
  const playerCount = toInt(formData.get("player_count"), 2);

  const scenario = await getTemporaryScenarioById(scenarioId);
  if (!scenario || scenario.playerCount !== playerCount) {
    sendError("Multiplayer scenario was not found or mismatched. Refresh and try again.");
  }

  const current = await getTutorProgressState(user.id);
  const unlocked = current.skipCheckPassed || current.singlePlayerMastered;
  if (!unlocked) {
    sendError("Multiplayer stage is locked until single-player is mastered.");
  }

  if (playerCount > current.maxMultiplayerUnlocked) {
    sendError("That player count is still locked.");
  }

  const submittedWinnerId = String(formData.get("winner_id") ?? "");
  const expectedRound = scoreMultiplayerRound(scenario.players);

  const submittedTotals = scenario.players.map((player) => {
    const value = toOptionalInt(formData.get(`total_${player.playerId}`));
    return {
      playerId: player.playerId,
      total: value,
    };
  });

  const allTotalsCorrect = submittedTotals.every((submitted) => {
    const expected = expectedRound.perPlayer.find((row) => row.playerId === submitted.playerId);
    return expected && submitted.total === expected.total;
  });

  const winnerCorrect = submittedWinnerId === expectedRound.winnerPlayerId;
  const isCorrect = allTotalsCorrect && winnerCorrect;

  let nextUnlocked = current.maxMultiplayerUnlocked;
  if (isCorrect && playerCount === current.maxMultiplayerUnlocked && current.maxMultiplayerUnlocked < 5) {
    nextUnlocked = current.maxMultiplayerUnlocked + 1;
  }

  const next = recomputeUnlockState({
    ...current,
    maxMultiplayerUnlocked: nextUnlocked,
  });

  await persistProgress(user.id, next);

  const summaryRows = expectedRound.perPlayer.map((player) => `${player.playerId.toUpperCase()}: ${player.total}`);
  const summary = [
    `Expected totals -> ${summaryRows.join(", ")}`,
    `Expected winner -> ${expectedRound.winnerPlayerId.toUpperCase()}`,
    `Tiebreak reason -> ${expectedRound.tiebreakReason}`,
  ].join(" | ");

  if (isCorrect && nextUnlocked > current.maxMultiplayerUnlocked) {
    sendSuccessWithStage(
      `Correct round. ${nextUnlocked}-player scenarios unlocked.`,
      "multiplayer",
      summary,
    );
  }

  if (isCorrect) {
    sendSuccessWithStage("Correct round. Multiplayer attempt saved.", "multiplayer", summary);
  }

  const hints = [
    "Compute each player total from components before choosing winner.",
    "Use tiebreak order: units+structures, power, popularity, resources, territories, stars.",
    "Factory-controlled player counts that territory as 3 for scoring.",
  ];

  sendSuccessWithStage(
    "Multiplayer attempt evaluated. Review expected totals and tiebreak details.",
    "multiplayer",
    summary,
    hints,
  );
}

export async function refreshTemporarySinglePlayerScenario() {
  const user = await requireUser();
  const scenario = await getTemporaryScenarioForPlayerCount(`${user.id}-${Date.now()}`, 1);

  revalidatePath(TUTOR_PATH);
  redirect(`${TUTOR_PATH}?stage=single-player&scenario=${encodeURIComponent(scenario.id)}`);
}

export async function refreshTemporarySubtypeScenario(formData: FormData) {
  const user = await requireUser();
  const subtypeId = toSubtypeId(formData.get("subtype_id"));
  if (!subtypeId) {
    sendError("Choose a valid subtype.");
  }

  const playerCount = subtypeId === "winner_tiebreakers" ? 2 : 1;
  const territoriesFactoryMode = subtypeId === "territories_scoring"
    ? await chooseTerritoriesFactoryMode(user.id)
    : "any";
  const scenario = await getTemporaryScenarioForPlayerCount(
    `${user.id}-${Date.now()}`,
    playerCount,
    subtypeId,
    { territoriesFactoryMode },
  );

  revalidatePath(TUTOR_PATH);
  redirect(
    `${TUTOR_PATH}?stage=subtype&subtype=${encodeURIComponent(subtypeId)}&scenario=${encodeURIComponent(scenario.id)}&players=${encodeURIComponent(String(playerCount))}`,
  );
}

export async function refreshTemporaryMultiplayerScenario(formData: FormData) {
  const user = await requireUser();
  const playerCount = toInt(formData.get("player_count"), 2);
  const scenario = await getTemporaryScenarioForPlayerCount(`${user.id}-${Date.now()}`, playerCount);

  revalidatePath(TUTOR_PATH);
  redirect(
    `${TUTOR_PATH}?stage=multiplayer&scenario=${encodeURIComponent(scenario.id)}&players=${encodeURIComponent(String(playerCount))}`,
  );
}
