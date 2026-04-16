import { cn } from "@/lib/utils/cn";
import type { PieceKind, PiecePlacement } from "@/lib/tutor/scenario-bank";
import type { ScytheBoardData } from "@/lib/scythe/board-data";

type BoardMapProps = {
  boardImagePath: string;
  boardImageWidth: number;
  boardImageHeight: number;
  piecePlacements: PiecePlacement[];
  boardGeometry?: ScytheBoardData;
  showDebugBorders?: boolean;
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

export function BoardMap({
  boardImagePath,
  boardImageWidth,
  boardImageHeight,
  piecePlacements,
  boardGeometry,
  showDebugBorders = false,
  className,
}: BoardMapProps) {
  const aspectRatio = `${boardImageWidth} / ${boardImageHeight}`;
  const viewBox = `0 0 ${boardImageWidth} ${boardImageHeight}`;

  function toPoints(points: Array<{ x: number; y: number }>): string {
    return points.map((point) => `${point.x * boardImageWidth},${point.y * boardImageHeight}`).join(" ");
  }

  return (
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

        {showDebugBorders && boardGeometry ? (
          <svg
            aria-hidden="true"
            className="absolute inset-0 h-full w-full pointer-events-none"
            viewBox={viewBox}
            preserveAspectRatio="none"
          >
            {boardGeometry.hexes.map((hex) => (
              <g key={`hex-${hex.id}`}>
                <polygon
                  points={toPoints(hex.points)}
                  fill="rgba(0, 0, 0, 0.02)"
                  stroke="rgba(255, 255, 255, 0.95)"
                  strokeWidth={2}
                  vectorEffect="non-scaling-stroke"
                />
                <text
                  x={hex.points.reduce((sum, point) => sum + point.x, 0) / hex.points.length * boardImageWidth}
                  y={hex.points.reduce((sum, point) => sum + point.y, 0) / hex.points.length * boardImageHeight}
                  fill="#ffffff"
                  stroke="#000000"
                  strokeWidth={3}
                  paintOrder="stroke"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={16}
                  fontWeight={700}
                >
                  {hex.id}
                </text>
              </g>
            ))}

            {boardGeometry.boardMarkers?.structureBonus ? (
              <polygon
                points={toPoints(boardGeometry.boardMarkers.structureBonus.points)}
                fill="rgba(255, 215, 0, 0.06)"
                stroke="rgba(255, 215, 0, 0.95)"
                strokeWidth={2}
                vectorEffect="non-scaling-stroke"
              />
            ) : null}

            {boardGeometry.boardMarkers?.popularityTrack?.slots.map((slot) => (
              <g key={`pop-${slot.index}`}>
                <polygon
                  points={toPoints(slot.rectangle.points)}
                  fill="rgba(59, 130, 246, 0.04)"
                  stroke="rgba(59, 130, 246, 0.9)"
                  strokeWidth={2}
                  vectorEffect="non-scaling-stroke"
                />
                <text
                  x={slot.rectangle.center.x * boardImageWidth}
                  y={slot.rectangle.center.y * boardImageHeight}
                  fill="#93c5fd"
                  stroke="#000000"
                  strokeWidth={2}
                  paintOrder="stroke"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={12}
                  fontWeight={700}
                >
                  {slot.index}
                </text>
              </g>
            ))}

            {boardGeometry.boardMarkers?.strengthTrack?.slots.map((slot) => (
              <g key={`str-${slot.index}`}>
                <polygon
                  points={toPoints(slot.rectangle.points)}
                  fill="rgba(34, 197, 94, 0.04)"
                  stroke="rgba(34, 197, 94, 0.9)"
                  strokeWidth={2}
                  vectorEffect="non-scaling-stroke"
                />
                <text
                  x={slot.rectangle.center.x * boardImageWidth}
                  y={slot.rectangle.center.y * boardImageHeight}
                  fill="#86efac"
                  stroke="#000000"
                  strokeWidth={2}
                  paintOrder="stroke"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={12}
                  fontWeight={700}
                >
                  {slot.index}
                </text>
              </g>
            ))}

            {boardGeometry.boardMarkers?.starTrack?.slots.map((slot) => (
              <g key={`star-${slot.index}`}>
                <polygon
                  points={toPoints(slot.rectangle.points)}
                  fill="rgba(251, 191, 36, 0.05)"
                  stroke="rgba(251, 191, 36, 0.95)"
                  strokeWidth={2}
                  vectorEffect="non-scaling-stroke"
                />
                <text
                  x={slot.rectangle.center.x * boardImageWidth}
                  y={slot.rectangle.center.y * boardImageHeight}
                  fill="#fde68a"
                  stroke="#000000"
                  strokeWidth={2}
                  paintOrder="stroke"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={12}
                  fontWeight={700}
                >
                  {slot.index}
                </text>
              </g>
            ))}
          </svg>
        ) : null}

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
              className="absolute"
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
                    backgroundColor: showDebugBorders ? "rgba(239, 68, 68, 0.2)" : "transparent",
                    border: showDebugBorders ? "1px solid rgba(239, 68, 68, 0.8)" : "none",
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
