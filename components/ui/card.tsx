import type { HTMLAttributes, PropsWithChildren } from "react";
import { cn } from "@/lib/utils/cn";

type CardProps = PropsWithChildren<HTMLAttributes<HTMLDivElement>>;

export function Card({ children, className, ...props }: CardProps) {
  return (
    <div className={cn("rounded-2xl border border-border bg-surface-1 p-6", className)} {...props}>
      {children}
    </div>
  );
}
