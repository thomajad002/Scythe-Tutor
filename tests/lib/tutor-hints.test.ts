import { getLayeredHints, scoreFullScenario } from "@/lib/scythe/scoring";
import { chooseAdaptiveHintLevel, getSubtypeHints } from "@/lib/tutor/hints";
import { describe, expect, it } from "vitest";

describe("chooseAdaptiveHintLevel", () => {
  it("starts vague when the learner is doing well", () => {
    expect(
      chooseAdaptiveHintLevel([
        { isCorrect: true, firstTryCorrect: true },
        { isCorrect: true, firstTryCorrect: true },
        { isCorrect: true, firstTryCorrect: true },
      ]),
    ).toBe(1);
  });

  it("escalates after consecutive misses", () => {
    expect(
      chooseAdaptiveHintLevel([
        { isCorrect: false, firstTryCorrect: false },
        { isCorrect: false, firstTryCorrect: false },
      ]),
    ).toBe(3);

    expect(
      chooseAdaptiveHintLevel([
        { isCorrect: false, firstTryCorrect: false },
        { isCorrect: false, firstTryCorrect: false },
        { isCorrect: false, firstTryCorrect: false },
      ]),
    ).toBe(4);
  });
});

describe("getSubtypeHints", () => {
  const breakdown = scoreFullScenario({
    stars: 3,
    territories: 5,
    resources: 11,
    coins: 7,
    popularity: 8,
    factoryControlled: true,
    structureBonusCoins: 6,
  });

  it("reveals the final answer on bottom-out for numeric subtypes", () => {
    const hint = getSubtypeHints("resources_scoring", 4, {
      player: {
        stars: 3,
        territories: 5,
        resources: 11,
        coins: 7,
        popularity: 8,
        factoryControlled: true,
        structureBonusCoins: 6,
      },
      breakdown,
      expectedValue: breakdown.points.resources,
    });

    expect(hint).toContain(String(breakdown.points.resources));
    expect(hint).toContain("Bottom-out");
  });

  it("reveals the winner on bottom-out for tiebreakers", () => {
    const hint = getSubtypeHints("winner_tiebreakers", 4, {
      player: {
        stars: 3,
        territories: 5,
        resources: 11,
        coins: 7,
        popularity: 8,
        factoryControlled: true,
        structureBonusCoins: 6,
      },
      breakdown,
      expectedValue: "p2",
      winnerDisplayName: "Rusviet (2)",
      winnerTiebreakReason: "power",
    });

    expect(hint).toBe("Bottom-out: Rusviet (2) wins on power.");
  });
});

describe("getLayeredHints", () => {
  it("keeps generic component hints generic", () => {
    const hints = getLayeredHints(
      [
        {
          field: "stars",
          code: "incorrect_component",
          message: "x",
        },
      ],
      3,
    );

    expect(hints).toEqual(["Recompute the category from the raw count and the matching rule."]);
    expect(hints[0]).not.toContain("Factory");
    expect(hints[0]).not.toContain("structure bonus");
  });
});