import Link from "next/link";
import { Activity, ArrowRight } from "lucide-react";
import { PoweredByVybex } from "@/components/ui/PoweredByVybex";
import { Reveal } from "./Reveal";

const SCREENS = [
  { href: "/dashboard", label: "Command Center" },
  { href: "/electricity", label: "Electricity" },
  { href: "/water", label: "Water" },
  { href: "/waste", label: "Waste Lab" },
  { href: "/tickets", label: "Action Queue" },
  { href: "/simulator", label: "What-If Simulator" },
  { href: "/report", label: "Impact Report" },
];

export function Cta() {
  return (
    <section className="mx-auto max-w-content px-6 pb-24 md:px-page">
      <Reveal>
        <div className="relative overflow-hidden rounded-[32px] border border-hairline bg-surface px-8 py-16 text-center shadow-card sm:py-24">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0">
            <div className="absolute -left-24 -top-24 h-80 w-80 rounded-pill bg-brand/15 blur-3xl" />
            <div className="absolute -bottom-24 -right-24 h-80 w-80 rounded-pill bg-res-water/15 blur-3xl" />
          </div>
          <div className="relative">
            <h2 className="mx-auto max-w-3xl text-[38px] font-semibold leading-[1.05] tracking-[-0.035em] text-ink sm:text-[60px]">
              Don’t take our word for it.
              <br />
              <span className="text-ink-secondary">Watch it prove itself.</span>
            </h2>
            <p className="mx-auto mt-6 max-w-xl text-[18px] leading-[1.6] text-ink-secondary">
              Open the demo, create a ticket for Hall A-204, fast-forward seven
              days and see the savings verified.
            </p>
            <Link
              href="/dashboard"
              className="group mt-9 inline-flex items-center gap-2 rounded-pill bg-brand px-8 py-4 text-[16px] font-medium text-surface shadow-card transition-colors hover:bg-brand-hover"
            >
              Open the demo
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

export function LandingFooter() {
  return (
    <footer className="border-t border-hairline bg-surface">
      <div className="mx-auto grid max-w-content gap-10 px-6 py-14 md:grid-cols-[1.4fr_1fr] md:px-page">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-control bg-ink text-surface">
              <Activity className="h-4 w-4" aria-hidden="true" />
            </span>
            <span className="text-body font-semibold tracking-tight">CampusPulse</span>
          </div>
          <p className="mt-4 max-w-md text-body text-ink-secondary">
            See the waste, understand the cause, act on the ticket, prove the
            savings. Built for Kaushal 8.0, PS-04 Sustainable Tech.
          </p>
        </div>
        <nav aria-label="Product screens">
          <h3 className="text-caption font-semibold uppercase tracking-[0.12em] text-ink-tertiary">
            Explore
          </h3>
          <ul className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2.5">
            {SCREENS.map((s) => (
              <li key={s.href}>
                <Link href={s.href} className="text-body text-ink-secondary transition-colors hover:text-ink">
                  {s.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      <div className="border-t border-hairline">
        <div className="mx-auto flex max-w-content flex-col gap-3 px-6 py-5 text-caption text-ink-tertiary md:flex-row md:items-center md:justify-between md:px-page">
          <div className="flex flex-col gap-1">
            <p>
              © {new Date().getFullYear()} CampusPulse.
              Released under the{" "}
              <a
                href="https://opensource.org/license/mit"
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2 transition-colors hover:text-ink-secondary"
              >
                MIT License
              </a>
              .
            </p>
            <p>
              The demo campus is fictional. All telemetry shown is deterministic simulated data.
              Product and company names mentioned remain the property of their respective owners.
            </p>
          </div>
          <PoweredByVybex />
        </div>
      </div>
    </footer>
  );
}
