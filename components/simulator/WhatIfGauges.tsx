"use client";

import { Card } from "@/components/ui/Card";
import { TagPill } from "@/components/ui/TagPill";
import { Zap, Droplets, Recycle, ArrowUpRight } from "lucide-react";

interface ScoreBreakdown {
  total: number;
  electricity: number;
  water: number;
  waste: number;
}

interface WhatIfGaugesProps {
  current: ScoreBreakdown;
  projected: ScoreBreakdown;
}

export function WhatIfGauges({ current, projected }: WhatIfGaugesProps) {
  const deltaTotal = Number((projected.total - current.total).toFixed(1));
  const deltaE = Number((projected.electricity - current.electricity).toFixed(1));
  const deltaW = Number((projected.water - current.water).toFixed(1));
  const deltaWaste = Number((projected.waste - current.waste).toFixed(1));

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* 1. Current Score Card */}
      <Card className="flex flex-col justify-between border-hairline bg-surface p-card">
        <div>
          <div className="flex items-center justify-between">
            <span className="text-caption font-medium uppercase tracking-wider text-ink-secondary">
              Current Baseline
            </span>
            <TagPill tag="estimated" />
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-display font-semibold tracking-tight text-ink tabular-nums">
              {current.total.toFixed(1)}
            </span>
            <span className="text-body text-ink-secondary">/ 100</span>
          </div>
          <p className="mt-1 text-caption text-ink-secondary">
            Based on verified campus data over trailing 7 days
          </p>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-3 border-t border-hairline pt-4">
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5 text-caption text-ink-secondary">
              <Zap className="h-3.5 w-3.5 text-res-electricity" />
              <span>Electricity</span>
            </div>
            <span className="mt-1 text-section font-semibold text-ink tabular-nums">
              {current.electricity.toFixed(1)}
            </span>
          </div>

          <div className="flex flex-col">
            <div className="flex items-center gap-1.5 text-caption text-ink-secondary">
              <Droplets className="h-3.5 w-3.5 text-res-water" />
              <span>Water</span>
            </div>
            <span className="mt-1 text-section font-semibold text-ink tabular-nums">
              {current.water.toFixed(1)}
            </span>
          </div>

          <div className="flex flex-col">
            <div className="flex items-center gap-1.5 text-caption text-ink-secondary">
              <Recycle className="h-3.5 w-3.5 text-res-waste" />
              <span>Waste</span>
            </div>
            <span className="mt-1 text-section font-semibold text-ink tabular-nums">
              {current.waste.toFixed(1)}
            </span>
          </div>
        </div>
      </Card>

      {/* 2. Projected Score Card */}
      <Card className="flex flex-col justify-between border-brand/20 bg-brand-tint/30 p-card">
        <div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-caption font-semibold uppercase tracking-wider text-brand">
                Projected Impact Score
              </span>
              {deltaTotal > 0 && (
                <span className="inline-flex items-center gap-0.5 rounded-pill bg-brand px-2 py-0.5 text-caption font-semibold text-surface">
                  <ArrowUpRight className="h-3 w-3" />+{deltaTotal} pts
                </span>
              )}
            </div>
            <TagPill tag="projected" />
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-display font-semibold tracking-tight text-ink tabular-nums">
              {projected.total.toFixed(1)}
            </span>
            <span className="text-body text-ink-secondary">/ 100</span>
          </div>
          <p className="mt-1 text-caption text-ink-secondary">
            Projected score after modeled fixes and thermostat shifts
          </p>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-3 border-t border-hairline pt-4">
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5 text-caption text-ink-secondary">
              <Zap className="h-3.5 w-3.5 text-res-electricity" />
              <span>Electricity</span>
            </div>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-section font-semibold text-ink tabular-nums">
                {projected.electricity.toFixed(1)}
              </span>
              {deltaE > 0 && (
                <span className="text-caption font-medium text-brand">
                  +{deltaE}
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-col">
            <div className="flex items-center gap-1.5 text-caption text-ink-secondary">
              <Droplets className="h-3.5 w-3.5 text-res-water" />
              <span>Water</span>
            </div>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-section font-semibold text-ink tabular-nums">
                {projected.water.toFixed(1)}
              </span>
              {deltaW > 0 && (
                <span className="text-caption font-medium text-brand">
                  +{deltaW}
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-col">
            <div className="flex items-center gap-1.5 text-caption text-ink-secondary">
              <Recycle className="h-3.5 w-3.5 text-res-waste" />
              <span>Waste</span>
            </div>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-section font-semibold text-ink tabular-nums">
                {projected.waste.toFixed(1)}
              </span>
              {deltaWaste > 0 && (
                <span className="text-caption font-medium text-brand">
                  +{deltaWaste}
                </span>
              )}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
