import type { Json } from "@/types/database";
import {
  INITIAL_PROGRESS_STATE,
  SUBTYPE_IDS,
  type SubtypeId,
  type TutorProgressState,
} from "@/lib/tutor/progression";
import { createClient } from "@/lib/supabase/server";

function normalizeSubtypeMastery(raw: Json | null): Partial<Record<SubtypeId, boolean>> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return {};
  }

  const source = raw as Record<string, unknown>;
  const result: Partial<Record<SubtypeId, boolean>> = {};

  for (const subtypeId of SUBTYPE_IDS) {
    result[subtypeId] = source[subtypeId] === true;
  }

  if (source.structure_bonus_scoring === true) {
    result.structure_bonus_farm_or_tundra = true;
    result.structure_bonus_tunnel_with_structures = true;
    result.structure_bonus_longest_structure_row = true;
    result.structure_bonus_tunnel_adjacent = true;
    result.structure_bonus_encounter_adjacent = true;
    result.structure_bonus_lake_adjacent = true;
  }

  return result;
}

export async function getTutorProgressState(userId: string): Promise<TutorProgressState> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("tutor_progress")
    .select(
      "user_id, subtype_mastery, single_player_consecutive_correct, single_player_mastered, max_multiplayer_unlocked, speed_challenge_unlocked, tutorial_completed, skip_check_passed",
    )
    .eq("user_id", userId)
    .maybeSingle();

  if (!data) {
    const initial: TutorProgressState = {
      ...INITIAL_PROGRESS_STATE,
      subtypeMastery: {},
    };

    await supabase.from("tutor_progress").upsert({
      user_id: userId,
      subtype_mastery: initial.subtypeMastery,
      single_player_consecutive_correct: initial.singlePlayerConsecutiveCorrect,
      single_player_mastered: initial.singlePlayerMastered,
      max_multiplayer_unlocked: initial.maxMultiplayerUnlocked,
      speed_challenge_unlocked: initial.speedChallengeUnlocked,
      tutorial_completed: initial.tutorialCompleted,
      skip_check_passed: initial.skipCheckPassed,
    });

    return initial;
  }

  return {
    subtypeMastery: normalizeSubtypeMastery(data.subtype_mastery),
    singlePlayerConsecutiveCorrect: data.single_player_consecutive_correct,
    singlePlayerMastered: data.single_player_mastered,
    maxMultiplayerUnlocked: data.max_multiplayer_unlocked,
    speedChallengeUnlocked: data.speed_challenge_unlocked,
    tutorialCompleted: data.tutorial_completed,
    skipCheckPassed: data.skip_check_passed,
  };
}

export type TerritoriesFactoryCoverage = {
  attemptedWithFactory: boolean;
  attemptedWithoutFactory: boolean;
  correctWithFactory: boolean;
  correctWithoutFactory: boolean;
};

export async function getTerritoriesFactoryCoverage(userId: string): Promise<TerritoriesFactoryCoverage> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("subtype_attempt_events")
    .select("is_correct, had_factory")
    .eq("user_id", userId)
    .eq("subtype_id", "territories_scoring")
    .not("had_factory", "is", null);

  if (error) {
    throw new Error(error.message);
  }

  const attemptedWithFactory = (data ?? []).some((row) => row.had_factory === true);
  const attemptedWithoutFactory = (data ?? []).some((row) => row.had_factory === false);
  const correctWithFactory = (data ?? []).some((row) => row.had_factory === true && row.is_correct === true);
  const correctWithoutFactory = (data ?? []).some((row) => row.had_factory === false && row.is_correct === true);

  return {
    attemptedWithFactory,
    attemptedWithoutFactory,
    correctWithFactory,
    correctWithoutFactory,
  };
}
