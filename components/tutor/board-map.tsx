"use client";

import { useMemo, useState } from "react";
import type { PointerEvent } from "react";
import { cn } from "@/lib/utils/cn";
import type { BoardHex } from "@/lib/scythe/board-data";
import type { PieceKind, PiecePlacement } from "@/lib/tutor/scenario-bank";

type FactionId = "saxony" | "rusviet" | "nordic" | "crimea" | "polania";
type FactionColor = "black" | "red" | "blue" | "yellow" | "white";

export type BoardMapPlayerMeta = {
  playerId: string;
  faction: FactionId;
  controlledHexIds: number[];
};

type BoardMapProps = {
  boardImagePath: string;
  boardImageWidth: number;
  boardImageHeight: number;
  piecePlacements: PiecePlacement[];
  boardHexes?: BoardHex[];
  players?: BoardMapPlayerMeta[];
  enableHexDetails?: boolean;
  showTouchMapLayer?: boolean;
  className?: string;
};

const PIECE_SIZE_PERCENT: Record<PieceKind, number> = {
  worker: 1.9,
  mech: 3.2,
  character: 2.9,
  structure: 2.4,
  resource: 2.2,
  popularity: 1.8,
  strength: 1.8,
  star: 1.8,
  structure_bonus: 4.2,
};

const PIECE_TOKEN_SCALE_PERCENT: Record<PieceKind, number> = {
  worker: 36,
  mech: 45,
  character: 60,
  structure: 30,
  resource: 35,
  popularity: 80,
  strength: 90,
  star: 60,
  structure_bonus: 100,
};

const PIECE_Z_INDEX: Record<PieceKind, number> = {
  worker: 20,
  mech: 30,
  character: 35,
  structure: 25,
  resource: 18,
  popularity: 46,
  strength: 46,
  star: 46,
  structure_bonus: 44,
};

const FACTION_TO_COLOR: Record<FactionId, FactionColor> = {
  saxony: "black",
  rusviet: "red",
  nordic: "blue",
  crimea: "yellow",
  polania: "white",
};

const COLOR_TO_FACTION_LABEL: Record<FactionColor, string> = {
  black: "SAXONY",
  red: "RUSVIET",
  blue: "NORDIC",
  yellow: "CRIMEA",
  white: "POLANIA",
};

type PieceDetailsByPlayer = {
  playerId: string;
  factionColor: FactionColor;
  factionLabel: string;
  pieces: PiecePlacement[];
};

type ResourceDetailsByPlayer = {
  playerId: string;
  factionColor: FactionColor;
  factionLabel: string;
  resources: Array<{ type: string; count: number; tokenPath: string }>;
};

type OccupiedHexDetails = {
  hexId: number;
  points: Array<{ x: number; y: number }>;
  polygonPoints: string;
  pieceDetailsByPlayer: PieceDetailsByPlayer[];
  resourceDetailsByPlayer: ResourceDetailsByPlayer[];
};

function pointInPolygon(point: { x: number; y: number }, polygon: Array<{ x: number; y: number }>): boolean {
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

function parseHexId(piece: PiecePlacement): number | null {
  if (piece.kind === "worker") {
    const match = piece.id.match(/-worker-(\d+)-/);
    return match ? Number.parseInt(match[1], 10) : null;
  }

  if (piece.kind === "mech") {
    const match = piece.id.match(/-mech-(\d+)(?:-|$)/);
    return match ? Number.parseInt(match[1], 10) : null;
  }

  if (piece.kind === "structure") {
    const match = piece.id.match(/-structure-(\d+)-/);
    return match ? Number.parseInt(match[1], 10) : null;
  }

  if (piece.kind === "resource") {
    const match = piece.id.match(/-resource-(\d+)-/);
    return match ? Number.parseInt(match[1], 10) : null;
  }

  if (piece.kind === "character") {
    const match = piece.id.match(/-character-(\d+)(?:-|$)/);
    return match ? Number.parseInt(match[1], 10) : null;
  }

  return null;
}

function inferColorFromTokenPath(path: string): FactionColor | null {
  const match = path.match(/\/factions\/([^/]+)\//);
  const color = match?.[1];
  if (color === "black" || color === "red" || color === "blue" || color === "yellow" || color === "white") {
    return color;
  }
  return null;
}

function resourceTypeFromTokenPath(path: string): string {
  if (path.includes("/Ore.")) {
    return "Metal";
  }
  if (path.includes("/Oil.")) {
    return "Oil";
  }
  if (path.includes("/Grain.")) {
    return "Food";
  }
  if (path.includes("/Lumber.")) {
    return "Wood";
  }
  return "Resource";
}

function factionDisplay(color: FactionColor): string {
  return COLOR_TO_FACTION_LABEL[color] ?? color.toUpperCase();
}

function defaultPieceScale(kind: PieceKind): number {
  if (kind === "mech") return 72;
  if (kind === "character") return 88;
  if (kind === "structure") return 74;
  if (kind === "worker") return 66;
  if (kind === "resource") return 62;
  return 60;
}

function factionColorClass(color: FactionColor): string {
  switch (color) {
    case "black":
      return "text-slate-900";
    case "red":
      return "text-rose-400";
    case "blue":
      return "text-sky-400";
    case "yellow":
      return "text-amber-400";
    case "white":
      return "text-slate-100";
  }
}

export function BoardMap({
  boardImagePath,
  boardImageWidth,
  boardImageHeight,
  piecePlacements,
  boardHexes = [],
  players = [],
  enableHexDetails = false,
  showTouchMapLayer = false,
  className,
}: BoardMapProps) {
  const [selectedHexId, setSelectedHexId] = useState<number | null>(null);
  const aspectRatio = `${boardImageWidth} / ${boardImageHeight}`;

  const occupiedHexes = useMemo<OccupiedHexDetails[]>(() => {
    const hexById = new Map(boardHexes.map((hex) => [hex.id, hex] as const));
    const piecesByHex = new Map<number, PiecePlacement[]>();

    for (const piece of piecePlacements) {
      const hexId = parseHexId(piece);
      if (hexId === null || !hexById.has(hexId)) {
        continue;
      }
      const list = piecesByHex.get(hexId) ?? [];
      list.push(piece);
      piecesByHex.set(hexId, list);
    }

    if (piecesByHex.size === 0) {
      return [];
    }

    const factionColorByPlayerId = new Map<string, FactionColor>();
    for (const player of players) {
      factionColorByPlayerId.set(player.playerId, FACTION_TO_COLOR[player.faction]);
    }
    for (const piece of piecePlacements) {
      if (piece.playerId === "board" || factionColorByPlayerId.has(piece.playerId)) {
        continue;
      }
      const inferred = inferColorFromTokenPath(piece.tokenPath);
      if (inferred) {
        factionColorByPlayerId.set(piece.playerId, inferred);
      }
    }

    const controllerByHexId = new Map<number, string>();
    for (const player of players) {
      for (const hexId of player.controlledHexIds) {
        if (!controllerByHexId.has(hexId)) {
          controllerByHexId.set(hexId, player.playerId);
        }
      }
    }

    const occupied = Array.from(piecesByHex.entries()).reduce<OccupiedHexDetails[]>((result, [hexId, hexPieces]) => {
      const hex = hexById.get(hexId);
      if (!hex || hex.points.length < 3) {
        return result;
      }

      const polygonPoints = hex.points
        .map((point) => `${point.x * 100},${point.y * 100}`)
        .join(" ");

      const piecesByPlayer = new Map<string, PiecePlacement[]>();
      const resourcesByPlayer = new Map<string, Map<string, { count: number; tokenPath: string }>>();

      for (const piece of hexPieces) {
        if (piece.kind === "resource") {
          const controllerId = controllerByHexId.get(hexId) ?? "unknown";
          const type = resourceTypeFromTokenPath(piece.tokenPath);
          const resources = resourcesByPlayer.get(controllerId) ?? new Map<string, { count: number; tokenPath: string }>();
          const current = resources.get(type);
          resources.set(type, {
            count: (current?.count ?? 0) + 1,
            tokenPath: current?.tokenPath ?? piece.tokenPath,
          });
          resourcesByPlayer.set(controllerId, resources);
          continue;
        }

        const playerList = piecesByPlayer.get(piece.playerId) ?? [];
        playerList.push(piece);
        piecesByPlayer.set(piece.playerId, playerList);
      }

      const pieceDetailsByPlayer: PieceDetailsByPlayer[] = Array.from(piecesByPlayer.entries()).map(([playerId, pieces]) => {
        const factionColor = factionColorByPlayerId.get(playerId) ?? "white";
        return {
          playerId,
          factionColor,
          factionLabel: factionDisplay(factionColor),
          pieces,
        };
      });

      const resourceDetailsByPlayer: ResourceDetailsByPlayer[] = Array.from(resourcesByPlayer.entries()).map(([playerId, resources]) => {
        const factionColor = playerId === "unknown" ? "white" : (factionColorByPlayerId.get(playerId) ?? "white");
        const entries = Array.from(resources.entries())
          .map(([type, value]) => ({ type, count: value.count, tokenPath: value.tokenPath }))
          .sort((a, b) => a.type.localeCompare(b.type));
        return {
          playerId,
          factionColor,
          factionLabel: playerId === "unknown" ? "UNCONTROLLED" : factionDisplay(factionColor),
          resources: entries,
        };
      });

      result.push({
        hexId,
        points: hex.points,
        polygonPoints,
        pieceDetailsByPlayer,
        resourceDetailsByPlayer,
      });

      return result;
    }, []);

    return occupied;
  }, [boardHexes, piecePlacements, players]);

  const selectedHex = useMemo(
    () => occupiedHexes.find((hex) => hex.hexId === selectedHexId) ?? null,
    [occupiedHexes, selectedHexId],
  );

  const selectedHexTitle = useMemo(() => {
    if (!selectedHex) {
      return null;
    }

    const ownedGroup = selectedHex.resourceDetailsByPlayer.find((group) => group.playerId !== "unknown")
      ?? selectedHex.pieceDetailsByPlayer.find((group) => group.playerId !== "board");

    if (!ownedGroup) {
      return {
        text: "UNCLAIMED RESOURCES",
        factionColor: "white" as FactionColor,
      };
    }

    return {
      text: ownedGroup.factionLabel,
      factionColor: ownedGroup.factionColor,
    };
  }, [selectedHex]);

  function findHexAtPoint(point: { x: number; y: number }): OccupiedHexDetails | null {
    for (let index = occupiedHexes.length - 1; index >= 0; index -= 1) {
      const hex = occupiedHexes[index];
      if (pointInPolygon(point, hex.points)) {
        return hex;
      }
    }

    return null;
  }

  function findHexFromClientPoint(clientX: number, clientY: number, rect: DOMRect): OccupiedHexDetails | null {
    const point = {
      x: (clientX - rect.left) / rect.width,
      y: (clientY - rect.top) / rect.height,
    };
    return findHexAtPoint(point);
  }

  function handleOverlayPointerDown(event: PointerEvent<HTMLDivElement>) {
    const hit = findHexFromClientPoint(event.clientX, event.clientY, event.currentTarget.getBoundingClientRect());
    if (hit) {
      setSelectedHexId(hit.hexId);
    }
  }

  return (
    <>
      <div className={cn("mx-auto w-full max-w-full", className)}>
        <div
          className="relative overflow-hidden rounded-xl border border-border bg-surface"
          style={{
            aspectRatio,
            width: "100%",
            maxWidth: "980px",
          }}
        >
        <img
          src={boardImagePath}
          alt="Scythe board"
          className="absolute inset-0 h-full w-full select-none object-contain object-center"
        />

        {piecePlacements.map((piece) => {
          const size = piece.sizePercent ?? PIECE_SIZE_PERCENT[piece.kind];
          const boxWidth = piece.boxWidthPercent != null ? piece.boxWidthPercent * 100 : size;
          const boxHeight = piece.boxHeightPercent != null ? piece.boxHeightPercent * 100 : size;
          const tokenScale = piece.tokenScalePercent ?? PIECE_TOKEN_SCALE_PERCENT[piece.kind];
          const tokenWidth = piece.tokenWidthPercent ?? tokenScale;
          const tokenHeight = piece.tokenHeightPercent ?? tokenScale;
          const zIndex = PIECE_Z_INDEX[piece.kind];
          const rotationDeg = piece.rotationDeg ?? 0;
          const boxRotationDeg = piece.boxRotationDeg ?? 0;

          return (
            <div
              key={piece.id}
              className="pointer-events-none absolute"
              style={{
                width: `${boxWidth}%`,
                height: `${boxHeight}%`,
                left: `${piece.x * 100}%`,
                top: `${piece.y * 100}%`,
                transform: `translate(-50%, -50%) rotate(${boxRotationDeg}deg)`,
                zIndex,
              }}
            >
              <div
                className="absolute inset-0 flex items-center justify-center overflow-hidden"
                style={{
                  transform: `rotate(${rotationDeg}deg)`,
                }}
              >
                <img
                  src={piece.tokenPath}
                  alt={`${piece.playerId} ${piece.kind}`}
                  className="block select-none"
                  style={{
                    filter: "saturate(1.14) contrast(1.05) brightness(1.04)",
                    maxWidth: `${tokenWidth}%`,
                    maxHeight: `${tokenHeight}%`,
                    width: "auto",
                    height: "auto",
                  }}
                />
              </div>
            </div>
          );
        })}

        {showTouchMapLayer || enableHexDetails ? (
          <div
            className="absolute inset-0 z-[200]"
            onPointerDown={handleOverlayPointerDown}
          />
        ) : null}

        {selectedHex && selectedHexTitle ? (
          <div
            className="absolute left-auto right-4 top-4 z-50 w-80 overflow-hidden rounded-3xl border border-border bg-surface-2 p-4 text-foreground shadow-lg"
            style={{ maxHeight: "80vh", overflowY: "auto", pointerEvents: "auto" }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-border pb-3">
              <div className="space-y-1">
                <h3 className={cn("text-lg font-black tracking-[0.2em]", factionColorClass(selectedHexTitle.factionColor))}>
                  {selectedHexTitle.text} HEX
                </h3>
                <p className="text-xs text-muted">Pieces and resources</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedHexId(null)}
                className="rounded-full border border-border bg-surface-3 px-2 py-1 text-xs font-semibold text-foreground hover:bg-surface"
              >
                ✕
              </button>
            </div>

            <div className="mt-3 space-y-3">
              <section className="rounded-xl border border-border bg-surface-3 p-3">
                {selectedHex.pieceDetailsByPlayer.length > 0 ? (
                  <div className="space-y-3">
                    {selectedHex.pieceDetailsByPlayer.map((group) => (
                      <div key={`pieces-${group.playerId}`}>
                        <h4 className={cn("text-xs font-black uppercase tracking-[0.12em]", factionColorClass(group.factionColor))}>
                          {group.factionLabel} pieces
                        </h4>
                        <div className="mt-2 flex flex-wrap gap-3">
                          {group.pieces.map((piece) => (
                            <div
                              key={piece.id}
                              className="relative flex h-16 w-16 items-center justify-center"
                            >
                              <img
                                src={piece.tokenPath}
                                alt={`${group.factionLabel} ${piece.kind}`}
                                className="select-none object-contain"
                                style={{
                                  width: `${defaultPieceScale(piece.kind)}px`,
                                  height: `${defaultPieceScale(piece.kind)}px`,
                                }}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted">No pieces on this hex</p>
                )}
              </section>

              <section className="rounded-xl border border-border bg-surface-3 p-3">
                <h4 className="text-xs font-black uppercase tracking-[0.18em] text-foreground">Resources</h4>
                {selectedHex.resourceDetailsByPlayer.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {selectedHex.resourceDetailsByPlayer.map((group) =>
                      group.resources.map((resource) =>
                        Array.from({ length: resource.count }).map((_, index) => (
                          <div
                            key={`${group.playerId}-${resource.type}-${index}`}
                            className="flex items-center justify-center"
                            style={{ width: `${defaultPieceScale("resource") * 0.75}px`, height: `${defaultPieceScale("resource") * 0.75}px` }}
                          >
                            <img
                              src={resource.tokenPath}
                              alt={resource.type}
                              className="object-contain"
                              style={{ maxWidth: "100%", maxHeight: "100%" }}
                            />
                          </div>
                        ))
                      )
                    )}
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-muted">No resources on this hex</p>
                )}
              </section>
            </div>
          </div>
        ) : null}
        </div>
      </div>
    </>
  );
}
