import Link from "next/link";
import { ArrowRight, Play } from "lucide-react";
import { Reveal } from "./Reveal";
import { ThreeCanvas } from "./ThreeCanvas";

const STATS = [
  { value: "30 days", label: "of hourly telemetry per meter" },
  { value: "42,480", label: "readings analysed in the demo" },
  { value: "7", label: "waste categories classified" },
  { value: "< 50 ms", label: "AI provider failover" },
];

export function Hero() {
  return (
    <section className="relative overflow-hidden pt-28 sm:pt-32">
      {/* Atmosphere */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute -left-40 top-10 h-[520px] w-[520px] rounded-pill bg-brand/10 blur-3xl" />
        <div className="absolute -right-32 top-40 h-[560px] w-[560px] rounded-pill bg-res-water/10 blur-3xl" />
        <div className="absolute left-1/3 top-[420px] h-[360px] w-[360px] rounded-pill bg-res-electricity/10 blur-3xl" />
      </div>

      <div className="relative mx-auto grid max-w-content items-center gap-6 px-6 md:px-page lg:grid-cols-[1.02fr_1fr]">
        <div className="pb-4 lg:pb-24">
          <Reveal>
            <span className="inline-flex items-center gap-2 rounded-pill border border-hairline bg-surface/80 px-3.5 py-1.5 text-caption font-medium text-ink-secondary shadow-card backdrop-blur">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-pill bg-brand opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-pill bg-brand" />
              </span>
              Kaushal 8.0 · Sustainable Tech
            </span>
          </Reveal>

          <Reveal delay={0.08}>
            <h1 className="mt-6 text-[44px] font-semibold leading-[1.02] tracking-[-0.035em] text-ink sm:text-[60px] lg:text-[76px]">
              See the waste.
              <br />
              <span className="bg-gradient-to-r from-brand via-res-water to-res-electricity bg-clip-text text-transparent">
                Prove the savings.
              </span>
            </h1>
          </Reveal>

          <Reveal delay={0.16}>
            <p className="mt-6 max-w-xl text-[19px] leading-[1.55] text-ink-secondary">
              CampusPulse finds where a university quietly wastes electricity,
              water and waste, explains the root cause in plain English,
              dispatches the fix, and proves what it saved.
            </p>
          </Reveal>

          <Reveal delay={0.24}>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Link
                href="/dashboard"
                className="group inline-flex items-center gap-2 rounded-pill bg-brand px-7 py-3.5 text-[16px] font-medium text-surface shadow-card transition-colors hover:bg-brand-hover"
              >
                Explore the live demo
                <ArrowRight
                  className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </Link>
              <a
                href="#loop"
                className="inline-flex items-center gap-2 rounded-pill border border-hairline bg-surface px-6 py-3.5 text-[16px] font-medium text-ink transition-colors hover:bg-canvas"
              >
                <Play className="h-4 w-4" aria-hidden="true" />
                How it works
              </a>
            </div>
            <p className="mt-5 text-caption text-ink-tertiary">
              No IoT hardware · Runs offline · Every number tagged Verified,
              Estimated, Projected or Measured
            </p>
          </Reveal>
        </div>

        <Reveal delay={0.1} y={0} className="relative">
          <ThreeCanvas
            scene="campus"
            label="Interactive 3D model of a campus with an after-hours electricity anomaly flagged on one building"
            className="-mx-6 h-[400px] sm:h-[500px] lg:mx-0 lg:h-[680px] [mask-image:radial-gradient(ellipse_72%_70%_at_50%_52%,#000_62%,transparent_100%)]"
            fov={36}
          />
        </Reveal>
      </div>

      {/* Proof strip */}
      <div className="relative mx-auto max-w-content px-6 pb-16 md:px-page">
        <Reveal>
          <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-card border border-hairline bg-ink/[0.06] shadow-card md:grid-cols-4">
            {STATS.map((s) => (
              <div key={s.label} className="flex flex-col bg-surface px-6 py-7">
                <dt className="order-2 mt-1 text-caption text-ink-secondary">{s.label}</dt>
                <dd className="text-[34px] font-semibold leading-none tracking-[-0.03em] text-ink">
                  {s.value}
                </dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 text-center text-caption text-ink-tertiary">
            Demo campus is fictional. All telemetry is deterministic simulated data.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
