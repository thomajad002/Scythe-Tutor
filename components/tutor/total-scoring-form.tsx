"use client";

import { useMemo, useState } from "react";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { Input } from "@/components/ui/input";

type BreakdownField = "stars" | "territories" | "resources" | "coins" | "structureBonus";

type TotalScoringFormProps = {
  scenarioId: string;
  subtypeId: string;
  action: (formData: FormData) => void | Promise<void>;
};

const FIELD_LABELS: Record<BreakdownField, string> = {
  stars: "Stars points",
  territories: "Territories points",
  resources: "Resources points",
  coins: "Coins points",
  structureBonus: "Structure bonus points",
};

function toNonNegativeInt(value: string): number {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

export function TotalScoringForm({ scenarioId, subtypeId, action }: TotalScoringFormProps) {
  const [values, setValues] = useState<Record<BreakdownField, string>>({
    stars: "",
    territories: "",
    resources: "",
    coins: "",
    structureBonus: "",
  });

  const total = useMemo(() => {
    return (Object.keys(values) as BreakdownField[]).reduce((sum, field) => {
      return sum + toNonNegativeInt(values[field]);
    }, 0);
  }, [values]);

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="scenario_id" value={scenarioId} />
      <input type="hidden" name="subtype_id" value={subtypeId} />
      <input type="hidden" name="total" value={String(total)} />

      <p className="rounded-xl border border-border bg-surface-2 p-3 text-sm text-muted">
        Fill in each scoring category. The total updates automatically as you type.
      </p>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {(Object.keys(FIELD_LABELS) as BreakdownField[]).map((field) => (
          <label key={field} className="text-sm text-muted">
            {FIELD_LABELS[field]}
            <Input
              className="mt-1"
              type="number"
              min={0}
              step={1}
              name={field}
              required
              value={values[field]}
              onChange={(event) => {
                setValues((current) => ({
                  ...current,
                  [field]: event.target.value,
                }));
              }}
            />
          </label>
        ))}
      </div>

      <div className="flex items-center gap-3 rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm text-muted">
        <span>Total</span>
        <span className="font-medium text-foreground">{total}</span>
      </div>

      <div className="flex flex-wrap gap-2">
        <FormSubmitButton pendingLabel="Checking answer..." type="submit">Submit Answer</FormSubmitButton>
      </div>
    </form>
  );
}
