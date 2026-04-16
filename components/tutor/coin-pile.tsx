"use client";

import { useMemo, useState } from "react";
import { FactionLabel } from "@/components/tutor/faction-label";

type PlayerCoins = {
  playerId: string;
  displayName: string;
  coins: number;
};

type CoinPileProps = {
  scenarioId: string;
  players: PlayerCoins[];
  hidePlayerTotals?: boolean;
};

type CoinToken = {
  id: string;
  denomination: 1 | 5 | 10 | 20;
  face: "front" | "back";
  imagePath: string;
};

const DENOMINATIONS: Array<1 | 5 | 10 | 20> = [20, 10, 5, 1];

function hashString(input: string): number {
  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
}

function makeRng(seed: number) {
  let value = seed;
  return () => {
    value |= 0;
    value = (value + 0x6d2b79f5) | 0;
    let result = Math.imul(value ^ (value >>> 15), 1 | value);
    result = (result + Math.imul(result ^ (result >>> 7), 61 | result)) ^ result;
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}

function expandCoinTokens(seedKey: string, coins: number): CoinToken[] {
  const rng = makeRng(hashString(seedKey));
  const tokens: CoinToken[] = [];
  let remaining = Math.max(0, coins);

  DENOMINATIONS.forEach((denomination) => {
    const count = Math.floor(remaining / denomination);
    remaining -= count * denomination;

    for (let index = 0; index < count; index += 1) {
      const face: "front" | "back" = rng() < 0.5 ? "front" : "back";
      tokens.push({
        id: `${denomination}-${index}`,
        denomination,
        face,
        imagePath: `/assets/tokens/coins/${
          denomination === 1
            ? `one_${face}`
            : denomination === 5
              ? `five_${face}`
              : denomination === 10
                ? `ten_${face}`
                : `twenty_${face}`
        }.webp`,
      });
    }
  });

  return tokens;
}

export function CoinPile({ scenarioId, players, hidePlayerTotals = false }: CoinPileProps) {
  const [sortedView, setSortedView] = useState(false);

  const playerTokens = useMemo(() => {
    return players.map((player) => ({
      ...player,
      tokens: expandCoinTokens(`${scenarioId}-${player.playerId}`, player.coins),
    }));
  }, [players, scenarioId]);

  return (
    <section className="space-y-3 rounded-xl border border-border bg-surface-1 p-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm uppercase tracking-[0.08em] text-accent-strong">Coins</h3>
        <button
          type="button"
          onClick={() => setSortedView((value) => !value)}
          className="rounded-md border border-border bg-surface-2 px-2 py-1 text-xs text-foreground hover:bg-surface-3"
        >
          {sortedView ? "Pile" : "Sort"}
        </button>
      </div>

      <div className="space-y-3">
        {playerTokens.map((player) => (
          <div key={player.playerId} className="rounded-lg border border-border/70 bg-surface-2 p-2">
            <div className="mb-2 flex items-center justify-between">
              <FactionLabel value={player.displayName} className="text-sm" />
              {hidePlayerTotals ? null : (
                <p className="text-xs font-semibold text-foreground">{player.coins} coins</p>
              )}
            </div>

            {sortedView ? (
              <div className="grid grid-cols-4 gap-2">
                {DENOMINATIONS.map((denomination) => {
                  const count = player.tokens.filter((token) => token.denomination === denomination).length;
                  return (
                    <div key={`${player.playerId}-${denomination}`} className="rounded border border-border/60 bg-surface p-1 text-center">
                      <img
                        src={`/assets/tokens/coins/${
                          denomination === 1
                            ? "one_front"
                            : denomination === 5
                              ? "five_front"
                              : denomination === 10
                                ? "ten_front"
                                : "twenty_front"
                        }.webp`}
                        alt={`${denomination} coin`}
                        className="mx-auto h-9 w-9 object-contain"
                        style={{ width: "46px", height: "46px" }}
                      />
                      <p className="text-[10px] text-muted">x{count}</p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-x-1 gap-y-1 overflow-hidden">
                {player.tokens.map((token, index) => (
                  <img
                    key={`${player.playerId}-${token.id}-${index}`}
                    src={token.imagePath}
                    alt={`${token.denomination} coin ${token.face}`}
                    className="h-9 w-9 -rotate-2 object-contain"
                    style={{
                      width: "46px",
                      height: "46px",
                      marginLeft: index % 5 === 0 ? 0 : -4,
                      transform: `rotate(${(index % 7) - 3}deg)`,
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
