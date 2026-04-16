import {
  evaluateBreakdownAttempt,
  evaluateFullBreakdownAttempt,
  getBreakdownAttemptHints,
  getLayeredHints,
  getPopularityTier,
  scoreScenario,
  scoreFullScenario,
  scoreMultiplayerRound,
  type ScoringScenarioInput,
} from "@/lib/scythe/scoring";
import { describe, expect, it } from "vitest";

describe("getPopularityTier", () => {
  it("classifies low tier", () => {
    expect(getPopularityTier(0)).toBe("low");
    expect(getPopularityTier(6)).toBe("low");
  });

  it("classifies mid tier", () => {
    expect(getPopularityTier(7)).toBe("mid");
    expect(getPopularityTier(12)).toBe("mid");
  });

  it("classifies high tier", () => {
    expect(getPopularityTier(13)).toBe("high");
    expect(getPopularityTier(18)).toBe("high");
  });
});

describe("scoreScenario", () => {
  it("scores categories using low popularity multipliers", () => {
    const result = scoreScenario({
      stars: 3,
      territories: 5,
      resources: 7,
      coins: 9,
      popularity: 4,
    });

    expect(result.points).toEqual({
      stars: 9,
      territories: 10,
      resources: 3,
      coins: 9,
      total: 31,
    });
  });

  it("scores categories using high popularity multipliers", () => {
    const result = scoreScenario({
      stars: 4,
      territories: 4,
      resources: 8,
      coins: 10,
      popularity: 14,
    });

    expect(result.points).toEqual({
      stars: 20,
      territories: 16,
      resources: 12,
      coins: 10,
      total: 58,
    });
  });
});

describe("evaluateBreakdownAttempt", () => {
  const scenario: ScoringScenarioInput = {
    stars: 3,
    territories: 6,
    resources: 11,
    coins: 12,
    popularity: 8,
  };

  it("accepts a fully correct attempt", () => {
    const evaluation = evaluateBreakdownAttempt(scenario, {
      stars: 12,
      territories: 18,
      resources: 10,
      coins: 12,
      total: 52,
    });

    expect(evaluation.isFullyCorrect).toBe(true);
    expect(evaluation.errors).toHaveLength(0);
  });

  it("detects omitted categories", () => {
    const evaluation = evaluateBreakdownAttempt(scenario, {
      stars: 12,
      territories: 18,
    });

    expect(evaluation.isFullyCorrect).toBe(false);
    expect(evaluation.errors.some((error) => error.code === "omitted_category")).toBe(true);
  });

  it("detects incorrect multiplier usage", () => {
    const evaluation = evaluateBreakdownAttempt(scenario, {
      stars: 9,
      territories: 12,
      resources: 5,
      coins: 12,
      total: 38,
    });

    const multiplierErrors = evaluation.errors.filter((error) => error.code === "incorrect_multiplier");
    expect(multiplierErrors.length).toBe(3);
  });

  it("detects resource pair counting mistakes", () => {
    const evaluation = evaluateBreakdownAttempt(scenario, {
      stars: 12,
      territories: 18,
      resources: 22,
      coins: 12,
      total: 64,
    });

    expect(evaluation.errors.some((error) => error.code === "miscounted_resources")).toBe(true);
  });

  it("detects arithmetic sum errors", () => {
    const evaluation = evaluateBreakdownAttempt(scenario, {
      stars: 12,
      territories: 18,
      resources: 10,
      coins: 12,
      total: 50,
    });

    expect(evaluation.errors.some((error) => error.code === "arithmetic_sum_error")).toBe(true);
  });
});

describe("scoreFullScenario", () => {
  it("applies factory and structure bonus correctly", () => {
    const result = scoreFullScenario({
      stars: 4,
      territories: 6,
      resources: 10,
      coins: 8,
      popularity: 11,
      factoryControlled: true,
      structureBonusCoins: 6,
    });

    expect(result.points).toEqual({
      stars: 16,
      territories: 24,
      resources: 10,
      coins: 8,
      structureBonus: 6,
      total: 64,
    });
  });
});

describe("evaluateFullBreakdownAttempt", () => {
  it("flags missing factory territory adjustment", () => {
    const evaluation = evaluateFullBreakdownAttempt(
      {
        stars: 2,
        territories: 5,
        resources: 8,
        coins: 10,
        popularity: 9,
        factoryControlled: true,
        structureBonusCoins: 4,
      },
      {
        stars: 8,
        territories: 15,
        resources: 8,
        coins: 10,
        structureBonus: 4,
        total: 45,
      },
    );

    expect(evaluation.isFullyCorrect).toBe(false);
    expect(evaluation.errors.some((error) => error.field === "territories")).toBe(true);
  });
});

describe("getBreakdownAttemptHints", () => {
  it("returns field-specific bottom-out hints for total scoring", () => {
    const scenario = {
      stars: 3,
      territories: 5,
      resources: 11,
      coins: 7,
      popularity: 8,
      factoryControlled: true,
      structureBonusCoins: 6,
    };
    const breakdown = scoreFullScenario(scenario);

    const hints = getBreakdownAttemptHints(
      [
        { field: "stars", code: "incorrect_component", message: "x" },
        { field: "total", code: "arithmetic_sum_error", message: "x" },
      ],
      4,
      {
        scenario,
        breakdown,
      },
    );

    expect(hints).toEqual([
      "Bottom-out: 3 stars x 4 = 12.",
      "Bottom-out: 12 + 21 + 10 + 7 + 6 = 56.",
    ]);
  });
});

describe("scoreMultiplayerRound", () => {
  it("uses tiebreakers when totals are tied", () => {
    const round = scoreMultiplayerRound([
      {
        playerId: "p1",
        stars: 3,
        territories: 6,
        resources: 8,
        coins: 9,
        popularity: 10,
        structureBonusCoins: 0,
        factoryControlled: false,
        tiebreaker: {
          unitsAndStructures: 12,
          power: 7,
          popularity: 10,
          resources: 8,
          territories: 6,
          stars: 3,
        },
      },
      {
        playerId: "p2",
        stars: 3,
        territories: 6,
        resources: 8,
        coins: 9,
        popularity: 10,
        structureBonusCoins: 0,
        factoryControlled: false,
        tiebreaker: {
          unitsAndStructures: 14,
          power: 6,
          popularity: 10,
          resources: 8,
          territories: 6,
          stars: 3,
        },
      },
    ]);

    expect(round.winnerPlayerId).toBe("p2");
    expect(round.tiebreakReason).toBe("unitsAndStructures");
  });

  it("reports the deciding tiebreak reason when the first player wins the tie", () => {
    const round = scoreMultiplayerRound([
      {
        playerId: "p1",
        stars: 3,
        territories: 7,
        resources: 6,
        coins: 17,
        popularity: 12,
        structureBonusCoins: 9,
        factoryControlled: false,
        tiebreaker: {
          unitsAndStructures: 14,
          power: 16,
          popularity: 12,
          resources: 6,
          territories: 7,
          stars: 3,
        },
      },
      {
        playerId: "p2",
        stars: 6,
        territories: 6,
        resources: 4,
        coins: 10,
        popularity: 7,
        structureBonusCoins: 9,
        factoryControlled: false,
        tiebreaker: {
          unitsAndStructures: 11,
          power: 16,
          popularity: 7,
          resources: 4,
          territories: 6,
          stars: 6,
        },
      },
    ]);

    expect(round.winnerPlayerId).toBe("p1");
    expect(round.tiebreakReason).toBe("unitsAndStructures");
  });
});

describe("getLayeredHints", () => {
  it("returns deterministic hints for a level", () => {
    const hints = getLayeredHints(
      [
        {
          field: "resources",
          code: "miscounted_resources",
          message: "x",
        },
      ],
      2,
    );

    expect(hints).toEqual(["Compute resource pairs with floor(resources / 2) before multiplying."]);
  });
});
