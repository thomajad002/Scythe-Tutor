import {
  evaluateBreakdownAttempt,
  getPopularityTier,
  scoreScenario,
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
