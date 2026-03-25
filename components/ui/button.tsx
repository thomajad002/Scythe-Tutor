import type { ButtonHTMLAttributes, PropsWithChildren } from "react";
import { cn } from "@/lib/utils/cn";

type Variant = "primary" | "secondary" | "danger";

type ButtonProps = PropsWithChildren<
  ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: Variant;
    fullWidth?: boolean;
  }
>;

const variantClasses: Record<Variant, string> = {
  primary: "border border-amber-300/30 bg-accent text-[#1f1508] hover:bg-accent-strong",
  secondary: "border border-border bg-surface-2 text-foreground hover:bg-surface-3",
  danger: "border border-rose-300/30 bg-rose-700 text-rose-50 hover:bg-rose-600",
};

export function Button({ children, className, variant = "primary", fullWidth, ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "rounded-xl px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50",
        variantClasses[variant],
        fullWidth && "w-full",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
