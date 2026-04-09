"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import type { NavItem } from "@/lib/navigation";

type AppHeaderProps = {
  brandLabel: string;
  brandHref: string;
  navItems: NavItem[];
};

function isActivePath(currentPath: string, href: string) {
  if (href === "/") {
    return currentPath === "/";
  }

  return currentPath === href || currentPath.startsWith(`${href}/`);
}

export function AppHeader({ brandLabel, brandHref, navItems }: AppHeaderProps) {
  const pathname = usePathname();

  return (
    <header className="w-full border-b border-border/70 bg-navy/95 backdrop-blur-sm">
      <div className="mx-auto flex h-20 w-full max-w-7xl items-center px-6 sm:px-10">
        <Link href={brandHref} className="font-serif text-xl font-bold tracking-[0.1em] text-accent-strong sm:text-2xl">
          {brandLabel}
        </Link>

        <nav aria-label="Primary" className="flex flex-1 items-center justify-end gap-1.5 sm:gap-2">
          {navItems.map((item) => {
            const active = isActivePath(pathname, item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "rounded-lg px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-accent text-[#24190a]"
                    : "text-muted hover:bg-surface-2 hover:text-foreground",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
