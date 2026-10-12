import { Reveal } from "./Reveal";
import { ThreeCanvas } from "./ThreeCanvas";

const STEPS = [
  {
    n: "01",
    name: "See",
    dot: "bg-res-water",
    body: "Hourly meters for electricity, water and waste, with expected bands and statistical outlier detection that flags what a monthly bill hides.",
  },
  {
    n: "02",
    name: "Understand",
    dot: "bg-res-electricity",
    body: "A plain-English root-cause card sits directly above every chart: “Hall A-204 drew 3.4 kW after hours across five evenings.”",
  },
  {
    n: "03",
    name: "Act",
    dot: "bg-sev-amber",
    body: "One click opens a ticket routed to Electrical, Plumbing or Housekeeping, and moves it through a clear open → in progress → resolved flow.",
  },
  {
    n: "04",
    name: "Prove",
    dot: "bg-sev-green",
    body: "Fast-forward a week and the fix is checked against a counterfactual baseline: 67.0 kWh eliminated, ₹535 saved, 48.2 kg CO₂e avoided.",
  },
];

const TAGS = ["Verified", "Measured", "Estimated", "Projected"];

export function LoopSection() {
  return (
    <section id="loop" className="relative scroll-mt-4 overflow-hidden bg-ink py-24 text-surface sm:py-32">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute left-[8%] top-[10%] h-[420px] w-[420px] rounded-pill bg-brand/25 blur-3xl" />
        <div className="absolute bottom-[5%] right-[6%] h-[460px] w-[460px] rounded-pill bg-res-electricity/20 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-content px-6 md:px-page">
        <Reveal className="mx-auto max-w-4xl text-center">
          <p className="text-caption font-semibold uppercase tracking-[0.14em] text-surface/60">
            The closed loop
          </p>
          <h2 className="mt-4 text-[40px] font-semibold leading-[1.04] tracking-[-0.035em] text-surface sm:text-[54px]">
            Most dashboards stop at <span className="text-surface/50">“see”.</span>
            <br />
            CampusPulse closes the loop.
          </h2>
          <p className="mt-6 text-[18px] leading-[1.6] text-surface/70">
            Four steps, one product. Every finding ends in an action, and every
            action ends in proof.
          </p>
        </Reveal>

        <div className="mt-10 grid items-center gap-10 lg:mt-16 lg:grid-cols-[1.1fr_1fr]">
          <Reveal y={0}>
            <ThreeCanvas
              scene="loop"
              label="3D ring showing the four steps See, Understand, Act and Prove with a pulse travelling between them"
              className="h-[420px] sm:h-[560px] lg:h-[640px]"
              fov={30}
            />
          </Reveal>

          <ol className="flex flex-col gap-4">
            {STEPS.map((s, i) => (
              <Reveal key={s.n} delay={i * 0.07}>
                <li className="rounded-card border border-surface/10 bg-surface/[0.05] p-6 backdrop-blur-sm transition-colors hover:bg-surface/[0.09]">
                  <div className="flex items-center gap-3">
                    <span className={`h-2.5 w-2.5 rounded-pill ${s.dot}`} aria-hidden="true" />
                    <span className="text-caption font-semibold tabular-nums text-surface/50">
                      {s.n}
                    </span>
                    <h3 className="text-section text-surface">{s.name}</h3>
                  </div>
                  <p className="mt-2.5 text-body text-surface/70">{s.body}</p>
                </li>
              </Reveal>
            ))}
          </ol>
        </div>

        <Reveal className="mt-14 flex flex-col items-center gap-4 text-center">
          <p className="text-body text-surface/70">
            No number appears without its provenance. Each one carries a tag:
          </p>
          <ul className="flex flex-wrap justify-center gap-2.5">
            {TAGS.map((t) => (
              <li
                key={t}
                className="rounded-pill border border-surface/15 bg-surface/[0.06] px-4 py-1.5 text-caption font-medium text-surface"
              >
                {t}
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}
