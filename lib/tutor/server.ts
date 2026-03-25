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
