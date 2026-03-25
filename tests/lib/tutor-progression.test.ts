import {
  INITIAL_PROGRESS_STATE,
  allSubtypesMastered,
  applySkipCheckResult,
  evaluateSubtypeMastery,
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
        structure_bonus_scoring: true,
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
