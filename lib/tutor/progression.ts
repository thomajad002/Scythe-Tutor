export const SUBTYPE_IDS = [
  "popularity_tiers",
  "stars_scoring",
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
] as const;

export type SubtypeId = (typeof SUBTYPE_IDS)[number];

const PRIMARY_SUBTYPE_COUNT = SUBTYPE_IDS.length - 2;

export type SubtypeAttempt = {
  subtypeId: SubtypeId;
  isCorrect: boolean;
  firstTryCorrect: boolean;
};

export type SubtypeAttemptHistoryItem = {
  isCorrect: boolean;
  firstTryCorrect: boolean;
};

export type TutorProgressState = {
  subtypeMastery: Partial<Record<SubtypeId, boolean>>;
  singlePlayerConsecutiveCorrect: number;
  singlePlayerMastered: boolean;
  maxMultiplayerUnlocked: number;
  speedChallengeUnlocked: boolean;
  tutorialCompleted: boolean;
  skipCheckPassed: boolean;
};

export const INITIAL_PROGRESS_STATE: TutorProgressState = {
  subtypeMastery: {},
  singlePlayerConsecutiveCorrect: 0,
  singlePlayerMastered: false,
  maxMultiplayerUnlocked: 1,
  speedChallengeUnlocked: false,
  tutorialCompleted: false,
  skipCheckPassed: false,
};

export function allSubtypesMastered(subtypeMastery: Partial<Record<SubtypeId, boolean>>): boolean {
  return SUBTYPE_IDS.every((subtypeId) => subtypeMastery[subtypeId] === true);
}

export function arePrimarySubtypesMastered(subtypeMastery: Partial<Record<SubtypeId, boolean>>): boolean {
  return SUBTYPE_IDS.slice(0, PRIMARY_SUBTYPE_COUNT).every((subtypeId) => subtypeMastery[subtypeId] === true);
}

export function isSubtypeUnlocked(subtypeId: SubtypeId, subtypeMastery: Partial<Record<SubtypeId, boolean>>): boolean {
  const subtypeIndex = SUBTYPE_IDS.indexOf(subtypeId);
  return subtypeIndex < PRIMARY_SUBTYPE_COUNT || arePrimarySubtypesMastered(subtypeMastery);
}

export function evaluateSubtypeMastery(attemptsNewestFirst: SubtypeAttempt[]): boolean {
  const firstTryStreak = attemptsNewestFirst
    .slice(0, 2)
    .every((attempt) => attempt.isCorrect && attempt.firstTryCorrect);

  if (firstTryStreak && attemptsNewestFirst.length >= 2) {
    return true;
  }

  const recentFive = attemptsNewestFirst.slice(0, 5);
  if (recentFive.length < 5) {
    return false;
  }

  const correctCount = recentFive.filter((attempt) => attempt.isCorrect).length;
  return correctCount / 5 >= 0.8;
}

export function recomputeUnlockState(progress: TutorProgressState): TutorProgressState {
  const masteredAllSubtypes = allSubtypesMastered(progress.subtypeMastery);
  const maxMultiplayerUnlocked = Math.min(Math.max(progress.maxMultiplayerUnlocked, 1), 7);

  const completedViaGates =
    masteredAllSubtypes && progress.singlePlayerMastered && maxMultiplayerUnlocked >= 5;

  const tutorialCompleted = progress.skipCheckPassed || completedViaGates;
  const speedChallengeUnlocked = progress.skipCheckPassed || completedViaGates;

  return {
    ...progress,
    maxMultiplayerUnlocked,
    tutorialCompleted,
    speedChallengeUnlocked,
  };
}

export function applySkipCheckResult(
  progress: TutorProgressState,
  correctPlayers: number,
  totalPlayers: number,
): TutorProgressState {
  const isPerfect = totalPlayers > 0 && correctPlayers === totalPlayers;
  if (!isPerfect) {
    return recomputeUnlockState(progress);
  }

  const fullyMasteredSubtypes = SUBTYPE_IDS.reduce<Partial<Record<SubtypeId, boolean>>>(
    (acc, subtypeId) => {
      acc[subtypeId] = true;
      return acc;
    },
    {},
  );

  return recomputeUnlockState({
    ...progress,
    skipCheckPassed: true,
    subtypeMastery: fullyMasteredSubtypes,
    singlePlayerConsecutiveCorrect: 2,
    singlePlayerMastered: true,
    maxMultiplayerUnlocked: 5,
  });
}

export function getAdaptiveWinnerTiebreakerPlayerCount(
  attemptsNewestFirst: SubtypeAttemptHistoryItem[],
): 2 | 3 | 4 | 5 {
  if (attemptsNewestFirst.length === 0) {
    return 2;
  }

  const lastOne = attemptsNewestFirst[0];
  if (attemptsNewestFirst.length === 1) {
    return lastOne?.isCorrect ? 3 : 2;
  }

  const lastThree = attemptsNewestFirst.slice(0, 3);
  if (lastThree.length === 3 && lastThree.every((attempt) => attempt.isCorrect)) {
    return 5;
  }

  const lastTwo = attemptsNewestFirst.slice(0, 2);
  if (lastTwo.every((attempt) => attempt.isCorrect)) {
    return 4;
  }

  const recent = attemptsNewestFirst.slice(0, 6);
  const correctCount = recent.filter((attempt) => attempt.isCorrect).length;
  const firstTryCorrectCount = recent.filter((attempt) => attempt.isCorrect && attempt.firstTryCorrect).length;
  const accuracy = correctCount / recent.length;
  const firstTryAccuracy = firstTryCorrectCount / recent.length;

  if (accuracy >= 0.8 && firstTryAccuracy >= 0.6) {
    return 5;
  }

  if (accuracy >= 0.65) {
    return 4;
  }

  if (accuracy >= 0.5) {
    return 3;
  }

  return 2;
}
