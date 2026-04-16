import {
  INITIAL_PROGRESS_STATE,
  allSubtypesMastered,
  applySkipCheckResult,
  evaluateSubtypeMastery,
  getAdaptiveWinnerTiebreakerPlayerCount,
  isSubtypeUnlocked,
  recomputeUnlockState,
  type SubtypeAttempt,
} from "@/lib/tutor/progression";
import { describe, expect, it } from "vitest";

describe("evaluateSubtypeMastery", () => {
  it("masters after two consecutive first-try correct attempts", () => {
    const attempts: SubtypeAttempt[] = [
      { subtypeId: "stars_scoring", isCorrect: true, firstTryCorrect: true },
      { subtypeId: "stars_scoring", isCorrect: true, firstTryCorrect: true },
    ];

    expect(evaluateSubtypeMastery(attempts)).toBe(true);
  });

  it("masters with 80% in last five attempts", () => {
    const attempts: SubtypeAttempt[] = [
      { subtypeId: "stars_scoring", isCorrect: true, firstTryCorrect: false },
      { subtypeId: "stars_scoring", isCorrect: true, firstTryCorrect: false },
      { subtypeId: "stars_scoring", isCorrect: false, firstTryCorrect: false },
      { subtypeId: "stars_scoring", isCorrect: true, firstTryCorrect: false },
      { subtypeId: "stars_scoring", isCorrect: true, firstTryCorrect: false },
    ];

    expect(evaluateSubtypeMastery(attempts)).toBe(true);
  });

  it("does not master with insufficient accuracy", () => {
    const attempts: SubtypeAttempt[] = [
      { subtypeId: "stars_scoring", isCorrect: true, firstTryCorrect: false },
      { subtypeId: "stars_scoring", isCorrect: false, firstTryCorrect: false },
      { subtypeId: "stars_scoring", isCorrect: false, firstTryCorrect: false },
      { subtypeId: "stars_scoring", isCorrect: true, firstTryCorrect: false },
      { subtypeId: "stars_scoring", isCorrect: true, firstTryCorrect: false },
    ];

    expect(evaluateSubtypeMastery(attempts)).toBe(false);
  });
});

describe("unlock model", () => {
  it("keeps total scoring and winner locked until all pre-final sections are mastered", () => {
    expect(isSubtypeUnlocked("total_scoring", INITIAL_PROGRESS_STATE.subtypeMastery)).toBe(false);
    expect(isSubtypeUnlocked("winner_tiebreakers", INITIAL_PROGRESS_STATE.subtypeMastery)).toBe(false);

    const preFinalMastered = {
      popularity_tiers: true,
      stars_scoring: true,
      territories_scoring: true,
      resources_scoring: true,
      structure_bonus_farm_or_tundra: true,
      structure_bonus_tunnel_with_structures: true,
      structure_bonus_longest_structure_row: true,
      structure_bonus_tunnel_adjacent: true,
      structure_bonus_encounter_adjacent: true,
      structure_bonus_lake_adjacent: true,
    };

    expect(isSubtypeUnlocked("total_scoring", preFinalMastered)).toBe(true);
    expect(isSubtypeUnlocked("winner_tiebreakers", preFinalMastered)).toBe(true);
  });

  it("does not complete tutorial without all gates", () => {
    const progress = recomputeUnlockState({
      ...INITIAL_PROGRESS_STATE,
      subtypeMastery: {
        popularity_tiers: true,
      },
      singlePlayerMastered: true,
      maxMultiplayerUnlocked: 4,
    });

    expect(progress.tutorialCompleted).toBe(false);
    expect(progress.speedChallengeUnlocked).toBe(false);
  });

  it("completes tutorial after all gates", () => {
    const progress = recomputeUnlockState({
      ...INITIAL_PROGRESS_STATE,
      subtypeMastery: {
        popularity_tiers: true,
        stars_scoring: true,
        territories_scoring: true,
        resources_scoring: true,
        structure_bonus_farm_or_tundra: true,
        structure_bonus_tunnel_with_structures: true,
        structure_bonus_longest_structure_row: true,
        structure_bonus_tunnel_adjacent: true,
        structure_bonus_encounter_adjacent: true,
        structure_bonus_lake_adjacent: true,
        total_scoring: true,
        winner_tiebreakers: true,
      },
      singlePlayerMastered: true,
      maxMultiplayerUnlocked: 5,
    });

    expect(allSubtypesMastered(progress.subtypeMastery)).toBe(true);
    expect(progress.tutorialCompleted).toBe(true);
    expect(progress.speedChallengeUnlocked).toBe(true);
  });

  it("skip check perfect unlocks immediately", () => {
    const progress = applySkipCheckResult(INITIAL_PROGRESS_STATE, 5, 5);
    expect(progress.skipCheckPassed).toBe(true);
    expect(progress.tutorialCompleted).toBe(true);
    expect(progress.speedChallengeUnlocked).toBe(true);
    expect(progress.maxMultiplayerUnlocked).toBe(5);
  });
});

describe("getAdaptiveWinnerTiebreakerPlayerCount", () => {
  it("starts at 2 players for new learners", () => {
    expect(getAdaptiveWinnerTiebreakerPlayerCount([])).toBe(2);
  });

  it("ramps up quickly after early correct attempts", () => {
    expect(getAdaptiveWinnerTiebreakerPlayerCount([
      { isCorrect: true, firstTryCorrect: false },
    ])).toBe(3);

    expect(getAdaptiveWinnerTiebreakerPlayerCount([
      { isCorrect: true, firstTryCorrect: false },
      { isCorrect: true, firstTryCorrect: true },
    ])).toBe(4);
  });

  it("drops back down when recent accuracy is weak", () => {
    expect(getAdaptiveWinnerTiebreakerPlayerCount([
      { isCorrect: false, firstTryCorrect: false },
      { isCorrect: false, firstTryCorrect: false },
      { isCorrect: true, firstTryCorrect: false },
      { isCorrect: false, firstTryCorrect: false },
      { isCorrect: false, firstTryCorrect: false },
      { isCorrect: true, firstTryCorrect: false },
    ])).toBe(2);
  });

  it("reaches 5 players for strong mastery", () => {
    expect(getAdaptiveWinnerTiebreakerPlayerCount([
      { isCorrect: true, firstTryCorrect: true },
      { isCorrect: true, firstTryCorrect: true },
      { isCorrect: true, firstTryCorrect: false },
      { isCorrect: true, firstTryCorrect: true },
      { isCorrect: true, firstTryCorrect: true },
      { isCorrect: true, firstTryCorrect: true },
    ])).toBe(5);
  });
});
