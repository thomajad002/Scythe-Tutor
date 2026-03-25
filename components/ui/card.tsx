import type { HTMLAttributes, PropsWithChildren } from "react";
import { cn } from "@/lib/utils/cn";

type CardProps = PropsWithChildren<HTMLAttributes<HTMLDivElement>>;

export function Card({ children, className, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border/90 bg-surface-1/90 p-6 shadow-[0_20px_50px_rgba(0,0,0,0.3)] backdrop-blur-sm",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
