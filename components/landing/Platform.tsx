import Link from "next/link";
import {
  ArrowUpRight,
  BadgeCheck,
  FileText,
  LayoutDashboard,
  ListChecks,
  Shield,
  SlidersHorizontal,
  Trash2,
  Users,
  WifiOff,
} from "lucide-react";
import { Reveal } from "./Reveal";

const BENTO = [
  {
    icon: ListChecks,
    title: "Action Queue",
    body: "Findings become tickets in one click, routed to the right team and tracked to verification.",
    span: "md:col-span-2",
  },
  {
    icon: SlidersHorizontal,
    title: "What-If Simulator",
    body: "Raise campus AC by 1°C and watch monthly savings and the campus score recalculate live.",
    stat: "₹18,400 / month",
    statLabel: "projected for +1°C",
    span: "md:col-span-2",
  },
  {
    icon: FileText,
    title: "Impact Report",
    body: "A board-ready summary where every figure shows its unit and its tag. One click prints a clean PDF.",
    span: "",
  },
  {
    icon: BadgeCheck,
    title: "Honest numbers",
    body: "Verified, Measured, Estimated or Projected: you always know how much to trust a figure.",
    span: "",
  },
  {
    icon: WifiOff,
    title: "Offline-first",
    body: "No keys, no network, no problem. Telemetry is local and the Waste Lab falls back to prepared samples.",
    span: "md:col-span-2",
  },
];

const ROLES = [
  {
    icon: LayoutDashboard,
    role: "Admin",
    title: "Command Center",
    body: "Campus score, avoidable waste, a live map and the top wasters, all in one view.",
    href: "/dashboard",
  },
  {
    icon: Shield,
    role: "Staff",
    title: "Action Queue",
    body: "Open the ticket, fix the fault, add a resolution note, and let the data verify it.",
    href: "/tickets",
  },
  {
    icon: Trash2,
    role: "Student",
    title: "Waste Lab",
    body: "Scan an item, learn the right bin, earn points and climb the leaderboard.",
    href: "/waste",
  },
];

export function Platform() {
  return (
    <>
      <section id="platform" className="mx-auto max-w-content scroll-mt-24 px-6 py-24 md:px-page">
        <Reveal className="max-w-2xl">
          <p className="text-caption font-semibold uppercase tracking-[0.14em] text-brand">
            The platform
          </p>
          <h2 className="mt-4 text-[36px] font-semibold leading-[1.06] tracking-[-0.03em] text-ink sm:text-[52px]">
            Everything an estates team needs, nothing it doesn’t.
          </h2>
        </Reveal>

        <div className="mt-12 grid gap-4 md:grid-cols-4">
          {BENTO.map((b, i) => (
            <Reveal key={b.title} delay={i * 0.05} className={b.span || "md:col-span-1"}>
              <article className="flex h-full min-h-[240px] flex-col justify-between rounded-card border border-hairline bg-surface p-8 shadow-card transition-transform duration-300 hover:-translate-y-1">
                <div>
                  <span className="flex h-11 w-11 items-center justify-center rounded-control bg-ink text-surface">
                    <b.icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <h3 className="mt-6 text-section text-ink">{b.title}</h3>
                  <p className="mt-2 text-body text-ink-secondary">{b.body}</p>
                </div>
                {"stat" in b && b.stat && (
                  <div className="mt-6">
                    <div className="text-[28px] font-semibold leading-none tracking-[-0.03em] text-ink">
                      {b.stat}
                    </div>
                    <div className="mt-1 text-caption text-ink-secondary">{b.statLabel}</div>
                  </div>
                )}
              </article>
            </Reveal>
          ))}
        </div>
      </section>

      <section id="roles" className="mx-auto max-w-content scroll-mt-24 px-6 pb-24 md:px-page">
        <Reveal className="mx-auto max-w-2xl text-center">
          <Users className="mx-auto h-6 w-6 text-ink-secondary" aria-hidden="true" />
          <h2 className="mt-4 text-[36px] font-semibold leading-[1.06] tracking-[-0.03em] text-ink sm:text-[48px]">
            One campus. Three ways in.
          </h2>
          <p className="mt-4 text-[17px] text-ink-secondary">
            Switch roles from the top bar and the product reshapes itself around the job.
          </p>
        </Reveal>

        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {ROLES.map((r, i) => (
            <Reveal key={r.role} delay={i * 0.07}>
              <Link
                href={r.href}
                className="group flex h-full flex-col rounded-card border border-hairline bg-surface p-8 shadow-card transition-all duration-300 hover:-translate-y-1 hover:border-brand/40"
              >
                <div className="flex items-center justify-between">
                  <span className="rounded-pill bg-brand-tint px-3 py-1 text-caption font-semibold text-brand">
                    {r.role}
                  </span>
                  <ArrowUpRight
                    className="h-5 w-5 text-ink-tertiary transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-brand"
                    aria-hidden="true"
                  />
                </div>
                <r.icon className="mt-8 h-7 w-7 text-ink" aria-hidden="true" />
                <h3 className="mt-4 text-section text-ink">{r.title}</h3>
                <p className="mt-2 text-body text-ink-secondary">{r.body}</p>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>
    </>
  );
}
