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
          const zIndex = PIECE_Z_INDEX[piece.kind];
          const rotationDeg = piece.rotationDeg ?? 0;

          return (
            <div
              key={piece.id}
              className="absolute"
              style={{
                width: `${size}%`,
                left: `${piece.x * 100}%`,
                top: `${piece.y * 100}%`,
                transform: `translate(-50%, -50%) rotate(${rotationDeg}deg)`,
                zIndex,
              }}
            >
              <img
                src={piece.tokenPath}
                alt={`${piece.playerId} ${piece.kind}`}
                className="block h-auto w-full select-none object-contain"
                style={{ filter: "saturate(1.14) contrast(1.05) brightness(1.04)" }}
              />
              {piece.stackCount && piece.stackCount > 1 ? (
                <span className="absolute -right-2 -top-2 inline-flex h-4 min-w-4 items-center justify-center rounded-full border border-white/80 bg-white px-1 text-[10px] font-bold leading-none text-black shadow-sm">
                  {piece.stackCount}
                </span>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
