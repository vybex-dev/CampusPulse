"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Droplets,
  FileText,
  LayoutDashboard,
  Recycle,
  SlidersHorizontal,
  Ticket,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { isActive, navFor, type NavIcon } from "@/lib/nav";
import { useUIStore } from "@/lib/store";

const ICONS: Record<NavIcon, LucideIcon> = {
  dashboard: LayoutDashboard,
  electricity: Zap,
  water: Droplets,
  waste: Recycle,
  tickets: Ticket,
  simulator: SlidersHorizontal,
  report: FileText,
};

export function Sidebar() {
  const role = useUIStore((s) => s.role);
  const pathname = usePathname();

  return (
    <aside className="fixed bottom-0 left-0 top-14 z-30 flex w-60 flex-col justify-between border-r border-hairline bg-canvas px-4 py-6">
      <nav aria-label="Primary">
        <ul className="flex flex-col gap-1">
          {navFor(role).map((item) => {
            const active = isActive(pathname, item.href);
            const Icon = ICONS[item.icon];
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex h-10 items-center gap-3 rounded-control px-3 text-body transition-colors duration-200",
                    active
                      ? "bg-brand-tint font-medium text-ink"
                      : "text-ink-secondary hover:bg-ink/5 hover:text-ink",
                  )}
                >
                  <Icon
                    className={cn(
                      "h-5 w-5",
                      active ? "text-brand" : "text-ink-secondary",
                    )}
                    aria-hidden="true"
                  />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <Link
        href="/design"
        className="px-3 text-caption text-ink-secondary transition-colors duration-200 hover:text-brand"
      >
        Design system
      </Link>
    </aside>
  );
}
