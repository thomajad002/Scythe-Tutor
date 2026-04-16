import { cache } from "react";
import scenariosData from "@/data/games/scythe_scenarios.json";
import { loadScytheBoardData } from "@/lib/scythe/board-data";
import type { MultiplayerScoringPlayerInput } from "@/lib/scythe/scoring";

type HexPoint = { x: number; y: number };

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

function sumStars(stars: Record<string, number>): number {
  return Object.values(stars).reduce((sum, value) => sum + value, 0);
}

function normalizePoint(center: HexPoint, playerIndex: number, lane: number): HexPoint {
  const dx = ((playerIndex % 3) - 1) * 0.008 + lane * 0.004;
  const dy = (Math.floor(playerIndex / 3) - 1) * 0.007 + lane * 0.003;
  return {
    x: Math.max(0, Math.min(1, center.x + dx)),
    y: Math.max(0, Math.min(1, center.y + dy)),
  };
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

  const hexCenters = new Map<number, HexPoint>();
  for (const hex of board.hexes) {
    const center = hex.points.reduce(
      (acc, point) => ({ x: acc.x + point.x, y: acc.y + point.y }),
      { x: 0, y: 0 },
    );
    hexCenters.set(hex.id, { x: center.x / hex.points.length, y: center.y / hex.points.length });
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

      const structureBonusCenter = board.boardMarkers?.structureBonus?.center;
      if (structureBonusCenter) {
        placements.push({
          id: `${raw.scenarioId}-${playerCount}-sb`,
          playerId: "board",
          kind: "structure_bonus",
          tokenPath: STRUCTURE_BONUS_PATH[raw.structureBonus] ?? "/assets/tokens/structure-bonus/sb_mine_adj.webp",
          x: structureBonusCenter.x,
          y: structureBonusCenter.y,
          sizePercent: 4.2,
          rotationDeg: board.boardMarkers?.structureBonus?.rotationDegrees ?? 0,
        });
      }

      selectedRawPlayers.forEach((rawPlayer, playerIndex) => {
        const normalizedPlayer = selectedPlayers.find((p) => p.faction === rawPlayer.faction);
        if (!normalizedPlayer) return;

        const workerStacks = countByHex(rawPlayer.workerHexIds);
        for (const stack of workerStacks) {
          const center = hexCenters.get(stack.hexId);
          if (!center) continue;
          const point = normalizePoint(center, playerIndex, -1);
          placements.push({
            id: `${raw.scenarioId}-${normalizedPlayer.playerId}-worker-${stack.hexId}`,
            playerId: normalizedPlayer.playerId,
            kind: "worker",
            tokenPath: tokenPathForFactionPiece(rawPlayer.faction, "worker"),
            x: point.x,
            y: point.y,
            stackCount: stack.count,
          });
        }

        const mechStacks = countByHex(rawPlayer.mechHexIds);
        for (const stack of mechStacks) {
          const center = hexCenters.get(stack.hexId);
          if (!center) continue;
          const point = normalizePoint(center, playerIndex, 0);
          placements.push({
            id: `${raw.scenarioId}-${normalizedPlayer.playerId}-mech-${stack.hexId}`,
            playerId: normalizedPlayer.playerId,
            kind: "mech",
            tokenPath: tokenPathForFactionPiece(rawPlayer.faction, "mech"),
            x: point.x,
            y: point.y,
            stackCount: stack.count,
          });
        }

        const characterCenter = hexCenters.get(rawPlayer.characterHexId);
        if (characterCenter) {
          const point = normalizePoint(characterCenter, playerIndex, 1);
          placements.push({
            id: `${raw.scenarioId}-${normalizedPlayer.playerId}-character`,
            playerId: normalizedPlayer.playerId,
            kind: "character",
            tokenPath: tokenPathForFactionPiece(rawPlayer.faction, "character"),
            x: point.x,
            y: point.y,
          });
        }

        rawPlayer.structures.forEach((structure, structureIndex) => {
          const center = hexCenters.get(structure.hexId);
          if (!center) return;
          const point = normalizePoint(center, playerIndex, 2 + structureIndex);
          placements.push({
            id: `${raw.scenarioId}-${normalizedPlayer.playerId}-structure-${structure.hexId}-${structure.type}`,
            playerId: normalizedPlayer.playerId,
            kind: "structure",
            tokenPath: tokenPathForFactionPiece(rawPlayer.faction, "structure", structure.type),
            x: point.x,
            y: point.y,
          });
        });

        const popSlot = popularitySlots.find((slot) => slot.index === rawPlayer.popularity)
          ?? popularitySlots[Math.min(rawPlayer.popularity, popularitySlots.length - 1)];
        if (popSlot) {
          placements.push({
            id: `${raw.scenarioId}-${normalizedPlayer.playerId}-popularity`,
            playerId: normalizedPlayer.playerId,
            kind: "popularity",
            tokenPath: tokenPathForFactionPiece(rawPlayer.faction, "popularity"),
            x: popSlot.rectangle.center.x,
            y: popSlot.rectangle.center.y,
            rotationDeg: popSlot.rectangle.rotationDegrees ?? 0,
          });
        }

        const powerValue = rawPlayer.power;
        const strengthSlot = strengthSlots.find((slot) => slot.index === powerValue)
          ?? strengthSlots[Math.min(powerValue, strengthSlots.length - 1)];
        if (strengthSlot) {
          placements.push({
            id: `${raw.scenarioId}-${normalizedPlayer.playerId}-power`,
            playerId: normalizedPlayer.playerId,
            kind: "strength",
            tokenPath: tokenPathForFactionPiece(rawPlayer.faction, "strength"),
            x: strengthSlot.rectangle.center.x,
            y: strengthSlot.rectangle.center.y,
            rotationDeg: strengthSlot.rectangle.rotationDegrees ?? 0,
          });
        }

        const starValue = sumStars(rawPlayer.stars);
        const starSlot = starSlots.find((slot) => slot.index === starValue)
          ?? starSlots[Math.min(starValue, starSlots.length - 1)];
        if (starSlot) {
          placements.push({
            id: `${raw.scenarioId}-${normalizedPlayer.playerId}-stars`,
            playerId: normalizedPlayer.playerId,
            kind: "star",
            tokenPath: tokenPathForFactionPiece(rawPlayer.faction, "star"),
            x: starSlot.rectangle.center.x,
            y: starSlot.rectangle.center.y,
            rotationDeg: starSlot.rectangle.rotationDegrees ?? 0,
          });
        }
      });

      raw.resourcesByHex.forEach((entry, entryIndex) => {
        const center = hexCenters.get(entry.hexId);
        if (!center) return;

        let lane = 0;
        Object.entries(entry.resources).forEach(([resourceType, count]) => {
          const tokenPath = RESOURCE_TOKEN_BY_TYPE[resourceType];
          if (!tokenPath || count <= 0) return;

          const point = normalizePoint(center, 0, lane);
          placements.push({
            id: `${raw.scenarioId}-${playerCount}-resource-${entry.hexId}-${resourceType}-${entryIndex}`,
            playerId: "board",
            kind: "resource",
            tokenPath,
            x: point.x,
            y: point.y,
            stackCount: count,
          });

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
