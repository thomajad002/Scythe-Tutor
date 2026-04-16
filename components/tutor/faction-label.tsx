import type { CSSProperties, HTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

export type FactionId = "nordic" | "rusviet" | "saxony" | "crimea" | "polania";

function normalizeFaction(value: string): string {
  return value.trim().toLowerCase();
}

export function parseFactionId(value: string): FactionId | null {
  const normalized = normalizeFaction(value);

  if (normalized === "nordic" || normalized.startsWith("nordic ")) {
    return "nordic";
  }

  if (normalized === "rusviet" || normalized.startsWith("rusviet ")) {
    return "rusviet";
  }

  if (normalized === "saxony" || normalized.startsWith("saxony ")) {
    return "saxony";
  }

  if (normalized === "crimea" || normalized.startsWith("crimea ")) {
    return "crimea";
  }

  if (normalized === "polania" || normalized.startsWith("polania ")) {
    return "polania";
  }

  return null;
}

export function formatFactionLabel(value: string): string {
  const faction = parseFactionId(value);
  if (faction) {
    return faction.toUpperCase();
  }

  return value.replace(/\s*\(\d+\)\s*$/, "").toUpperCase();
}

export function getFactionLabelStyle(value: string): CSSProperties {
  const faction = parseFactionId(value);

  switch (faction) {
    case "nordic":
      return { color: "#7dafff" };
    case "rusviet":
      return { color: "#ea6b5a" };
    case "crimea":
      return { color: "#e9c65d" };
    case "polania":
      return {
        color: "#f3f5f7",
        textShadow: "0 0 2px rgba(0,0,0,0.65)",
      };
    case "saxony":
      return {
        color: "#0e0f10",
        fontWeight: 700,
        WebkitTextStroke: "0.45px #c8a64a",
        textShadow: "0 0 1px rgba(200,166,74,0.45)",
      };
    default:
      return { color: "#d5d8dc" };
  }
}

type FactionLabelProps = {
  value: string;
} & Omit<HTMLAttributes<HTMLSpanElement>, "children">;

export function FactionLabel({ value, className, style, ...props }: FactionLabelProps) {
  return (
    <span
      className={cn("font-semibold uppercase tracking-[0.08em]", className)}
      style={{
        ...getFactionLabelStyle(value),
        ...style,
      }}
      {...props}
    >
      {formatFactionLabel(value)}
    </span>
  );
}
