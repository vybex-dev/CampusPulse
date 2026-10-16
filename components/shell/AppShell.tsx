"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity } from "lucide-react";
import type { ReactNode } from "react";
import { LANDING } from "@/lib/nav";
import { useUIStore } from "@/lib/store";
import { AppFooter } from "./AppFooter";
import { DemoControlStrip } from "./DemoControlStrip";
import { RoleSwitcher } from "./RoleSwitcher";
import { SampleModeBanner } from "./SampleModeBanner";
import { Sidebar } from "./Sidebar";
import { SimClock } from "./SimClock";
import { SimulatedBadge } from "./SimulatedBadge";

function Header() {
  const role = useUIStore((s) => s.role);

  return (
    <header className="fixed inset-x-0 top-0 z-40 grid h-14 grid-cols-[1fr_auto_1fr] items-center border-b border-hairline bg-surface/80 px-6 backdrop-blur-xl">
      <Link
        href={LANDING[role]}
        aria-label="CampusPulse home"
        className="flex items-center gap-2 justify-self-start rounded-control"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-control bg-ink text-surface">
          <Activity className="h-4 w-4" aria-hidden="true" />
        </span>
        <span className="text-body font-semibold tracking-tight">
          CampusPulse
        </span>
      </Link>
      <RoleSwitcher />
      <div className="flex items-center gap-3 justify-self-end">
        <SimClock />
        <SimulatedBadge />
      </div>
    </header>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const onWasteLab = pathname.startsWith("/waste");

  return (
    <div className="min-h-screen bg-canvas">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[70] focus:rounded-control focus:bg-surface focus:px-4 focus:py-2 focus:shadow-card"
      >
        Skip to content
      </a>
      <Header />
      <Sidebar />
      <main id="main" className="min-w-0 pl-60 pt-14">
        <div className="mx-auto w-full max-w-content px-page py-page">
          <div className="mb-8 flex flex-col gap-4 empty:hidden">
            <DemoControlStrip />
            {onWasteLab && <SampleModeBanner />}
          </div>
          {children}
        </div>
        <AppFooter />
      </main>
    </div>
  );
}
