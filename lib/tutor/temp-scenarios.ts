import { cache } from "react";
import { loadScytheBoardData } from "@/lib/scythe/board-data";
import type { MultiplayerScoringPlayerInput } from "@/lib/scythe/scoring";

type TemporaryLocations = {
  unitHexes: number[];
  structureHexes: number[];
};

type HexPoint = { x: number; y: number };

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
  stackCount?: number;
  rotationDeg?: number;
};

export type TemporaryScenarioPlayer = MultiplayerScoringPlayerInput & {
  displayName: string;
  temporaryLocations: TemporaryLocations;
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

const FACTIONS = ["black", "red", "blue", "white", "yellow"] as const;
const RESOURCE_TOKEN_PATHS = [
  "/assets/tokens/resources/Ore.webp",
  "/assets/tokens/resources/Oil.webp",
  "/assets/tokens/resources/Grain.webp",
  "/assets/tokens/resources/Lumber.webp",
] as const;
const STRUCTURE_BONUS_TILE_PATHS = [
  "/assets/tokens/structure-bonus/sb_farm_tundra_adj.webp",
  "/assets/tokens/structure-bonus/sb_on_mine.webp",
  "/assets/tokens/structure-bonus/sb_linear_struct.webp",
  "/assets/tokens/structure-bonus/sb_mine_adj.webp",
  "/assets/tokens/structure-bonus/sb_encounter_adj.webp",
  "/assets/tokens/structure-bonus/sb_lake_adj.webp",
] as const;

const FALLBACK_STRUCTURE_BONUS_TILE_ANCHOR = { x: 0.09471221705289191, y: 0.8245448148586452 };
type TrackSlot = {
  index: number;
  points: HexPoint[];
  center: HexPoint;
  rotationDeg: number;
};

type TrackSlots = {
  popularity: TrackSlot[];
  strength: TrackSlot[];
  star: TrackSlot[];
};

function getHexCenter(hexPoints: HexPoint[]): HexPoint | null {
  if (hexPoints.length === 0) {
    return null;
  }

  const totals = hexPoints.reduce(
    (acc, point) => ({ x: acc.x + point.x, y: acc.y + point.y }),
    { x: 0, y: 0 },
  );

  return {
    x: totals.x / hexPoints.length,
    y: totals.y / hexPoints.length,
  };
}

function tokenPathForPiece(faction: string, kind: PieceKind): string {
  switch (kind) {
    case "worker":
      return `/assets/tokens/factions/${faction}/${faction}_worker.webp`;
    case "mech":
      return `/assets/tokens/factions/${faction}/${faction}_mech.webp`;
    case "character":
      return `/assets/tokens/factions/${faction}/${faction}_player.webp`;
    case "structure":
      return `/assets/tokens/factions/${faction}/${faction}_mine.webp`;
    case "popularity":
      return `/assets/tokens/factions/${faction}/${faction}_popularity.webp`;
    case "strength":
      return `/assets/tokens/factions/${faction}/${faction}_strength.webp`;
    case "star":
      return `/assets/tokens/factions/${faction}/${faction}_star.webp`;
    default:
      return `/assets/tokens/factions/${faction}/${faction}_worker.webp`;
  }
}

function pointInPolygon(point: HexPoint, polygon: HexPoint[]): boolean {
  let inside = false;

  for (let index = 0, prev = polygon.length - 1; index < polygon.length; prev = index, index += 1) {
    const xi = polygon[index].x;
    const yi = polygon[index].y;
    const xj = polygon[prev].x;
    const yj = polygon[prev].y;

    const intersects =
      yi > point.y !== yj > point.y
      && point.x < ((xj - xi) * (point.y - yi)) / ((yj - yi) || Number.EPSILON) + xi;

    if (intersects) {
      inside = !inside;
    }
  }

  return inside;
}

function distance(a: HexPoint, b: HexPoint): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function samplePointInHex(rand: () => number, hexPoints: HexPoint[], centerBias = 0): HexPoint {
  const center = getHexCenter(hexPoints) ?? { x: 0.5, y: 0.5 };

  const minX = Math.min(...hexPoints.map((point) => point.x));
  const maxX = Math.max(...hexPoints.map((point) => point.x));
  const minY = Math.min(...hexPoints.map((point) => point.y));
  const maxY = Math.max(...hexPoints.map((point) => point.y));

  for (let attempt = 0; attempt < 80; attempt += 1) {
    const raw = {
      x: minX + rand() * (maxX - minX),
      y: minY + rand() * (maxY - minY),
    };

    const pull = centerBias > 0 ? centerBias * (0.3 + rand() * 0.7) : 0;
    const candidate = {
      x: lerp(raw.x, center.x, pull),
      y: lerp(raw.y, center.y, pull),
    };

    if (pointInPolygon(candidate, hexPoints)) {
      return candidate;
    }
  }

  return center;
}

function samplePackedPointsInHex(
  rand: () => number,
  hexPoints: HexPoint[],
  count: number,
  preferredMinDistance: number,
  centerBias: number,
): HexPoint[] {
  const placed: HexPoint[] = [];
  let minDistance = preferredMinDistance;

  for (let itemIndex = 0; itemIndex < count; itemIndex += 1) {
    let candidate: HexPoint | null = null;

    for (let relax = 0; relax < 4 && !candidate; relax += 1) {
      for (let attempt = 0; attempt < 60; attempt += 1) {
        const next = samplePointInHex(rand, hexPoints, centerBias);
        const collides = placed.some((existing) => distance(existing, next) < minDistance);
        if (!collides) {
          candidate = next;
          break;
        }
      }
      minDistance *= 0.82;
    }

    placed.push(candidate ?? samplePointInHex(rand, hexPoints, centerBias));
  }

  return placed;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function lerp(start: number, end: number, ratio: number): number {
  return start + (end - start) * ratio;
}

function distributeCount(total: number, buckets: number, rand: () => number): number[] {
  if (buckets <= 0) {
    return [];
  }

  const result = Array.from({ length: buckets }, () => 0);
  for (let index = 0; index < total; index += 1) {
    const bucket = randomInt(rand, 0, buckets - 1);
    result[bucket] += 1;
  }

  return result;
}

function uniqueHexIds(hexIds: number[]): number[] {
  return Array.from(new Set(hexIds));
}

function buildTrackSlots(trackData?: {
  slots: Array<{
    index: number;
    rectangle: {
      points: HexPoint[];
      center: HexPoint;
      rotationDegrees?: number;
    };
  }>;
}): TrackSlot[] {
  if (!trackData?.slots?.length) {
    return [];
  }

  return trackData.slots
    .map((slot) => ({
      index: slot.index,
      points: slot.rectangle.points,
      center: slot.rectangle.center,
      rotationDeg: slot.rectangle.rotationDegrees ?? 0,
    }))
    .sort((a, b) => a.index - b.index);
}

function getTrackSlotByValue(slots: TrackSlot[], value: number): TrackSlot | null {
  if (slots.length === 0) {
    return null;
  }

  const byIndex = new Map(slots.map((slot) => [slot.index, slot]));
  const clampedValue = Math.max(0, Math.floor(value));
  return byIndex.get(clampedValue) ?? slots[Math.min(clampedValue, slots.length - 1)] ?? slots[0];
}

function makeDeterministicRand(key: string): () => number {
  return mulberry32(hashString(key));
}

function samplePointInSlot(
  rand: () => number,
  slot: TrackSlot,
  preferBottom: boolean,
): HexPoint {
  if (slot.points.length === 0) {
    return slot.center;
  }

  const minX = Math.min(...slot.points.map((point) => point.x));
  const maxX = Math.max(...slot.points.map((point) => point.x));
  const minY = Math.min(...slot.points.map((point) => point.y));
  const maxY = Math.max(...slot.points.map((point) => point.y));

  for (let attempt = 0; attempt < 80; attempt += 1) {
    const candidate = {
      x: lerp(minX, maxX, 0.4 + rand() * 0.2),
      y: preferBottom
        ? lerp(minY, maxY, 0.65 + rand() * 0.25)
        : lerp(minY, maxY, 0.42 + rand() * 0.2),
    };

    if (pointInPolygon(candidate, slot.points)) {
      return candidate;
    }
  }

  return slot.center;
}

function buildTrackPlacement(
  playerId: string,
  tokenPath: string,
  value: number,
  slots: TrackSlot[],
  playerIndex: number,
  totalPlayers: number,
  kind: PieceKind,
): PiecePlacement {
  const slot = getTrackSlotByValue(slots, value);
  const rng = makeDeterministicRand(`${playerId}-${kind}-${playerIndex}-${totalPlayers}`);
  const anchor = slot
    ? samplePointInSlot(rng, slot, kind === "star" || kind === "strength")
    : { x: 0.02, y: 0.02 };

  return {
    id: `${playerId}-${kind}`,
    playerId,
    kind,
    tokenPath,
    x: clamp01(anchor.x),
    y: clamp01(anchor.y),
    rotationDeg: slot?.rotationDeg ?? 0,
  };
}

type HexPlacementConfig = {
  playerId: string;
  kind: PieceKind;
  tokenPath: string;
  hexId: number;
  count: number;
  minDistance: number;
  collapseAt: number;
  idPrefix: string;
  centerBias?: number;
  randomRotation?: boolean;
};

function buildHexPlacements(
  rand: () => number,
  hexById: Map<number, { points: HexPoint[] }>,
  config: HexPlacementConfig,
): PiecePlacement[] {
  if (config.count <= 0) {
    return [];
  }

  const hex = hexById.get(config.hexId);
  if (!hex || hex.points.length === 0) {
    return [];
  }

  if (config.count > config.collapseAt) {
    const stackPoint = samplePointInHex(rand, hex.points, config.centerBias ?? 0.45);
    return [{
      id: `${config.idPrefix}-${config.hexId}-stack`,
      playerId: config.playerId,
      kind: config.kind,
      tokenPath: config.tokenPath,
      x: stackPoint.x,
      y: stackPoint.y,
      stackCount: config.count,
      rotationDeg: config.randomRotation ? randomInt(rand, -9, 9) : 0,
    }];
  }

  const points = samplePackedPointsInHex(
    rand,
    hex.points,
    config.count,
    config.minDistance,
    config.centerBias ?? 0.45,
  );
  return points.map((point, index) => ({
    id: `${config.idPrefix}-${config.hexId}-${index + 1}`,
    playerId: config.playerId,
    kind: config.kind,
    tokenPath: config.tokenPath,
    x: point.x,
    y: point.y,
    rotationDeg: config.randomRotation ? randomInt(rand, -12, 12) : 0,
  }));
}

function buildPiecePlacements(
  rand: () => number,
  players: TemporaryScenarioPlayer[],
  hexById: Map<number, { points: HexPoint[] }>,
  trackSlots: TrackSlots,
  structureBonusMarker: { center: HexPoint; rotationDegrees?: number } | null,
): PiecePlacement[] {
  const placements: PiecePlacement[] = [];

  const structureBonusPath = STRUCTURE_BONUS_TILE_PATHS[randomInt(rand, 0, STRUCTURE_BONUS_TILE_PATHS.length - 1)];
  const structureCenter = structureBonusMarker?.center ?? FALLBACK_STRUCTURE_BONUS_TILE_ANCHOR;
  placements.push({
    id: "structure-bonus-tile",
    playerId: "board",
    kind: "structure_bonus",
    tokenPath: structureBonusPath,
    x: structureCenter.x,
    y: structureCenter.y,
    rotationDeg: structureBonusMarker?.rotationDegrees ?? randomInt(rand, -4, 4),
  });

  players.forEach((player, index) => {
    const faction = FACTIONS[index % FACTIONS.length];
    const unitHexes = uniqueHexIds(player.temporaryLocations.unitHexes);
    const structureHexes = uniqueHexIds(player.temporaryLocations.structureHexes);
    const pieceHexes = uniqueHexIds([...unitHexes, ...structureHexes]);
    const workerCount = Math.max(1, Math.min(8, unitHexes.length + randomInt(rand, 0, 3)));
    const workerDistribution = distributeCount(workerCount, Math.max(1, unitHexes.length), rand);

    unitHexes.forEach((hexId, unitIndex) => {
      placements.push(
        ...buildHexPlacements(rand, hexById, {
          playerId: player.playerId,
          kind: "worker",
          tokenPath: tokenPathForPiece(faction, "worker"),
          hexId,
          count: workerDistribution[unitIndex] ?? 0,
          minDistance: 0.018,
          collapseAt: 4,
          idPrefix: `${player.playerId}-worker`,
          centerBias: 0.65,
          randomRotation: true,
        }),
      );
    });

    const mechHex = unitHexes[1] ?? unitHexes[0];
    if (mechHex) {
      placements.push(
        ...buildHexPlacements(rand, hexById, {
          playerId: player.playerId,
          kind: "mech",
          tokenPath: tokenPathForPiece(faction, "mech"),
          hexId: mechHex,
          count: randomInt(rand, 1, 2),
          minDistance: 0.021,
          collapseAt: 2,
          idPrefix: `${player.playerId}-mech`,
          centerBias: 0.7,
          randomRotation: true,
        }),
      );

      placements.push(
        ...buildHexPlacements(rand, hexById, {
          playerId: player.playerId,
          kind: "character",
          tokenPath: tokenPathForPiece(faction, "character"),
          hexId: mechHex,
          count: 1,
          minDistance: 0.02,
          collapseAt: 1,
          idPrefix: `${player.playerId}-character`,
          centerBias: 0.72,
          randomRotation: true,
        }),
      );
    }

    const structureHex = structureHexes[0] ?? unitHexes[0];
    if (structureHex) {
      placements.push(
        ...buildHexPlacements(rand, hexById, {
          playerId: player.playerId,
          kind: "structure",
          tokenPath: tokenPathForPiece(faction, "structure"),
          hexId: structureHex,
          count: 1,
          minDistance: 0.02,
          collapseAt: 1,
          idPrefix: `${player.playerId}-structure`,
          centerBias: 0.64,
          randomRotation: true,
        }),
      );
    }

    const resourceTotal = Math.max(4, Math.min(18, Math.floor(player.resources / 2) + 3));
    const resourceHexes = pieceHexes.length > 0 ? pieceHexes.slice(0, 4) : unitHexes;
    const resourceDistribution = distributeCount(resourceTotal, Math.max(1, resourceHexes.length), rand);

    resourceHexes.forEach((hexId, resourceHexIndex) => {
      const tokenPath = RESOURCE_TOKEN_PATHS[(index + resourceHexIndex) % RESOURCE_TOKEN_PATHS.length];
      placements.push(
        ...buildHexPlacements(rand, hexById, {
          playerId: player.playerId,
          kind: "resource",
          tokenPath,
          hexId,
          count: resourceDistribution[resourceHexIndex] ?? 0,
          minDistance: 0.009,
          collapseAt: 8,
          idPrefix: `${player.playerId}-resource-${resourceHexIndex}`,
          centerBias: 0.87,
          randomRotation: true,
        }),
      );
    });

    placements.push(
      buildTrackPlacement(
        player.playerId,
        tokenPathForPiece(faction, "popularity"),
        player.popularity,
        trackSlots.popularity,
        index,
        players.length,
        "popularity",
      ),
    );

    placements.push(
      buildTrackPlacement(
        player.playerId,
        tokenPathForPiece(faction, "strength"),
        player.tiebreaker.power,
        trackSlots.strength,
        index,
        players.length,
        "strength",
      ),
    );

    placements.push(
      buildTrackPlacement(
        player.playerId,
        tokenPathForPiece(faction, "star"),
        player.stars,
        trackSlots.star,
        index,
        players.length,
        "star",
      ),
    );
  });

  return placements;
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

function randomInt(rand: () => number, min: number, max: number): number {
  return Math.floor(rand() * (max - min + 1)) + min;
}

function pickMany(rand: () => number, source: number[], count: number): number[] {
  const pool = [...source];
  const picked: number[] = [];
  const targetCount = Math.min(count, pool.length);

  for (let index = 0; index < targetCount; index += 1) {
    const pickIndex = randomInt(rand, 0, pool.length - 1);
    picked.push(pool[pickIndex]);
    pool.splice(pickIndex, 1);
  }

  return picked;
}

function buildPlayer(
  rand: () => number,
  hexIds: number[],
  scenarioIndex: number,
  playerIndex: number,
): TemporaryScenarioPlayer {
  const stars = randomInt(rand, 0, 6);
  const territories = randomInt(rand, 4, 14);
  const resources = randomInt(rand, 0, 18);
  const coins = randomInt(rand, 0, 30);
  const popularity = randomInt(rand, 0, 18);
  const factoryControlled = rand() < 0.25;
  const structureBonusCoins = [0, 2, 4, 6, 9][randomInt(rand, 0, 4)];

  const unitsAndStructures = randomInt(rand, 5, 20);
  const power = randomInt(rand, 0, 16);

  return {
    playerId: `p${playerIndex + 1}`,
    displayName: `Player ${playerIndex + 1}`,
    stars,
    territories,
    resources,
    coins,
    popularity,
    factoryControlled,
    structureBonusCoins,
    tiebreaker: {
      unitsAndStructures,
      power,
      popularity,
      resources,
      territories: territories + (factoryControlled ? 2 : 0),
      stars,
    },
    temporaryLocations: {
      unitHexes: pickMany(rand, hexIds, randomInt(rand, 2, 5)),
      structureHexes: pickMany(rand, hexIds, randomInt(rand, 1, 3)),
    },
  };
}

const SCENARIO_BANK_SIZE = 280;

export const getTemporaryScenarioBank = cache(async (): Promise<TemporaryScenario[]> => {
  const board = await loadScytheBoardData();
  const hexIds = board.hexes.map((hex) => hex.id);
  const hexById = new Map(board.hexes.map((hex) => [hex.id, { points: hex.points }]));
  const markers = board.boardMarkers;
  const trackSlots: TrackSlots = {
    popularity: buildTrackSlots(markers?.popularityTrack),
    strength: buildTrackSlots(markers?.strengthTrack),
    star: buildTrackSlots(markers?.starTrack),
  };
  const scenarios: TemporaryScenario[] = [];

  for (let index = 0; index < SCENARIO_BANK_SIZE; index += 1) {
    const seed = 1000 + index;
    const rand = mulberry32(seed);
    const playerCount = 1 + (index % 5);

    const players = Array.from({ length: playerCount }, (_, playerIndex) =>
      buildPlayer(rand, hexIds, index, playerIndex),
    );

    scenarios.push({
      id: `temp-${String(index + 1).padStart(3, "0")}-${playerCount}p`,
      playerCount,
      boardImagePath: `/assets/boards/${board.image.name}`,
      boardImageWidth: board.image.width,
      boardImageHeight: board.image.height,
      piecePlacements: buildPiecePlacements(
        rand,
        players,
        hexById,
        trackSlots,
        markers?.structureBonus ? {
          center: markers.structureBonus.center,
          rotationDegrees: markers.structureBonus.rotationDegrees,
        } : null,
      ),
      players,
    });
  }

  return scenarios;
});

export async function getTemporaryScenarioById(id: string): Promise<TemporaryScenario | null> {
  const scenarios = await getTemporaryScenarioBank();
  return scenarios.find((scenario) => scenario.id === id) ?? null;
}

function hashString(input: string): number {
  let hash = 0;

  for (let index = 0; index < input.length; index += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(index);
    hash |= 0;
  }

  return Math.abs(hash);
}

export async function getTemporaryScenarioForPlayerCount(
  userId: string,
  playerCount: number,
): Promise<TemporaryScenario> {
  const scenarios = await getTemporaryScenarioBank();
  const filtered = scenarios.filter((scenario) => scenario.playerCount === playerCount);

  if (filtered.length === 0) {
    throw new Error(`No temporary scenarios found for ${playerCount} players`);
  }

  const index = hashString(userId) % filtered.length;
  return filtered[index];
}
