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
    <header className="border-b border-border bg-navy">
      <div className="mx-auto flex h-20 w-full max-w-7xl items-center px-6 sm:px-10">
        <Link href={brandHref} className="text-xl font-bold tracking-tight sm:text-2xl">
          {brandLabel}
        </Link>

        <nav aria-label="Primary" className="flex flex-1 items-center justify-end gap-2">
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
                    ? "bg-surface-2 text-foreground"
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
