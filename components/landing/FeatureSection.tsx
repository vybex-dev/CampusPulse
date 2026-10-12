import Link from "next/link";
import { ArrowUpRight, Check, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import { Reveal } from "./Reveal";
import { ThreeCanvas, type SceneId } from "./ThreeCanvas";

type Accent = "electricity" | "water" | "waste";

const ACCENT = {
  electricity: {
    chip: "bg-res-electricity/10 text-res-electricity",
    stage: "from-res-electricity/10 via-surface to-surface",
    tick: "bg-res-electricity/10 text-res-electricity",
  },
  water: {
    chip: "bg-res-water/10 text-res-water",
    stage: "from-res-water/10 via-surface to-surface",
    tick: "bg-res-water/10 text-res-water",
  },
  waste: {
    chip: "bg-res-waste/15 text-res-waste",
    stage: "from-res-waste/10 via-surface to-surface",
    tick: "bg-res-waste/15 text-res-waste",
  },
} as const;

interface Props {
  id?: string;
  accent: Accent;
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  body: string;
  bullets: string[];
  callout: { value: string; label: string };
  scene: SceneId;
  sceneLabel: string;
  href: string;
  cta: string;
  flip?: boolean;
}

export function FeatureSection({
  id,
  accent,
  icon: Icon,
  eyebrow,
  title,
  body,
  bullets,
  callout,
  scene,
  sceneLabel,
  href,
  cta,
  flip,
}: Props) {
  const a = ACCENT[accent];
  return (
    <section id={id} className="mx-auto max-w-content scroll-mt-24 px-6 py-10 md:px-page md:py-14">
      <div
        className={cn(
          "grid items-center gap-8 overflow-hidden rounded-[32px] border border-hairline bg-surface shadow-card lg:grid-cols-2 lg:gap-0",
        )}
      >
        <div className={cn("p-8 sm:p-12 lg:p-16", flip && "lg:order-2")}>
          <Reveal>
            <span
              className={cn(
                "inline-flex items-center gap-2 rounded-pill px-3.5 py-1.5 text-caption font-semibold",
                a.chip,
              )}
            >
              <Icon className="h-3.5 w-3.5" aria-hidden="true" />
              {eyebrow}
            </span>
            <h3 className="mt-5 text-[34px] font-semibold leading-[1.08] tracking-[-0.03em] text-ink sm:text-[44px]">
              {title}
            </h3>
            <p className="mt-5 text-[17px] leading-[1.6] text-ink-secondary">{body}</p>

            <ul className="mt-7 flex flex-col gap-3.5">
              {bullets.map((b) => (
                <li key={b} className="flex items-start gap-3 text-body text-ink">
                  <span
                    className={cn(
                      "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-pill",
                      a.tick,
                    )}
                  >
                    <Check className="h-3 w-3" strokeWidth={3} aria-hidden="true" />
                  </span>
                  {b}
                </li>
              ))}
            </ul>

            <div className="mt-9 flex flex-wrap items-center gap-x-8 gap-y-4">
              <div>
                <div className="text-[34px] font-semibold leading-none tracking-[-0.03em] text-ink">
                  {callout.value}
                </div>
                <div className="mt-1.5 text-caption text-ink-secondary">{callout.label}</div>
              </div>
              <Link
                href={href}
                className="group inline-flex items-center gap-1.5 text-body font-medium text-brand hover:text-brand-hover"
              >
                {cta}
                <ArrowUpRight
                  className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </Link>
            </div>
          </Reveal>
        </div>

        <div
          className={cn(
            "relative min-h-[380px] bg-gradient-to-br sm:min-h-[480px] lg:h-full lg:min-h-[600px]",
            a.stage,
            flip && "lg:order-1",
          )}
        >
          <ThreeCanvas scene={scene} label={sceneLabel} className="absolute inset-0" fov={40} />
        </div>
      </div>
    </section>
  );
}
