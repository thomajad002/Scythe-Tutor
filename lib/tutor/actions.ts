"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/server";
import {
  SUBTYPE_IDS,
  allSubtypesMastered,
  applySkipCheckResult,
  evaluateSubtypeMastery,
  recomputeUnlockState,
  type SubtypeAttempt,
  type SubtypeId,
} from "@/lib/tutor/progression";
import { getTutorProgressState } from "@/lib/tutor/server";
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
