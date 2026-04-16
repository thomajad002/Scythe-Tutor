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
  const widthPercent = clamp(52 + (hash % 5) * 2, 50, 62);
  const heightPercent = clamp(50 + ((hash >> 3) % 5) * 2, 48, 60);
  return { widthPercent, heightPercent };
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
    const yBias = preferBottom ? 0.62 + rng() * 0.34 : 0.15 + rng() * 0.7;
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
): HexPoint {
  if (points.length === 0) {
    return { x: 0.5, y: 0.5 };
  }

  const rng = mulberry32(hashString(seedKey));
  const bounds = polygonBounds(points);
  let bestCandidate: HexPoint | null = null;
  let bestScore = -Infinity;

  for (let attempt = 0; attempt < 160; attempt += 1) {
    const x = bounds.minX + rng() * (bounds.maxX - bounds.minX);
    const yBias = preferBottom ? 0.62 + rng() * 0.34 : 0.18 + rng() * 0.64;
    const y = bounds.minY + ((bounds.maxY - bounds.minY) * yBias);
    const candidate = {
      x: Math.max(0, Math.min(1, x)),
      y: Math.max(0, Math.min(1, y)),
    };

    if (!pointInPolygon(candidate, points)) {
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
      const selectedPlayers = sorted.slice(0, playerCount).map((player, index) => ({
        ...player,
        playerId: `p${index + 1}`,
        displayName: `${player.faction} (${index + 1})`,
      }));

      const selectedFactions = new Set(selectedPlayers.map((p) => p.faction));
      const selectedRawPlayers = playersWithScoring
        .filter((entry) => selectedFactions.has(entry.converted.faction))
        .map((entry) => entry.rawPlayer);

      const placements: PiecePlacement[] = [];
      const occupied: PlacementAnchor[] = [];

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
          const point = samplePointInPolygonAvoiding(
            points,
            `${raw.scenarioId}-${normalizedPlayer.playerId}-worker-${stack.hexId}`,
            occupied,
            boxOccupancyRadius(box.widthPercent, box.heightPercent),
          );
          placements.push({
            id: `${raw.scenarioId}-${normalizedPlayer.playerId}-worker-${stack.hexId}`,
            playerId: normalizedPlayer.playerId,
            kind: "worker",
            tokenPath: tokenPathForFactionPiece(rawPlayer.faction, "worker"),
            x: point.x,
            y: point.y,
            stackCount: stack.count,
            boxWidthPercent: box.widthPercent,
            boxHeightPercent: box.heightPercent,
          });
          occupied.push({ point, radius: boxOccupancyRadius(box.widthPercent, box.heightPercent) });
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

        const starValue = sumStars(rawPlayer.stars);
        for (let starIndex = 1; starIndex <= starValue; starIndex += 1) {
          const starSlot = starSlots.find((slot) => slot.index === starIndex)
            ?? starSlots[Math.min(starIndex, starSlots.length - 1)];
          if (!starSlot) {
            continue;
          }

          const starBox = boxFromPoints(starSlot.rectangle.points);
          const point = samplePointInPolygonAvoiding(
            starSlot.rectangle.points,
            `${raw.scenarioId}-${normalizedPlayer.playerId}-stars-${starIndex}`,
            occupied,
            boxOccupancyRadius(starBox.widthPercent, starBox.heightPercent),
            true,
          );
          placements.push({
            id: `${raw.scenarioId}-${normalizedPlayer.playerId}-stars-${starIndex}`,
            playerId: normalizedPlayer.playerId,
            kind: "star",
            tokenPath: tokenPathForFactionPiece(rawPlayer.faction, "star"),
            x: point.x,
            y: point.y,
            boxWidthPercent: starBox.widthPercent,
            boxHeightPercent: starBox.heightPercent,
            ...starTokenDimensions(`${raw.scenarioId}-${normalizedPlayer.playerId}-stars-${starIndex}`),
            boxRotationDeg: starSlot.rectangle.rotationDegrees ?? 0,
          });
          occupied.push({ point, radius: boxOccupancyRadius(starBox.widthPercent, starBox.heightPercent) });
        }
      });

      raw.resourcesByHex.forEach((entry, entryIndex) => {
        const points = hexPoints.get(entry.hexId);
        const box = hexBoxes.get(entry.hexId);
        if (!box || !points) return;

        let lane = 0;
        Object.entries(entry.resources).forEach(([resourceType, count]) => {
          const tokenPath = RESOURCE_TOKEN_BY_TYPE[resourceType];
          if (!tokenPath || count <= 0) return;
          const point = samplePointInPolygonAvoiding(
            points,
            `${raw.scenarioId}-resource-${entry.hexId}-${resourceType}-${entryIndex}-${lane}`,
            occupied,
            boxOccupancyRadius(box.widthPercent, box.heightPercent),
          );
          placements.push({
            id: `${raw.scenarioId}-${playerCount}-resource-${entry.hexId}-${resourceType}-${entryIndex}`,
            playerId: "board",
            kind: "resource",
            tokenPath,
            x: point.x,
            y: point.y,
            stackCount: count,
            boxWidthPercent: box.widthPercent,
            boxHeightPercent: box.heightPercent,
          });

          occupied.push({ point, radius: boxOccupancyRadius(box.widthPercent, box.heightPercent) });

          lane += 1;
        });
      });

      scenarios.push({
        id: `scythe-${raw.scenarioId}-${playerCount}p`,
        playerCount,
        boardImagePath: `/assets/boards/${board.image.name}`,
        boardImageWidth: board.image.width,
        boardImageHeight: board.image.height,
        piecePlacements: placements,
        players: selectedPlayers,
      });
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
  const source = filtered.length > 0 ? filtered : byCount;

  if (source.length === 0) {
    throw new Error(`No scenarios found for ${playerCount} players`);
  }

  const index = hashString(`${userId}-${Date.now()}`) % source.length;
  return source[index];
}
