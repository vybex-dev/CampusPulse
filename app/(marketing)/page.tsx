import type { Metadata } from "next";
import { Droplets, Trash2, Zap } from "lucide-react";
import { LandingNav } from "@/components/landing/LandingNav";
import { Hero } from "@/components/landing/Hero";
import { FeatureSection } from "@/components/landing/FeatureSection";
import { LoopSection } from "@/components/landing/LoopSection";
import { Platform } from "@/components/landing/Platform";
import { Cta, LandingFooter } from "@/components/landing/CtaFooter";
import { Reveal } from "@/components/landing/Reveal";

export const metadata: Metadata = {
  title: { absolute: "CampusPulse · See the waste. Prove the savings." },
  description:
    "CampusPulse finds where a university wastes electricity, water and waste, explains the root cause, dispatches the fix and proves the savings.",
};

export default function LandingPage() {
  return (
    <div className="bg-canvas">
      <a
        href="#features"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[70] focus:rounded-control focus:bg-surface focus:px-4 focus:py-2 focus:shadow-card"
      >
        Skip to content
      </a>
      <LandingNav />
      <main>
        <Hero />

        <div id="features" className="scroll-mt-4 pt-10">
          <Reveal className="mx-auto max-w-3xl px-6 text-center">
            <p className="text-caption font-semibold uppercase tracking-[0.14em] text-brand">
              Three resources
            </p>
            <h2 className="mt-4 text-[38px] font-semibold leading-[1.05] tracking-[-0.035em] text-ink sm:text-[56px]">
              Every kilowatt, litre and kilo, in one loop.
            </h2>
          </Reveal>

          <FeatureSection
            accent="electricity"
            icon={Zap}
            eyebrow="Electricity"
            title="Find the room that never switches off."
            body="Hourly meters and statistical outlier detection catch what a monthly bill hides, like Hall A-204 drawing 3.4 kW between 7 and 11 PM, five evenings running."
            bullets={[
              "Expected bands versus actual load, per room and floor",
              "A plain-English explanation sits right above the chart",
              "One click turns the finding into a ticket",
            ]}
            callout={{ value: "67 kWh", label: "verified savings from one fixed schedule" }}
            scene="electricity"
            sceneLabel="3D cutaway of a five-floor building next to a 24-hour bar chart; one room glows red after hours"
            href="/electricity"
            cta="Open Electricity"
          />

          <FeatureSection
            flip
            accent="water"
            icon={Droplets}
            eyebrow="Water"
            title="Hear the leak at 3 AM."
            body="Between 2 and 4 AM flow should fall to a 120 L/h baseline. Boys Hostel 1 never drops below 920 L/h: an 800 L/h leak draining 19,200 litres a day."
            bullets={[
              "Tank levels and flow, side by side",
              "Per-capita use: 153 L per resident against a 120 L target",
              "Leak cost in rupees, so it gets fixed first",
            ]}
            callout={{ value: "₹384 / day", label: "lost to a single hostel pipe" }}
            scene="water"
            sceneLabel="3D water tank with a rippling surface beside a leaking pipe dripping onto the floor"
            href="/water"
            cta="Open Water"
          />

          <FeatureSection
            accent="waste"
            icon={Trash2}
            eyebrow="Waste Lab"
            title="Sort it right, at the bin."
            body="Point a camera at any item. A vision model names the category, picks the bin and explains why, then awards points to keep students sorting."
            bullets={[
              "7 categories aligned to Indian municipal waste guidelines",
              "Groq to Gemini to offline samples, with sub-50 ms failover",
              "Mess leaderboard: 46% segregation against a 76% peer average",
            ]}
            callout={{ value: "60 kg / week", label: "of misrouted wet waste isolated" }}
            scene="waste"
            sceneLabel="3D scanner ring classifying items and dropping them into four colour-coded bins"
            href="/waste"
            cta="Open Waste Lab"
          />
        </div>

        <LoopSection />
        <Platform />
        <Cta />
      </main>
      <LandingFooter />
    </div>
  );
}
