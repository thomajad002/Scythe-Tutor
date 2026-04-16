import { cn } from "@/lib/utils/cn";
import type { PieceKind, PiecePlacement } from "@/lib/tutor/scenario-bank";

type BoardMapProps = {
  boardImagePath: string;
  boardImageWidth: number;
  boardImageHeight: number;
  piecePlacements: PiecePlacement[];
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
  className,
}: BoardMapProps) {
  const aspectRatio = `${boardImageWidth} / ${boardImageHeight}`;

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
