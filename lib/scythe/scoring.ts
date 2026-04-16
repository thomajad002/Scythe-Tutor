export type PopularityTier = "low" | "mid" | "high";

export type ScoringScenarioInput = {
  stars: number;
  territories: number;
  resources: number;
  coins: number;
  popularity: number;
};

export type ScoreBreakdown = {
  popularityTier: PopularityTier;
  multipliers: {
    stars: number;
    territories: number;
    resources: number;
  };
  points: {
    stars: number;
    territories: number;
    resources: number;
    coins: number;
    total: number;
  };
  resourcePairs: number;
};

export type BreakdownAttempt = {
  stars?: number;
  territories?: number;
  resources?: number;
  coins?: number;
  structureBonus?: number;
  total?: number;
};

export type WinnerTiebreakStats = {
  unitsAndStructures: number;
  power: number;
  popularity: number;
  resources: number;
  territories: number;
  stars: number;
};

export type FullScoringScenarioInput = ScoringScenarioInput & {
  structureBonusCoins?: number;
  factoryControlled?: boolean;
};

export type MultiplayerScoringPlayerInput = FullScoringScenarioInput & {
  playerId: string;
  tiebreaker: WinnerTiebreakStats;
};

export type FullScoreBreakdown = {
  popularityTier: PopularityTier;
  multipliers: {
    stars: number;
    territories: number;
    resources: number;
  };
  resourcePairs: number;
  effectiveTerritories: number;
  points: {
    stars: number;
    territories: number;
    resources: number;
    coins: number;
    structureBonus: number;
    total: number;
  };
};

export type LayeredHintLevel = 1 | 2 | 3 | 4;

export type MultiplayerRoundResult = {
  perPlayer: Array<{
    playerId: string;
    total: number;
    breakdown: FullScoreBreakdown;
  }>;
  winnerPlayerId: string;
  tiebreakReason: "score" | keyof WinnerTiebreakStats | "shared";
};

export type ScoringErrorCode =
  | "incorrect_multiplier"
  | "miscounted_resources"
  | "arithmetic_sum_error"
  | "omitted_category"
  | "incorrect_component";

export type BreakdownEvaluation = {
  expected:
    | ScoreBreakdown["points"]
    | FullScoreBreakdown["points"];
  isFullyCorrect: boolean;
  errors: Array<{
    field: keyof BreakdownAttempt;
    code: ScoringErrorCode;
    message: string;
  }>;
};

const MULTIPLIERS: Record<PopularityTier, { stars: number; territories: number; resources: number }> = {
  low: { stars: 3, territories: 2, resources: 1 },
  mid: { stars: 4, territories: 3, resources: 2 },
  high: { stars: 5, territories: 4, resources: 3 },
};

function assertNonNegativeInt(value: number, field: string): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${field} must be a non-negative integer`);
  }
}

export function getPopularityTier(popularity: number): PopularityTier {
  assertNonNegativeInt(popularity, "popularity");

  if (popularity <= 6) {
    return "low";
  }

  if (popularity <= 12) {
    return "mid";
  }

  return "high";
}

export function scoreScenario(input: ScoringScenarioInput): ScoreBreakdown {
  assertNonNegativeInt(input.stars, "stars");
  assertNonNegativeInt(input.territories, "territories");
  assertNonNegativeInt(input.resources, "resources");
  assertNonNegativeInt(input.coins, "coins");

  const popularityTier = getPopularityTier(input.popularity);
  const multipliers = MULTIPLIERS[popularityTier];
  const resourcePairs = Math.floor(input.resources / 2);

  const stars = input.stars * multipliers.stars;
  const territories = input.territories * multipliers.territories;
  const resources = resourcePairs * multipliers.resources;
  const coins = input.coins;
  const total = stars + territories + resources + coins;

  return {
    popularityTier,
    multipliers,
    resourcePairs,
    points: {
      stars,
      territories,
      resources,
      coins,
      total,
    },
  };
}

function detectWrongMultiplier(
  attemptValue: number,
  count: number,
  expectedTier: PopularityTier,
  field: "stars" | "territories" | "resources",
): boolean {
  const allTiers: PopularityTier[] = ["low", "mid", "high"];

  return allTiers.some((tier) => {
    if (tier === expectedTier) {
      return false;
    }

    return attemptValue === count * MULTIPLIERS[tier][field];
  });
}

export function evaluateBreakdownAttempt(
  scenario: ScoringScenarioInput,
  attempt: BreakdownAttempt,
): BreakdownEvaluation {
  const breakdown = scoreScenario(scenario);
  const expected = breakdown.points;
  const errors: BreakdownEvaluation["errors"] = [];

  const requiredFields: Array<keyof BreakdownAttempt> = [
    "stars",
    "territories",
    "resources",
    "coins",
    "total",
  ];

  for (const field of requiredFields) {
    if (attempt[field] === undefined) {
      errors.push({
        field,
        code: "omitted_category",
        message: `Missing value for ${field}.`,
      });
    }
  }

  if (attempt.stars !== undefined && attempt.stars !== expected.stars) {
    if (detectWrongMultiplier(attempt.stars, scenario.stars, breakdown.popularityTier, "stars")) {
      errors.push({
        field: "stars",
        code: "incorrect_multiplier",
        message: "Star points suggest an incorrect popularity multiplier.",
      });
    } else {
      errors.push({
        field: "stars",
        code: "incorrect_component",
        message: "Star points are incorrect.",
      });
    }
  }

  if (attempt.territories !== undefined && attempt.territories !== expected.territories) {
    if (
      detectWrongMultiplier(
        attempt.territories,
        scenario.territories,
        breakdown.popularityTier,
        "territories",
      )
    ) {
      errors.push({
        field: "territories",
        code: "incorrect_multiplier",
        message: "Territory points suggest an incorrect popularity multiplier.",
      });
    } else {
      errors.push({
        field: "territories",
        code: "incorrect_component",
        message: "Territory points are incorrect.",
      });
    }
  }

  if (attempt.resources !== undefined && attempt.resources !== expected.resources) {
    const usedRawResourceCount =
      attempt.resources === scenario.resources * breakdown.multipliers.resources;

    if (
      detectWrongMultiplier(
        attempt.resources,
        breakdown.resourcePairs,
        breakdown.popularityTier,
        "resources",
      )
    ) {
      errors.push({
        field: "resources",
        code: "incorrect_multiplier",
        message: "Resource points suggest an incorrect popularity multiplier.",
      });
    } else if (usedRawResourceCount) {
      errors.push({
        field: "resources",
        code: "miscounted_resources",
        message: "Resources are scored in pairs; divide resource count by 2 and round down.",
      });
    } else {
      errors.push({
        field: "resources",
        code: "incorrect_component",
        message: "Resource points are incorrect.",
      });
    }
  }

  if (attempt.coins !== undefined && attempt.coins !== expected.coins) {
    errors.push({
      field: "coins",
      code: "incorrect_component",
      message: "Coin points are incorrect.",
    });
  }

  if (attempt.total !== undefined && attempt.total !== expected.total) {
    const stars = attempt.stars ?? 0;
    const territories = attempt.territories ?? 0;
    const resources = attempt.resources ?? 0;
    const coins = attempt.coins ?? 0;
    const attemptedSum = stars + territories + resources + coins;

    if (attempt.total === attemptedSum) {
      errors.push({
        field: "total",
        code: "incorrect_component",
        message: "Total is consistent with your entries but one or more component scores are wrong.",
      });
    } else {
      errors.push({
        field: "total",
        code: "arithmetic_sum_error",
        message: "Total does not equal the sum of category points.",
      });
    }
  }

  return {
    expected,
    isFullyCorrect: errors.length === 0,
    errors,
  };
}

export function scoreFullScenario(input: FullScoringScenarioInput): FullScoreBreakdown {
  assertNonNegativeInt(input.stars, "stars");
  assertNonNegativeInt(input.territories, "territories");
  assertNonNegativeInt(input.resources, "resources");
  assertNonNegativeInt(input.coins, "coins");

  const popularityTier = getPopularityTier(input.popularity);
  const multipliers = MULTIPLIERS[popularityTier];
  const resourcePairs = Math.floor(input.resources / 2);
  const effectiveTerritories = input.territories + (input.factoryControlled ? 2 : 0);
  const structureBonus = input.structureBonusCoins ?? 0;

  const stars = input.stars * multipliers.stars;
  const territories = effectiveTerritories * multipliers.territories;
  const resources = resourcePairs * multipliers.resources;
  const coins = input.coins;
  const total = stars + territories + resources + coins + structureBonus;

  return {
    popularityTier,
    multipliers,
    resourcePairs,
    effectiveTerritories,
    points: {
      stars,
      territories,
      resources,
      coins,
      structureBonus,
      total,
    },
  };
}

export function evaluateFullBreakdownAttempt(
  scenario: FullScoringScenarioInput,
  attempt: BreakdownAttempt,
): BreakdownEvaluation {
  const breakdown = scoreFullScenario(scenario);
  const expected = breakdown.points;
  const errors: BreakdownEvaluation["errors"] = [];

  const requiredFields: Array<keyof BreakdownAttempt> = [
    "stars",
    "territories",
    "resources",
    "coins",
    "structureBonus",
    "total",
  ];

  for (const field of requiredFields) {
    if (attempt[field] === undefined) {
      errors.push({
        field,
        code: "omitted_category",
        message: `Missing value for ${field}.`,
      });
    }
  }

  if (attempt.stars !== undefined && attempt.stars !== expected.stars) {
    if (detectWrongMultiplier(attempt.stars, scenario.stars, breakdown.popularityTier, "stars")) {
      errors.push({
        field: "stars",
        code: "incorrect_multiplier",
        message: "Star points suggest an incorrect popularity multiplier.",
      });
    } else {
      errors.push({
        field: "stars",
        code: "incorrect_component",
        message: "Star points are incorrect.",
      });
    }
  }

  if (attempt.territories !== undefined && attempt.territories !== expected.territories) {
    const rawTerritories = scenario.territories;

    if (detectWrongMultiplier(attempt.territories, rawTerritories, breakdown.popularityTier, "territories")) {
      errors.push({
        field: "territories",
        code: "incorrect_multiplier",
        message: "Territory points suggest an incorrect popularity multiplier.",
      });
    } else if (
      scenario.factoryControlled &&
      attempt.territories === rawTerritories * breakdown.multipliers.territories
    ) {
      errors.push({
        field: "territories",
        code: "incorrect_component",
        message: "Factory counts as 3 territories when controlled.",
      });
    } else {
      errors.push({
        field: "territories",
        code: "incorrect_component",
        message: "Territory points are incorrect.",
      });
    }
  }

  if (attempt.resources !== undefined && attempt.resources !== expected.resources) {
    const usedRawResourceCount =
      attempt.resources === scenario.resources * breakdown.multipliers.resources;

    if (
      detectWrongMultiplier(
        attempt.resources,
        breakdown.resourcePairs,
        breakdown.popularityTier,
        "resources",
      )
    ) {
      errors.push({
        field: "resources",
        code: "incorrect_multiplier",
        message: "Resource points suggest an incorrect popularity multiplier.",
      });
    } else if (usedRawResourceCount) {
      errors.push({
        field: "resources",
        code: "miscounted_resources",
        message: "Resources are scored in pairs; divide resource count by 2 and round down.",
      });
    } else {
      errors.push({
        field: "resources",
        code: "incorrect_component",
        message: "Resource points are incorrect.",
      });
    }
  }

  if (attempt.coins !== undefined && attempt.coins !== expected.coins) {
    errors.push({
      field: "coins",
      code: "incorrect_component",
      message: "Coin points are incorrect.",
    });
  }

  if (attempt.structureBonus !== undefined && attempt.structureBonus !== expected.structureBonus) {
    errors.push({
      field: "structureBonus",
      code: "incorrect_component",
      message: "Structure bonus points are incorrect.",
    });
  }

  if (attempt.total !== undefined && attempt.total !== expected.total) {
    const stars = attempt.stars ?? 0;
    const territories = attempt.territories ?? 0;
    const resources = attempt.resources ?? 0;
    const coins = attempt.coins ?? 0;
    const structureBonus = attempt.structureBonus ?? 0;
    const attemptedSum = stars + territories + resources + coins + structureBonus;

    if (attempt.total === attemptedSum) {
      errors.push({
        field: "total",
        code: "incorrect_component",
        message: "Total is consistent with your entries but one or more component scores are wrong.",
      });
    } else {
      errors.push({
        field: "total",
        code: "arithmetic_sum_error",
        message: "Total does not equal the sum of category points.",
      });
    }
  }

  return {
    expected,
    isFullyCorrect: errors.length === 0,
    errors,
  };
}

function compareTiebreakers(a: WinnerTiebreakStats, b: WinnerTiebreakStats): keyof WinnerTiebreakStats | null {
  const order: Array<keyof WinnerTiebreakStats> = [
    "unitsAndStructures",
    "power",
    "popularity",
    "resources",
    "territories",
    "stars",
  ];

  for (const key of order) {
    if (a[key] > b[key]) {
      return key;
    }

    if (a[key] < b[key]) {
      return key;
    }
  }

  return null;
}

export function scoreMultiplayerRound(players: MultiplayerScoringPlayerInput[]): MultiplayerRoundResult {
  if (players.length === 0) {
    throw new Error("At least one player is required");
  }

  const perPlayer = players.map((player) => {
    const breakdown = scoreFullScenario(player);
    return {
      playerId: player.playerId,
      total: breakdown.points.total,
      breakdown,
      tiebreaker: player.tiebreaker,
    };
  });

  let best = perPlayer[0];
  let tiebreakReason: MultiplayerRoundResult["tiebreakReason"] = "score";

  for (let index = 1; index < perPlayer.length; index += 1) {
    const candidate = perPlayer[index];

    if (candidate.total > best.total) {
      best = candidate;
      tiebreakReason = "score";
      continue;
    }

    if (candidate.total < best.total) {
      continue;
    }

    const tiebreakKey = compareTiebreakers(candidate.tiebreaker, best.tiebreaker);
    if (!tiebreakKey) {
      tiebreakReason = "shared";
      continue;
    }

    tiebreakReason = tiebreakKey;
    if (candidate.tiebreaker[tiebreakKey] > best.tiebreaker[tiebreakKey]) {
      best = candidate;
    }
  }

  return {
    perPlayer: perPlayer.map((player) => ({
      playerId: player.playerId,
      total: player.total,
      breakdown: player.breakdown,
    })),
    winnerPlayerId: best.playerId,
    tiebreakReason,
  };
}

const HINT_TEXT: Record<ScoringErrorCode, Record<LayeredHintLevel, string>> = {
  incorrect_multiplier: {
    1: "Re-check which popularity tier applies to this scenario.",
    2: "Find the tier first, then use its category multiplier for stars/territories/resources.",
    3: "Tier multipliers are low 3/2/1, mid 4/3/2, high 5/4/3 for stars/territories/resources.",
    4: "Use the tier shown in the summary and recompute the category from the raw count.",
  },
  miscounted_resources: {
    1: "Resources score in pairs, not singles.",
    2: "Compute resource pairs with floor(resources / 2) before multiplying.",
    3: "Example: 11 resources => 5 pairs, then apply the tier resource multiplier.",
    4: "Recount the raw resources, convert them into pairs, and then multiply again.",
  },
  arithmetic_sum_error: {
    1: "Double-check your total arithmetic.",
    2: "Add stars + territories + resources + coins (+ structure bonus) exactly once.",
    3: "Re-sum from left to right and verify each component before final total.",
    4: "The total should match the category sum in the summary after you recompute every part.",
  },
  omitted_category: {
    1: "One category is missing.",
    2: "Submit values for stars, territories, resources, coins, structure bonus, and total.",
    3: "Use a checklist: stars -> territories -> resources -> coins -> structure bonus -> total.",
    4: "Fill every category before resubmitting; the summary shows the expected values.",
  },
  incorrect_component: {
    1: "One component is off. Recompute that category.",
    2: "Verify raw count, then multiplier/rule, then final component value.",
    3: "Recompute the category from the raw count and the matching rule.",
    4: "Use the summary to identify the specific category that needs to be recomputed.",
  },
};

export function getLayeredHints(
  errors: BreakdownEvaluation["errors"],
  level: LayeredHintLevel,
): string[] {
  const uniqueCodes = Array.from(new Set(errors.map((error) => error.code)));
  return uniqueCodes.map((code) => HINT_TEXT[code][level]);
}

type BreakdownHintContext = {
  scenario: FullScoringScenarioInput;
  breakdown: FullScoreBreakdown;
};

export function getBreakdownAttemptHints(
  errors: BreakdownEvaluation["errors"],
  level: LayeredHintLevel,
  context: BreakdownHintContext,
): string[] {
  return errors.map((error) => {
    switch (error.field) {
      case "stars":
        switch (level) {
          case 1:
            return "Count stars only, then apply the popularity tier.";
          case 2:
            return "Use the star multiplier for the tier: low 3, mid 4, high 5.";
          case 3:
            return `This player has ${context.scenario.stars} stars, so compute stars x ${context.breakdown.multipliers.stars}.`;
          default:
            return `Bottom-out: ${context.scenario.stars} stars x ${context.breakdown.multipliers.stars} = ${context.breakdown.points.stars}.`;
        }

      case "territories":
        switch (level) {
          case 1:
            return context.scenario.factoryControlled
              ? "Count controlled territories and include the Factory if it is controlled."
              : "Count controlled territories, not raw units.";
          case 2:
            return context.scenario.factoryControlled
              ? "If the Factory is controlled, add 2 to territories before multiplying because it counts as 3 territories."
              : "Use controlled territories only, then apply the popularity multiplier.";
          case 3:
            return context.scenario.factoryControlled
              ? `This player controls the Factory, so use ${context.breakdown.effectiveTerritories} effective territories before multiplying.`
              : `This player has ${context.breakdown.effectiveTerritories} effective territories, so multiply that count by ${context.breakdown.multipliers.territories}.`;
          default:
            return context.scenario.factoryControlled
              ? `Bottom-out: ${context.scenario.territories} + 2 = ${context.breakdown.effectiveTerritories}, then ${context.breakdown.effectiveTerritories} x ${context.breakdown.multipliers.territories} = ${context.breakdown.points.territories}.`
              : `Bottom-out: ${context.breakdown.effectiveTerritories} territories x ${context.breakdown.multipliers.territories} = ${context.breakdown.points.territories}.`;
        }

      case "resources":
        switch (level) {
          case 1:
            return "Resources score in pairs, not singles.";
          case 2:
            return "Divide resource tokens by 2 and round down before multiplying.";
          case 3:
            return `This player has ${context.scenario.resources} resources, which makes ${context.breakdown.resourcePairs} pairs.`;
          default:
            return `Bottom-out: ${context.breakdown.resourcePairs} pairs x ${context.breakdown.multipliers.resources} = ${context.breakdown.points.resources}.`;
        }

      case "coins":
        switch (level) {
          case 1:
            return "Coins score one-for-one.";
          case 2:
            return "Use the coin total directly; no multiplier applies.";
          case 3:
            return `This player has ${context.scenario.coins} coins, so the coin score is ${context.breakdown.points.coins}.`;
          default:
            return `Bottom-out: ${context.scenario.coins} coins = ${context.breakdown.points.coins}.`;
        }

      case "structureBonus":
        switch (level) {
          case 1:
            return "Use the structure bonus coins as their own category.";
          case 2:
            return "Do not mix the structure bonus into the coin total.";
          case 3:
            return `This scenario awards ${context.breakdown.points.structureBonus} structure bonus coins.`;
          default:
            return `Bottom-out: structure bonus = ${context.breakdown.points.structureBonus}.`;
        }

      case "total":
        switch (level) {
          case 1:
            return "Add every category once, then check the total.";
          case 2:
            return "Total = stars + territories + resources + coins + structure bonus.";
          case 3:
            return `Recompute each category from the board, then add them to reach ${context.breakdown.points.total}.`;
          default:
            return `Bottom-out: ${context.breakdown.points.stars} + ${context.breakdown.points.territories} + ${context.breakdown.points.resources} + ${context.breakdown.points.coins} + ${context.breakdown.points.structureBonus} = ${context.breakdown.points.total}.`;
        }
    }
  });
}
