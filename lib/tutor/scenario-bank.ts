import { cache } from "react";
import scenariosData from "@/data/games/scythe_scenarios.json";
import { loadScytheBoardData } from "@/lib/scythe/board-data";
import type { MultiplayerScoringPlayerInput } from "@/lib/scythe/scoring";

type HexPoint = { x: number; y: number };

type PlacementAnchor = {
  point: HexPoint;
  radius: number;
};

type RawScenarioPlayer = {
  faction: "saxony" | "rusviet" | "nordic" | "crimea" | "polania";
  stars: Record<string, number>;
  power: number;
  popularity: number;
  coinsInHand: number;
  controlledHexIds: number[];
  soloControlledHexIds?: number[];
  characterHexId: number;
  mechHexIds: number[];
  workerHexIds: number[];
  structures: Array<{ type: "armory" | "mill" | "monument" | "mine"; hexId: number }>;
};

type RawScoringEntry = {
  faction: RawScenarioPlayer["faction"];
  score: {
    structureBonusCoins: number;
    controlledResourceTokens: number;
  };
  tiebreakers: {
    piecesAndStructures: number;
    power: number;
    popularity: number;
    resourceTokensControlled: number;
    territoriesControlled: number;
    starsPlaced: number;
  };
};

type RawScenario = {
  scenarioId: string;
  structureBonus: string;
  players: RawScenarioPlayer[];
  resourcesByHex: Array<{ hexId: number; resources: Record<string, number> }>;
  scoring: {
    players: RawScoringEntry[];
    winnerFaction: string;
  };
};

export type PieceKind =
  | "worker"
  | "mech"
  | "character"
  | "structure"
  | "resource"
  | "popularity"
  | "strength"
  | "star"
  | "structure_bonus";

export type PiecePlacement = {
  id: string;
  playerId: string;
  kind: PieceKind;
  tokenPath: string;
  x: number;
  y: number;
  boxWidthPercent?: number;
  boxHeightPercent?: number;
  boxRotationDeg?: number;
  tokenScalePercent?: number;
  tokenWidthPercent?: number;
  tokenHeightPercent?: number;
  sizePercent?: number;
  stackCount?: number;
  rotationDeg?: number;
};

export type TemporaryScenarioPlayer = MultiplayerScoringPlayerInput & {
  displayName: string;
  faction: RawScenarioPlayer["faction"];
};

export type TemporaryScenario = {
  id: string;
  playerCount: number;
  boardImagePath: string;
  boardImageWidth: number;
  boardImageHeight: number;
  piecePlacements: PiecePlacement[];
  players: TemporaryScenarioPlayer[];
};

const FACTORY_HEX_ID = 0;

const FACTION_TO_COLOR: Record<RawScenarioPlayer["faction"], "black" | "red" | "blue" | "yellow" | "white"> = {
  saxony: "black",
  rusviet: "red",
  nordic: "blue",
  crimea: "yellow",
  polania: "white",
};

const STRUCTURE_BONUS_PATH: Record<string, string> = {
  farm_or_tundra_structures: "/assets/tokens/structure-bonus/sb_farm_tundra_adj.webp",
  tunnel_with_structures: "/assets/tokens/structure-bonus/sb_on_mine.webp",
  longest_structure_row: "/assets/tokens/structure-bonus/sb_linear_struct.webp",
  tunnel_adjacent: "/assets/tokens/structure-bonus/sb_mine_adj.webp",
  encounter_adjacent: "/assets/tokens/structure-bonus/sb_encounter_adj.webp",
  lake_adjacent: "/assets/tokens/structure-bonus/sb_lake_adj.webp",
};

const RESOURCE_TOKEN_BY_TYPE: Record<string, string> = {
  metal: "/assets/tokens/resources/Ore.webp",
  oil: "/assets/tokens/resources/Oil.webp",
  food: "/assets/tokens/resources/Grain.webp",
  wood: "/assets/tokens/resources/Lumber.webp",
};

function hashString(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function starTokenDimensions(seed: string): { widthPercent: number; heightPercent: number } {
  const hash = hashString(seed);
  const widthPercent = clamp(32 + (hash % 5) * 2, 30, 42);
  const heightPercent = clamp(30 + ((hash >> 3) % 5) * 2, 28, 40);
  return { widthPercent, heightPercent };
}

function resolveStarSlots(
  stars: Record<string, number>,
  starSlots: Array<{
    index: number;
    key?: string;
    rectangle: {
      points: Array<{ x: number; y: number }>;
      center: { x: number; y: number };
      rotationDegrees?: number;
    };
  }>,
): Array<{
  index: number;
  key?: string;
  rectangle: {
    points: Array<{ x: number; y: number }>;
    center: { x: number; y: number };
    rotationDegrees?: number;
  };
}> {
  const byKey = new Map(starSlots.map((slot) => [slot.key, slot]));
  const selected: typeof starSlots = [];

  const addIfPresent = (key: string, count = 1) => {
    const slot = byKey.get(key);
    if (!slot) {
      return;
    }
    for (let i = 0; i < count; i += 1) {
      selected.push(slot);
    }
  };

  if ((stars.upgrades ?? 0) > 0) addIfPresent("upgrades");
  if ((stars.mechs ?? 0) > 0) addIfPresent("mechs");
  if ((stars.structures ?? 0) > 0) addIfPresent("structures");
  if ((stars.recruits ?? 0) > 0) addIfPresent("recruits");
  if ((stars.workers ?? 0) > 0) addIfPresent("workers");
  if ((stars.objective ?? 0) > 0) addIfPresent("objective");

  const combatStars = clamp(stars.combat ?? 0, 0, 2);
  if (combatStars >= 1) addIfPresent("combat_1");
  if (combatStars >= 2) addIfPresent("combat_2");

  if ((stars.popularity ?? 0) > 0) addIfPresent("popularity_18");
  if ((stars.power ?? 0) > 0) addIfPresent("strength_16");

  if (selected.length > 0) {
    return selected;
  }

  const fallbackCount = sumStars(stars);
  const fallback: typeof starSlots = [];
  for (let i = 1; i <= fallbackCount; i += 1) {
    const slot = starSlots.find((candidate) => candidate.index === i)
      ?? starSlots[Math.min(i, starSlots.length - 1)];
    if (slot) {
      fallback.push(slot);
    }
  }

  return fallback;
}

function sumStars(stars: Record<string, number>): number {
  return Object.values(stars).reduce((sum, value) => sum + value, 0);
}

function pointInPolygon(point: HexPoint, polygon: HexPoint[]): boolean {
  let inside = false;

  for (let current = 0, previous = polygon.length - 1; current < polygon.length; previous = current, current += 1) {
    const currentPoint = polygon[current];
    const previousPoint = polygon[previous];
    const intersects =
      currentPoint.y > point.y !== previousPoint.y > point.y
      && point.x < ((previousPoint.x - currentPoint.x) * (point.y - currentPoint.y)) / ((previousPoint.y - currentPoint.y) || Number.EPSILON) + currentPoint.x;

    if (intersects) {
      inside = !inside;
    }
  }

  return inside;
}

function polygonBounds(points: HexPoint[]): { minX: number; maxX: number; minY: number; maxY: number } {
  return {
    minX: Math.min(...points.map((point) => point.x)),
    maxX: Math.max(...points.map((point) => point.x)),
    minY: Math.min(...points.map((point) => point.y)),
    maxY: Math.max(...points.map((point) => point.y)),
  };
}

function polygonBox(points: HexPoint[]): { center: HexPoint; width: number; height: number } {
  const bounds = polygonBounds(points);
  return {
    center: {
      x: (bounds.minX + bounds.maxX) / 2,
      y: (bounds.minY + bounds.maxY) / 2,
    },
    width: bounds.maxX - bounds.minX,
    height: bounds.maxY - bounds.minY,
  };
}

function distance(a: HexPoint, b: HexPoint): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function mulberry32(seed: number): () => number {
  let value = seed;

  return () => {
    value |= 0;
    value = (value + 0x6d2b79f5) | 0;
    let result = Math.imul(value ^ (value >>> 15), 1 | value);
    result = (result + Math.imul(result ^ (result >>> 7), 61 | result)) ^ result;
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}

function samplePointInPolygon(points: HexPoint[], seedKey: string, preferBottom = false): HexPoint {
  if (points.length === 0) {
    return { x: 0.5, y: 0.5 };
  }

  const rng = mulberry32(hashString(seedKey));
  const bounds = polygonBounds(points);

  for (let attempt = 0; attempt < 80; attempt += 1) {
    const x = bounds.minX + rng() * (bounds.maxX - bounds.minX);
    const bottomBias = 0.72 + rng() * 0.26;
    const neutralBias = 0.14 + rng() * 0.76;
    const blend = preferBottom ? Math.max(0, 1 - attempt / 120) : 0;
    const yBias = blend > 0 ? bottomBias * blend + neutralBias * (1 - blend) : neutralBias;
    const y = bounds.minY + ((bounds.maxY - bounds.minY) * yBias);
    const candidate = {
      x: Math.max(0, Math.min(1, x)),
      y: Math.max(0, Math.min(1, y)),
    };

    if (pointInPolygon(candidate, points)) {
      return candidate;
    }
  }

  const center = points.reduce(
    (acc, point) => ({ x: acc.x + point.x, y: acc.y + point.y }),
    { x: 0, y: 0 },
  );
  return {
    x: center.x / points.length,
    y: center.y / points.length,
  };
}

function samplePointInPolygonAvoiding(
  points: HexPoint[],
  seedKey: string,
  occupied: PlacementAnchor[],
  radius: number,
  preferBottom = false,
  edgeInsetFactor = 0.9,
  minVerticalBias = 0,
  maxVerticalBias = 1,
): HexPoint {
  if (points.length === 0) {
    return { x: 0.5, y: 0.5 };
  }

  const rng = mulberry32(hashString(seedKey));
  const bounds = polygonBounds(points);
  const boundsWidth = bounds.maxX - bounds.minX;
  const boundsHeight = bounds.maxY - bounds.minY;
  const marginX = Math.min(radius * edgeInsetFactor, boundsWidth * 0.45);
  const marginY = Math.min(radius * edgeInsetFactor, boundsHeight * 0.45);
  let bestCandidate: HexPoint | null = null;
  let bestScore = -Infinity;

  for (let attempt = 0; attempt < 160; attempt += 1) {
    const x = bounds.minX + rng() * (bounds.maxX - bounds.minX);
    const bottomBias = 0.72 + rng() * 0.26;
    const neutralBias = 0.14 + rng() * 0.76;
    const blend = preferBottom ? Math.max(0, 1 - attempt / 220) : 0;
    const rawYBias = blend > 0 ? bottomBias * blend + neutralBias * (1 - blend) : neutralBias;
    const yBias = clamp(rawYBias, minVerticalBias, maxVerticalBias);
    const y = bounds.minY + ((bounds.maxY - bounds.minY) * yBias);
    const candidate = {
      x: Math.max(0, Math.min(1, x)),
      y: Math.max(0, Math.min(1, y)),
    };

    if (!pointInPolygon(candidate, points)) {
      continue;
    }

    const insideInsetBounds =
      candidate.x >= bounds.minX + marginX
      && candidate.x <= bounds.maxX - marginX
      && candidate.y >= bounds.minY + marginY
      && candidate.y <= bounds.maxY - marginY;
    if (!insideInsetBounds) {
      continue;
    }

    const minDistance = occupied.reduce((best, item) => {
      const separation = distance(candidate, item.point) - (radius + item.radius);
      return Math.min(best, separation);
    }, Number.POSITIVE_INFINITY);

    const score = Number.isFinite(minDistance) ? minDistance : 0;
    if (score > bestScore) {
      bestScore = score;
      bestCandidate = candidate;
      if (score >= 0.0025) {
        break;
      }
    }
  }

  if (bestCandidate) {
    return bestCandidate;
  }

  return samplePointInPolygon(points, `${seedKey}-fallback`, preferBottom);
}

function boxFromPoints(points: HexPoint[]): { center: HexPoint; widthPercent: number; heightPercent: number } {
  const box = polygonBox(points);
  return {
    center: box.center,
    widthPercent: box.width,
    heightPercent: box.height,
  };
}

function boxOccupancyRadius(widthPercent: number, heightPercent: number): number {
  return Math.max(0.004, Math.min(widthPercent, heightPercent) * 0.35);
}

function countByHex(hexIds: number[]): Array<{ hexId: number; count: number }> {
  const counts = new Map<number, number>();
  for (const hexId of hexIds) {
    counts.set(hexId, (counts.get(hexId) ?? 0) + 1);
  }
  return Array.from(counts.entries()).map(([hexId, count]) => ({ hexId, count }));
}

function controlledHexIdsForPlayer(rawPlayer: RawScenarioPlayer, playerCount: number): number[] {
  if (playerCount === 1 && rawPlayer.soloControlledHexIds && rawPlayer.soloControlledHexIds.length > 0) {
    return rawPlayer.soloControlledHexIds;
  }

  return rawPlayer.controlledHexIds;
}

function toPlayerInput(rawPlayer: RawScenarioPlayer, scoring: RawScoringEntry, index: number): TemporaryScenarioPlayer {
  const stars = sumStars(rawPlayer.stars);
  return {
    playerId: `p${index + 1}`,
    displayName: `${rawPlayer.faction} (${index + 1})`,
    faction: rawPlayer.faction,
    stars,
    territories: rawPlayer.controlledHexIds.length,
    resources: scoring.score.controlledResourceTokens,
    coins: rawPlayer.coinsInHand,
    popularity: rawPlayer.popularity,
    structureBonusCoins: scoring.score.structureBonusCoins,
    factoryControlled: rawPlayer.controlledHexIds.includes(FACTORY_HEX_ID),
    tiebreaker: {
      unitsAndStructures: scoring.tiebreakers.piecesAndStructures,
      power: scoring.tiebreakers.power,
      popularity: scoring.tiebreakers.popularity,
      resources: scoring.tiebreakers.resourceTokensControlled,
      territories: scoring.tiebreakers.territoriesControlled,
      stars: scoring.tiebreakers.starsPlaced,
    },
  };
}

function sortPlayersForTeaching(players: TemporaryScenarioPlayer[]): TemporaryScenarioPlayer[] {
  return [...players].sort((a, b) => {
    if (b.stars !== a.stars) return b.stars - a.stars;
    if (b.coins !== a.coins) return b.coins - a.coins;
    return b.popularity - a.popularity;
  });
}

function filterBySubtype(scenarios: TemporaryScenario[], subtypeId?: string): TemporaryScenario[] {
  if (!subtypeId) return scenarios;
  return scenarios.filter((scenario) => {
    switch (subtypeId) {
      case "popularity_tiers":
        return scenario.players.some((p) => p.popularity <= 6 || (p.popularity >= 7 && p.popularity <= 12) || p.popularity >= 13);
      case "stars_scoring":
        return scenario.players.some((p) => p.stars > 0);
      case "territories_scoring":
        return scenario.players.some((p) => p.territories > 0 || p.factoryControlled);
      case "resources_scoring":
        return scenario.players.some((p) => p.resources > 0);
      case "structure_bonus_farm_or_tundra":
        return scenario.id.includes("farm_or_tundra_structures");
      case "structure_bonus_tunnel_with_structures":
        return scenario.id.includes("tunnel_with_structures");
      case "structure_bonus_longest_structure_row":
        return scenario.id.includes("longest_structure_row");
      case "structure_bonus_tunnel_adjacent":
        return scenario.id.includes("tunnel_adjacent");
      case "structure_bonus_encounter_adjacent":
        return scenario.id.includes("encounter_adjacent");
      case "structure_bonus_lake_adjacent":
        return scenario.id.includes("lake_adjacent");
      case "structure_bonus_scoring":
        return scenario.players.some((p) => (p.structureBonusCoins ?? 0) > 0);
      case "total_scoring":
        return scenario.players.some((p) => p.stars > 0 && p.territories > 0 && p.resources > 0);
      case "winner_tiebreakers":
        return scenario.playerCount >= 2;
      default:
        return true;
    }
  });
}

function preferMidStarScenarios(scenarios: TemporaryScenario[], subtypeId?: string): TemporaryScenario[] {
  if (!subtypeId) {
    return scenarios;
  }

  const needsRicherBoards = new Set([
    "territories_scoring",
    "resources_scoring",
    "structure_bonus_farm_or_tundra",
    "structure_bonus_tunnel_with_structures",
    "structure_bonus_longest_structure_row",
    "structure_bonus_tunnel_adjacent",
    "structure_bonus_encounter_adjacent",
    "structure_bonus_lake_adjacent",
    "total_scoring",
  ]);

  if (!needsRicherBoards.has(subtypeId)) {
    return scenarios;
  }

  const preferred = scenarios.filter((scenario) => {
    if (scenario.playerCount !== 1) {
      return false;
    }

    const focusPlayer = scenario.players[0];
    return Boolean(focusPlayer && focusPlayer.stars >= 4 && focusPlayer.stars <= 6);
  });

  return preferred.length > 0 ? preferred : scenarios;
}

function tokenPathForFactionPiece(
  faction: RawScenarioPlayer["faction"],
  kind: "worker" | "mech" | "character" | "popularity" | "strength" | "star" | "structure",
  structureType?: "armory" | "mill" | "monument" | "mine",
): string {
  const color = FACTION_TO_COLOR[faction];
  if (kind === "structure") {
    const suffix = structureType ?? "mine";
    return `/assets/tokens/factions/${color}/${color}_${suffix}.webp`;
  }

  const suffixByKind = {
    worker: "worker",
    mech: "mech",
    character: "player",
    popularity: "popularity",
    strength: "strength",
    star: "star",
  } as const;

  return `/assets/tokens/factions/${color}/${color}_${suffixByKind[kind]}.webp`;
}

export const getScenarioBank = cache(async (): Promise<TemporaryScenario[]> => {
  const board = await loadScytheBoardData();
  const rawScenarios = (scenariosData as unknown as { scenarios: RawScenario[] }).scenarios;

  const hexBoxes = new Map<number, { center: HexPoint; widthPercent: number; heightPercent: number }>();
  const hexPoints = new Map<number, HexPoint[]>();
  for (const hex of board.hexes) {
    hexBoxes.set(hex.id, boxFromPoints(hex.points));
    hexPoints.set(hex.id, hex.points);
  }

  const popularitySlots = board.boardMarkers?.popularityTrack?.slots ?? [];
  const strengthSlots = board.boardMarkers?.strengthTrack?.slots ?? [];
  const starSlots = board.boardMarkers?.starTrack?.slots ?? [];

  const scenarios: TemporaryScenario[] = [];

  for (const raw of rawScenarios) {
    const playersWithScoring = raw.players
      .map((player, index) => {
        const score = raw.scoring.players.find((entry) => entry.faction === player.faction);
        if (!score) {
          throw new Error(`Missing scoring entry for ${player.faction} in ${raw.scenarioId}`);
        }
        return {
          rawPlayer: player,
          converted: toPlayerInput(player, score, index),
        };
      });

    const sorted = sortPlayersForTeaching(playersWithScoring.map((entry) => entry.converted));

    for (let playerCount = 1; playerCount <= Math.min(5, sorted.length); playerCount += 1) {
      const rawPlayersByFaction = new Map(playersWithScoring.map((entry) => [entry.rawPlayer.faction, entry.rawPlayer] as const));
      const selectionGroups = playerCount === 1
        ? sorted.map((candidate) => [candidate])
        : [sorted.slice(0, playerCount)];

      for (const selectedGroup of selectionGroups) {
        const selectedPlayers = selectedGroup.map((player, index) => {
          const rawPlayer = rawPlayersByFaction.get(player.faction);
          const controlledHexIds = rawPlayer ? controlledHexIdsForPlayer(rawPlayer, playerCount) : [];

          return {
            ...player,
            playerId: `p${index + 1}`,
            displayName: `${player.faction} (${index + 1})`,
            territories: controlledHexIds.length,
            factoryControlled: controlledHexIds.includes(FACTORY_HEX_ID),
          };
        });

        const selectedFactions = new Set(selectedPlayers.map((p) => p.faction));
        const selectedRawPlayers = playersWithScoring
          .filter((entry) => selectedFactions.has(entry.converted.faction))
          .map((entry) => entry.rawPlayer);

        const starSlotsByFaction = new Map<RawScenarioPlayer["faction"], ReturnType<typeof resolveStarSlots>>();
        const starSlotDemand = new Map<number, number>();
        selectedRawPlayers.forEach((rawPlayer) => {
          const slotsForPlayer = resolveStarSlots(rawPlayer.stars, starSlots);
          starSlotsByFaction.set(rawPlayer.faction, slotsForPlayer);
          slotsForPlayer.forEach((slot) => {
            starSlotDemand.set(slot.index, (starSlotDemand.get(slot.index) ?? 0) + 1);
          });
        });

        const placements: PiecePlacement[] = [];
        const occupied: PlacementAnchor[] = [];
        const starAnchors: PlacementAnchor[] = [];
        const starAnchorsBySlot = new Map<number, PlacementAnchor[]>();

        const structureBonusMarker = board.boardMarkers?.structureBonus;
        if (structureBonusMarker) {
          const structureBonusBox = boxFromPoints(structureBonusMarker.points);
          placements.push({
            id: `${raw.scenarioId}-${playerCount}-sb`,
            playerId: "board",
            kind: "structure_bonus",
            tokenPath: STRUCTURE_BONUS_PATH[raw.structureBonus] ?? "/assets/tokens/structure-bonus/sb_mine_adj.webp",
            x: structureBonusBox.center.x,
            y: structureBonusBox.center.y,
            boxWidthPercent: structureBonusBox.widthPercent,
            boxHeightPercent: structureBonusBox.heightPercent,
            boxRotationDeg: structureBonusMarker.rotationDegrees ?? 0,
          });
          occupied.push({
            point: structureBonusBox.center,
            radius: boxOccupancyRadius(structureBonusBox.widthPercent, structureBonusBox.heightPercent),
          });
        }

        selectedRawPlayers.forEach((rawPlayer) => {
        const normalizedPlayer = selectedPlayers.find((p) => p.faction === rawPlayer.faction);
        if (!normalizedPlayer) return;

        const workerStacks = countByHex(rawPlayer.workerHexIds);
        for (const stack of workerStacks) {
          const points = hexPoints.get(stack.hexId);
          const box = hexBoxes.get(stack.hexId);
          if (!box || !points) continue;
          for (let workerIndex = 0; workerIndex < stack.count; workerIndex += 1) {
            const point = samplePointInPolygonAvoiding(
              points,
              `${raw.scenarioId}-${normalizedPlayer.playerId}-worker-${stack.hexId}-${workerIndex + 1}`,
              occupied,
              boxOccupancyRadius(box.widthPercent, box.heightPercent),
            );
            placements.push({
              id: `${raw.scenarioId}-${normalizedPlayer.playerId}-worker-${stack.hexId}-${workerIndex + 1}`,
              playerId: normalizedPlayer.playerId,
              kind: "worker",
              tokenPath: tokenPathForFactionPiece(rawPlayer.faction, "worker"),
              x: point.x,
              y: point.y,
              boxWidthPercent: box.widthPercent,
              boxHeightPercent: box.heightPercent,
            });
            occupied.push({ point, radius: boxOccupancyRadius(box.widthPercent, box.heightPercent) });
          }
        }

        const mechStacks = countByHex(rawPlayer.mechHexIds);
        for (const stack of mechStacks) {
          const points = hexPoints.get(stack.hexId);
          const box = hexBoxes.get(stack.hexId);
          if (!box || !points) continue;
          const point = samplePointInPolygonAvoiding(
            points,
            `${raw.scenarioId}-${normalizedPlayer.playerId}-mech-${stack.hexId}`,
            occupied,
            boxOccupancyRadius(box.widthPercent, box.heightPercent),
          );
          placements.push({
            id: `${raw.scenarioId}-${normalizedPlayer.playerId}-mech-${stack.hexId}`,
            playerId: normalizedPlayer.playerId,
            kind: "mech",
            tokenPath: tokenPathForFactionPiece(rawPlayer.faction, "mech"),
            x: point.x,
            y: point.y,
            stackCount: stack.count,
            boxWidthPercent: box.widthPercent,
            boxHeightPercent: box.heightPercent,
          });
          occupied.push({ point, radius: boxOccupancyRadius(box.widthPercent, box.heightPercent) });
        }

        const characterPoints = hexPoints.get(rawPlayer.characterHexId);
        const characterBox = hexBoxes.get(rawPlayer.characterHexId);
        if (characterBox && characterPoints) {
          const point = samplePointInPolygonAvoiding(
            characterPoints,
            `${raw.scenarioId}-${normalizedPlayer.playerId}-character`,
            occupied,
            boxOccupancyRadius(characterBox.widthPercent, characterBox.heightPercent),
          );
          placements.push({
            id: `${raw.scenarioId}-${normalizedPlayer.playerId}-character`,
            playerId: normalizedPlayer.playerId,
            kind: "character",
            tokenPath: tokenPathForFactionPiece(rawPlayer.faction, "character"),
            x: point.x,
            y: point.y,
            boxWidthPercent: characterBox.widthPercent,
            boxHeightPercent: characterBox.heightPercent,
          });
          occupied.push({ point, radius: boxOccupancyRadius(characterBox.widthPercent, characterBox.heightPercent) });
        }

        rawPlayer.structures.forEach((structure) => {
          const points = hexPoints.get(structure.hexId);
          const box = hexBoxes.get(structure.hexId);
          if (!box || !points) return;
          const point = samplePointInPolygonAvoiding(
            points,
            `${raw.scenarioId}-${normalizedPlayer.playerId}-structure-${structure.hexId}-${structure.type}`,
            occupied,
            boxOccupancyRadius(box.widthPercent, box.heightPercent),
          );
          placements.push({
            id: `${raw.scenarioId}-${normalizedPlayer.playerId}-structure-${structure.hexId}-${structure.type}`,
            playerId: normalizedPlayer.playerId,
            kind: "structure",
            tokenPath: tokenPathForFactionPiece(rawPlayer.faction, "structure", structure.type),
            x: point.x,
            y: point.y,
            boxWidthPercent: box.widthPercent,
            boxHeightPercent: box.heightPercent,
          });
          occupied.push({ point, radius: boxOccupancyRadius(box.widthPercent, box.heightPercent) });
        });

        const popSlot = popularitySlots.find((slot) => slot.index === rawPlayer.popularity)
          ?? popularitySlots[Math.min(rawPlayer.popularity, popularitySlots.length - 1)];
        if (popSlot) {
          const popBox = boxFromPoints(popSlot.rectangle.points);
          const point = samplePointInPolygonAvoiding(
            popSlot.rectangle.points,
            `${raw.scenarioId}-${normalizedPlayer.playerId}-popularity`,
            occupied,
            boxOccupancyRadius(popBox.widthPercent, popBox.heightPercent),
          );
          placements.push({
            id: `${raw.scenarioId}-${normalizedPlayer.playerId}-popularity`,
            playerId: normalizedPlayer.playerId,
            kind: "popularity",
            tokenPath: tokenPathForFactionPiece(rawPlayer.faction, "popularity"),
            x: point.x,
            y: point.y,
            boxWidthPercent: popBox.widthPercent,
            boxHeightPercent: popBox.heightPercent,
            boxRotationDeg: popSlot.rectangle.rotationDegrees ?? 0,
          });
          occupied.push({ point, radius: boxOccupancyRadius(popBox.widthPercent, popBox.heightPercent) });
        }

        const powerValue = rawPlayer.power;
        const strengthSlot = strengthSlots.find((slot) => slot.index === powerValue)
          ?? strengthSlots[Math.min(powerValue, strengthSlots.length - 1)];
        if (strengthSlot) {
          const strengthBox = boxFromPoints(strengthSlot.rectangle.points);
          const point = samplePointInPolygonAvoiding(
            strengthSlot.rectangle.points,
            `${raw.scenarioId}-${normalizedPlayer.playerId}-strength`,
            occupied,
            boxOccupancyRadius(strengthBox.widthPercent, strengthBox.heightPercent),
          );
          placements.push({
            id: `${raw.scenarioId}-${normalizedPlayer.playerId}-power`,
            playerId: normalizedPlayer.playerId,
            kind: "strength",
            tokenPath: tokenPathForFactionPiece(rawPlayer.faction, "strength"),
            x: point.x,
            y: point.y,
            boxWidthPercent: strengthBox.widthPercent,
            boxHeightPercent: strengthBox.heightPercent,
            boxRotationDeg: strengthSlot.rectangle.rotationDegrees ?? 0,
          });
          occupied.push({ point, radius: boxOccupancyRadius(strengthBox.widthPercent, strengthBox.heightPercent) });
        }

        const starPlacementSlots = starSlotsByFaction.get(rawPlayer.faction)
          ?? resolveStarSlots(rawPlayer.stars, starSlots);
        for (let starIndex = 0; starIndex < starPlacementSlots.length; starIndex += 1) {
          const starSlot = starPlacementSlots[starIndex];
          if (!starSlot) {
            continue;
          }

          const starBox = boxFromPoints(starSlot.rectangle.points);
          const baseStarRadius = boxOccupancyRadius(starBox.widthPercent, starBox.heightPercent);
          const starOnlyGapRadius = baseStarRadius * 1.35;
          const perSlotAnchors = starAnchorsBySlot.get(starSlot.index) ?? [];
          const slotDemand = starSlotDemand.get(starSlot.index) ?? 1;
          const point = slotDemand <= 1
            ? samplePointInPolygonAvoiding(
              starSlot.rectangle.points,
              `${raw.scenarioId}-${normalizedPlayer.playerId}-stars-${starIndex + 1}-solo`,
              occupied.concat(starAnchors, perSlotAnchors),
              starOnlyGapRadius,
              true,
              0.25,
              0.58,
              0.95,
            )
            : samplePointInPolygonAvoiding(
              starSlot.rectangle.points,
              `${raw.scenarioId}-${normalizedPlayer.playerId}-stars-${starIndex + 1}`,
              occupied.concat(starAnchors, perSlotAnchors),
              starOnlyGapRadius,
              true,
              0.25,
            );
          placements.push({
            id: `${raw.scenarioId}-${normalizedPlayer.playerId}-stars-${starIndex + 1}`,
            playerId: normalizedPlayer.playerId,
            kind: "star",
            tokenPath: tokenPathForFactionPiece(rawPlayer.faction, "star"),
            x: point.x,
            y: point.y,
            boxWidthPercent: starBox.widthPercent,
            boxHeightPercent: starBox.heightPercent,
            ...starTokenDimensions(`${raw.scenarioId}-${normalizedPlayer.playerId}-stars-${starIndex + 1}`),
            boxRotationDeg: starSlot.rectangle.rotationDegrees ?? 0,
          });
          starAnchors.push({ point, radius: starOnlyGapRadius });
          perSlotAnchors.push({ point, radius: starOnlyGapRadius * 1.2 });
          starAnchorsBySlot.set(starSlot.index, perSlotAnchors);
          occupied.push({ point, radius: baseStarRadius });
        }
        });

        raw.resourcesByHex.forEach((entry, entryIndex) => {
        const points = hexPoints.get(entry.hexId);
        const box = hexBoxes.get(entry.hexId);
        if (!box || !points) return;

        Object.entries(entry.resources).forEach(([resourceType, count]) => {
          const tokenPath = RESOURCE_TOKEN_BY_TYPE[resourceType];
          if (!tokenPath || count <= 0) return;
          for (let resourceIndex = 0; resourceIndex < count; resourceIndex += 1) {
            const point = samplePointInPolygonAvoiding(
              points,
              `${raw.scenarioId}-resource-${entry.hexId}-${resourceType}-${entryIndex}-${resourceIndex + 1}`,
              occupied,
              boxOccupancyRadius(box.widthPercent, box.heightPercent),
            );
            placements.push({
              id: `${raw.scenarioId}-${playerCount}-resource-${entry.hexId}-${resourceType}-${entryIndex}-${resourceIndex + 1}`,
              playerId: "board",
              kind: "resource",
              tokenPath,
              x: point.x,
              y: point.y,
              boxWidthPercent: box.widthPercent,
              boxHeightPercent: box.heightPercent,
            });

            occupied.push({ point, radius: boxOccupancyRadius(box.widthPercent, box.heightPercent) });
          }
        });
        });

        const focusKey = selectedPlayers.map((player) => player.faction).join("-");
        scenarios.push({
          id: `scythe-${raw.scenarioId}-${playerCount}p-${focusKey}`,
          playerCount,
          boardImagePath: `/assets/boards/${board.image.name}`,
          boardImageWidth: board.image.width,
          boardImageHeight: board.image.height,
          piecePlacements: placements,
          players: selectedPlayers,
        });
      }
    }
  }

  return scenarios;
});

export async function getTemporaryScenarioById(id: string): Promise<TemporaryScenario | null> {
  const bank = await getScenarioBank();
  return bank.find((scenario) => scenario.id === id) ?? null;
}

export async function getTemporaryScenarioForPlayerCount(
  userId: string,
  playerCount: number,
  subtypeId?: string,
): Promise<TemporaryScenario> {
  const bank = await getScenarioBank();
  const byCount = bank.filter((scenario) => scenario.playerCount === playerCount);
  const filtered = filterBySubtype(byCount, subtypeId);
  const sourceBase = filtered.length > 0 ? filtered : byCount;
  const source = preferMidStarScenarios(sourceBase, subtypeId);

  if (source.length === 0) {
    throw new Error(`No scenarios found for ${playerCount} players`);
  }

  const index = hashString(`${userId}-${Date.now()}`) % source.length;
  return source[index];
}
