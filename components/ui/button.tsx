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
  primary: "bg-accent text-foreground hover:bg-accent-strong",
  secondary: "border border-border bg-surface-2 text-foreground hover:bg-surface-3",
  danger: "bg-rose-600 text-white hover:bg-rose-500",
};

export function Button({ children, className, variant = "primary", fullWidth, ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "rounded-xl px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60",
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
