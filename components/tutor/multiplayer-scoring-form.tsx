"use client";

import { useMemo, useState } from "react";
import { FactionLabel } from "@/components/tutor/faction-label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type MultiplayerBreakdownField = "stars" | "territories" | "resources" | "coins" | "structureBonus";

type MultiplayerPlayer = {
  playerId: string;
  displayName: string;
  stars: number;
  territories: number;
  resources: number;
  coins: number;
  popularity: number;
};

type MultiplayerScoringFormProps = {
  scenarioId: string;
  playerCount: number;
  players: MultiplayerPlayer[];
  action: (formData: FormData) => void | Promise<void>;
};

const FIELD_LABELS: Record<MultiplayerBreakdownField, string> = {
  stars: "Stars points",
  territories: "Territories points",
  resources: "Resources points",
  coins: "Coins points",
  structureBonus: "Structure bonus points",
};

function toNonNegativeInt(value: string): number {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

export function MultiplayerScoringForm({ scenarioId, playerCount, players, action }: MultiplayerScoringFormProps) {
  const [values, setValues] = useState<Record<string, Record<MultiplayerBreakdownField, string>>>(() => {
    return players.reduce<Record<string, Record<MultiplayerBreakdownField, string>>>((acc, player) => {
      acc[player.playerId] = {
        stars: "",
        territories: "",
        resources: "",
        coins: "",
        structureBonus: "",
      };
      return acc;
    }, {});
  });

  const totalsByPlayer = useMemo(() => {
    return players.reduce<Record<string, number>>((acc, player) => {
      const playerValues = values[player.playerId];
      const total = (Object.keys(FIELD_LABELS) as MultiplayerBreakdownField[]).reduce((sum, field) => {
        return sum + toNonNegativeInt(playerValues?.[field] ?? "");
      }, 0);

      acc[player.playerId] = total;
      return acc;
    }, {});
  }, [players, values]);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="scenario_id" value={scenarioId} />
      <input type="hidden" name="player_count" value={String(playerCount)} />

      <p className="rounded-xl border border-border bg-surface-2 p-3 text-sm text-muted">
        Score all players. Enter each category per player and totals will auto-calculate.
      </p>

      <div className="space-y-3">
        {players.map((player) => (
          <div key={player.playerId} className="rounded-xl border border-border bg-surface-2 p-3">
            <div className="flex items-center justify-between gap-3">
              <FactionLabel value={player.displayName} className="text-sm" />
              <span className="text-xs text-muted">
                Stars {player.stars}, Territories {player.territories}, Resources {player.resources}, Coins {player.coins}, Pop {player.popularity}
              </span>
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {(Object.keys(FIELD_LABELS) as MultiplayerBreakdownField[]).map((field) => (
                <label key={`${player.playerId}-${field}`} className="text-sm text-muted">
                  {FIELD_LABELS[field]}
                  <Input
                    className="mt-1"
                    type="number"
                    min={0}
                    step={1}
                    required
                    name={`${field}_${player.playerId}`}
                    value={values[player.playerId]?.[field] ?? ""}
                    onChange={(event) => {
                      setValues((current) => ({
                        ...current,
                        [player.playerId]: {
                          ...current[player.playerId],
                          [field]: event.target.value,
                        },
                      }));
                    }}
                  />
                </label>
              ))}
            </div>

            <div className="mt-3 flex items-center gap-3 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-muted">
              <span>Total</span>
              <span className="font-medium text-foreground">{totalsByPlayer[player.playerId] ?? 0}</span>
            </div>

            <input type="hidden" name={`total_${player.playerId}`} value={String(totalsByPlayer[player.playerId] ?? 0)} />
          </div>
        ))}
      </div>

      <label className="text-sm text-muted">
        Winner
        <select name="winner_id" className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-foreground" defaultValue={players[0]?.playerId}>
          {players.map((player) => (
            <option key={player.playerId} value={player.playerId}>{player.displayName}</option>
          ))}
        </select>
      </label>

      <Button type="submit" className="mt-2">Submit Multiplayer Round</Button>
    </form>
  );
}