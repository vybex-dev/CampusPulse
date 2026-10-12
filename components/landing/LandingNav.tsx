"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Activity, ArrowRight } from "lucide-react";
import { cn } from "@/lib/cn";

const LINKS = [
  { href: "#features", label: "Features" },
  { href: "#loop", label: "How it works" },
  { href: "#platform", label: "Platform" },
  { href: "#roles", label: "Roles" },
];

export function LandingNav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-4 pt-4">
      <nav
        aria-label="Primary"
        className={cn(
          "mx-auto flex h-14 max-w-content items-center justify-between rounded-pill border px-3 pl-5 transition-all duration-300",
          scrolled
            ? "border-hairline bg-surface/80 shadow-card backdrop-blur-xl"
            : "border-transparent bg-transparent",
        )}
      >
        <Link href="/" className="flex items-center gap-2 rounded-control" aria-label="CampusPulse home">
          <span className="flex h-8 w-8 items-center justify-center rounded-control bg-ink text-surface">
            <Activity className="h-4 w-4" aria-hidden="true" />
          </span>
          <span className="text-body font-semibold tracking-tight">CampusPulse</span>
        </Link>

        <ul className="hidden items-center gap-1 md:flex">
          {LINKS.map((l) => (
            <li key={l.href}>
              <a
                href={l.href}
                className="rounded-pill px-4 py-2 text-body text-ink-secondary transition-colors hover:bg-ink/5 hover:text-ink"
              >
                {l.label}
              </a>
            </li>
          ))}
        </ul>

        <Link
          href="/dashboard"
          className="group inline-flex h-10 items-center gap-2 rounded-pill bg-brand px-5 text-body font-medium text-surface transition-colors hover:bg-brand-hover"
        >
          Open the demo
          <ArrowRight
            className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
            aria-hidden="true"
          />
        </Link>
      </nav>
    </header>
  );
}
