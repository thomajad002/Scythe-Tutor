import type {
  FullScoreBreakdown,
  FullScoringScenarioInput,
  LayeredHintLevel,
  MultiplayerRoundResult,
} from "@/lib/scythe/scoring";
import type { SubtypeId } from "@/lib/tutor/progression";

export type TutorAttemptHistoryItem = {
  isCorrect: boolean;
  firstTryCorrect: boolean;
};

export type SubtypeHintContext = {
  player: FullScoringScenarioInput;
  breakdown: FullScoreBreakdown;
  expectedValue: number | string;
  winnerDisplayName?: string;
  winnerTiebreakReason?: MultiplayerRoundResult["tiebreakReason"];
};

function countLeadingMatches<T>(items: T[], predicate: (item: T) => boolean): number {
  let count = 0;

  for (const item of items) {
    if (!predicate(item)) {
      break;
    }

    count += 1;
  }

  return count;
}

function formatExpectedValue(expectedValue: number | string): string {
  return typeof expectedValue === "number" ? String(expectedValue) : expectedValue;
}

function formatTiebreakReason(reason?: MultiplayerRoundResult["tiebreakReason"]): string {
  switch (reason) {
    case "score":
      return "raw score";
    case "unitsAndStructures":
      return "units and structures";
    case "power":
      return "power";
    case "popularity":
      return "popularity";
    case "resources":
      return "resources";
    case "territories":
      return "territories";
    case "stars":
      return "stars";
    case "shared":
      return "all tiebreakers";
    default:
      return "the tiebreak order";
  }
}

function structureSubtypeLabel(subtypeId: Extract<SubtypeId, `structure_bonus_${string}`>): string {
  switch (subtypeId) {
    case "structure_bonus_farm_or_tundra":
      return "farm or tundra";
    case "structure_bonus_tunnel_with_structures":
      return "structures on tunnels";
    case "structure_bonus_longest_structure_row":
      return "longest row of structures";
    case "structure_bonus_tunnel_adjacent":
      return "tunnel adjacent";
    case "structure_bonus_encounter_adjacent":
      return "encounter adjacent";
    case "structure_bonus_lake_adjacent":
      return "lake adjacent";
  }
}

export function chooseAdaptiveHintLevel(history: TutorAttemptHistoryItem[]): LayeredHintLevel {
  const recent = history.slice(0, 5);
  const incorrectStreak = countLeadingMatches(recent, (attempt) => !attempt.isCorrect);
  const correctStreak = countLeadingMatches(recent, (attempt) => attempt.isCorrect && attempt.firstTryCorrect);
  const correctCount = recent.filter((attempt) => attempt.isCorrect).length;

  if (incorrectStreak >= 3) {
    return 4;
  }

  if (incorrectStreak === 2) {
    return 3;
  }

  if (incorrectStreak === 1) {
    return 2;
  }

  if (correctStreak >= 2 || correctCount >= 4) {
    return 1;
  }

  return 1;
}

export function getSubtypeHints(
  subtypeId: SubtypeId,
  level: LayeredHintLevel,
  context: SubtypeHintContext,
): string {
  const expectedValue = formatExpectedValue(context.expectedValue);
  const starsMultiplier = context.breakdown.multipliers.stars;
  const territoriesMultiplier = context.breakdown.multipliers.territories;
  const resourcesMultiplier = context.breakdown.multipliers.resources;
  const structureLabel = subtypeId.startsWith("structure_bonus_")
    ? structureSubtypeLabel(subtypeId as Extract<SubtypeId, `structure_bonus_${string}`>)
    : null;

  switch (subtypeId) {
    case "popularity_tiers":
      switch (level) {
        case 1:
          return "Start with the popularity track before touching the score.";
        case 2:
          return "0-6 is low, 7-12 is mid, and 13-18 is high.";
        case 3:
          return "Match the player's popularity to the tier, then use that tier everywhere else.";
        default:
          return `Bottom-out: the correct tier is ${expectedValue}.`;
      }

    case "stars_scoring":
      switch (level) {
        case 1:
          return "Count stars only, then apply the popularity tier.";
        case 2:
          return `Use the star multiplier for the tier: low 3, mid 4, high 5.`;
        case 3:
          return `This player has ${context.player.stars} stars, so compute stars x ${starsMultiplier}.`;
        default:
          return `Bottom-out: ${context.player.stars} stars x ${starsMultiplier} = ${expectedValue}.`;
      }

    case "territories_scoring":
      switch (level) {
        case 1:
          return "Count controlled territories, not raw units.";
        case 2:
          return context.player.factoryControlled
            ? "If the Factory is controlled, count it as 3 territories before multiplying."
            : "Use controlled territories only, then apply the popularity multiplier.";
        case 3:
          return context.player.factoryControlled
            ? `This player controls the Factory, so convert territories to effective territories first (${context.player.territories} + 2 = ${context.breakdown.effectiveTerritories}), then compute ${context.breakdown.effectiveTerritories} x ${territoriesMultiplier}.`
            : `This player has ${context.breakdown.effectiveTerritories} effective territories, so compute ${context.breakdown.effectiveTerritories} x ${territoriesMultiplier}.`;
        default:
          return context.player.factoryControlled
            ? `Bottom-out: Factory is controlled, so use effective territories (${context.player.territories} + 2 = ${context.breakdown.effectiveTerritories}), then compute ${context.breakdown.effectiveTerritories} x ${territoriesMultiplier} = ${expectedValue}.`
            : `Bottom-out: ${context.breakdown.effectiveTerritories} territories x ${territoriesMultiplier} = ${expectedValue}.`;
      }

    case "resources_scoring":
      switch (level) {
        case 1:
          return "Resources score in pairs, not singles.";
        case 2:
          return "Divide resource tokens by 2 and round down before multiplying.";
        case 3:
          return `This player has ${context.player.resources} resources, which makes ${context.breakdown.resourcePairs} pairs.`;
        default:
          return `Bottom-out: ${context.breakdown.resourcePairs} pairs x ${resourcesMultiplier} = ${expectedValue}.`;
      }

    case "structure_bonus_farm_or_tundra":
    case "structure_bonus_tunnel_with_structures":
    case "structure_bonus_longest_structure_row":
    case "structure_bonus_tunnel_adjacent":
    case "structure_bonus_encounter_adjacent":
    case "structure_bonus_lake_adjacent":
      switch (level) {
        case 1:
          return `Focus only on the ${structureLabel} structure bonus tile.`;
        case 2:
          switch (subtypeId) {
            case "structure_bonus_farm_or_tundra":
              return "Count structures on farm or tundra hexes only.";
            case "structure_bonus_tunnel_with_structures":
              return "Count structures sitting on tunnel hexes; a Mine does not count as a tunnel.";
            case "structure_bonus_longest_structure_row":
              return "Only the single longest straight row of structures counts.";
            case "structure_bonus_tunnel_adjacent":
              return "Count tunnels adjacent to your structures, and do not count the same tunnel twice.";
            case "structure_bonus_encounter_adjacent":
              return "Count encounter hexes adjacent to your structures; rivers do not break adjacency.";
            case "structure_bonus_lake_adjacent":
              return "Count lake hexes adjacent to your structures and only count each lake once.";
          }
        case 3:
          switch (subtypeId) {
            case "structure_bonus_farm_or_tundra":
              return "Count every qualifying structure on farm or tundra, then read the coin band for that total.";
            case "structure_bonus_tunnel_with_structures":
              return "Count only structures on tunnel territories, then read the coin band for that total.";
            case "structure_bonus_longest_structure_row":
              return "Find the longest continuous straight row of structures, then read the coin band for that total.";
            case "structure_bonus_tunnel_adjacent":
              return "Count unique tunnel territories adjacent to your structures, then read the coin band for that total.";
            case "structure_bonus_encounter_adjacent":
              return "Count unique encounter hexes adjacent to your structures, then read the coin band for that total.";
            case "structure_bonus_lake_adjacent":
              return "Count unique lake hexes adjacent to your structures, then read the coin band for that total.";
          }
        default:
          return `Bottom-out: the correct structure bonus is ${expectedValue} coins.`;
      }

    case "total_scoring":
      switch (level) {
        case 1:
          return "Add every scoring category once and only once.";
        case 2:
          return "Total = stars + territories + resources + coins + structure bonus.";
        case 3:
          return "Recompute each category from the board, then add them left to right.";
        default:
          return `Bottom-out: the correct total is ${expectedValue}.`;
      }

    case "winner_tiebreakers":
      switch (level) {
        case 1:
          return "Compare total scores first, then check ties.";
        case 2:
          return "If totals are tied, use the tiebreak order from the rules.";
        case 3:
          return "Tiebreak order is units and structures, power, popularity, resources, territories, then stars.";
        default:
          return context.winnerDisplayName
            ? `Bottom-out: ${context.winnerDisplayName} wins on ${formatTiebreakReason(context.winnerTiebreakReason)}.`
            : `Bottom-out: the winning answer is ${expectedValue}.`;
      }
  }
}