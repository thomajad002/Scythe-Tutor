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
  total?: number;
};

export type ScoringErrorCode =
  | "incorrect_multiplier"
  | "miscounted_resources"
  | "arithmetic_sum_error"
  | "omitted_category"
  | "incorrect_component";

export type BreakdownEvaluation = {
  expected: ScoreBreakdown["points"];
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
