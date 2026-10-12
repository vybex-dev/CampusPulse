"use client";

import { useEffect, useRef, useState } from "react";
import { animate, useReducedMotion } from "framer-motion";
import { Zap, Droplets, Trash2, Gauge } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { TagPill } from "@/components/ui/TagPill";
import { Skeleton } from "@/components/ui/Skeleton";
import type { Summary } from "@/lib/contract";

interface HeadlineCardsProps {
  summary?: Summary;
  loading?: boolean;
}

function CountUp({
  value,
  decimals = 0,
}: {
  value: number;
  decimals?: number;
}) {
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(0);
  const current = useRef(0);

  useEffect(() => {
    if (reduce) {
      current.current = value;
      setShown(value);
      return;
    }
    const controls = animate(current.current, value, {
      duration: 0.8,
      ease: "easeOut",
      onUpdate: (v) => {
        current.current = v;
        setShown(v);
      },
    });
    return () => controls.stop();
  }, [value, reduce]);

  return (
    <>
      {shown.toLocaleString("en-IN", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}
    </>
  );
}

export function HeadlineCards({ summary, loading = false }: HeadlineCardsProps) {
  const wastedInr = summary?.wasted_inr ?? 0;
  const savedInr = summary?.saved_verified_inr ?? 0;
  const co2eAvoided = summary?.co2e_avoided_kg ?? 0;
  const score = summary?.score;
  const rangeDays = summary?.range ?? 7;

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
      {/* 1. Wasted Rupees */}
      <Card className="flex flex-col justify-between">
        <div className="flex items-center justify-between gap-3">
          <span className="text-caption font-medium text-ink-secondary">
            Wasted this {rangeDays === 7 ? "week" : "month"}
          </span>
          <TagPill tag={summary?.tags?.wasted_inr ?? "estimated"} />
        </div>
        <div className="my-4">
          {loading ? (
            <Skeleton className="h-16 w-36" />
          ) : (
            <div className="flex items-baseline gap-1">
              <span className="text-display tabular-nums text-ink">
                ₹<CountUp value={wastedInr} decimals={0} />
              </span>
            </div>
          )}
        </div>
        <div className="text-caption text-ink-tertiary">
          Calculated across unresolved anomalies
        </div>
      </Card>

      {/* 2. Verified Saved Rupees */}
      <Card className="flex flex-col justify-between">
        <div className="flex items-center justify-between gap-3">
          <span className="text-caption font-medium text-ink-secondary">
            Verified savings
          </span>
          <TagPill tag={summary?.tags?.saved_verified_inr ?? "verified"} />
        </div>
        <div className="my-4">
          {loading ? (
            <Skeleton className="h-16 w-36" />
          ) : (
            <div className="flex items-baseline gap-1">
              <span className="text-display tabular-nums text-ink">
                ₹<CountUp value={savedInr} decimals={0} />
              </span>
            </div>
          )}
        </div>
        <div className="text-caption text-ink-tertiary">
          Proved against post-fix baseline models
        </div>
      </Card>

      {/* 3. CO2e Avoided */}
      <Card className="flex flex-col justify-between">
        <div className="flex items-center justify-between gap-3">
          <span className="text-caption font-medium text-ink-secondary">
            CO2e avoided
          </span>
          <TagPill tag={summary?.tags?.co2e_avoided_kg ?? "verified"} />
        </div>
        <div className="my-4">
          {loading ? (
            <Skeleton className="h-16 w-40" />
          ) : (
            <div className="flex items-baseline gap-2">
              <span className="text-display tabular-nums text-ink">
                <CountUp value={co2eAvoided} decimals={1} />
              </span>
              <span className="text-body font-medium text-ink-secondary">
                kg CO2e
              </span>
            </div>
          )}
        </div>
        <div className="text-caption text-ink-tertiary">
          Avoided through resolved action tickets
        </div>
      </Card>

      {/* 4. Campus Impact Score Gauge */}
      <Card className="flex flex-col justify-between">
        <div className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-1.5 text-caption font-medium text-ink-secondary">
            <Gauge className="h-3.5 w-3.5" aria-hidden="true" />
            Impact Score
          </span>
          <TagPill tag="measured" />
        </div>
        <div className="my-4">
          {loading ? (
            <Skeleton className="h-16 w-32" />
          ) : (
            <div className="flex items-baseline gap-2">
              <span className="text-display tabular-nums text-ink">
                <CountUp value={score?.total ?? 84} decimals={1} />
              </span>
              <span className="text-body text-ink-secondary">/ 100</span>
            </div>
          )}
        </div>
        {/* Component score indicators */}
        <div className="flex items-center gap-2 pt-1">
          <span
            title="Electricity Score (S_E = 100*(1-min(1, a_E / 0.10)))"
            className="inline-flex items-center gap-1 rounded-pill bg-canvas px-2 py-0.5 text-caption font-medium text-ink"
          >
            <Zap className="h-3 w-3 text-res-electricity" aria-hidden="true" />
            {loading ? "..." : (score?.electricity ?? 0).toFixed(0)}
          </span>
          <span
            title="Water Score (S_W = 100*(1-min(1, a_W / 0.20)))"
            className="inline-flex items-center gap-1 rounded-pill bg-canvas px-2 py-0.5 text-caption font-medium text-ink"
          >
            <Droplets className="h-3 w-3 text-res-water" aria-hidden="true" />
            {loading ? "..." : (score?.water ?? 0).toFixed(0)}
          </span>
          <span
            title="Waste Segregation Accuracy (S_Waste = A %)"
            className="inline-flex items-center gap-1 rounded-pill bg-canvas px-2 py-0.5 text-caption font-medium text-ink"
          >
            <Trash2 className="h-3 w-3 text-res-waste" aria-hidden="true" />
            {loading ? "..." : (score?.waste ?? 0).toFixed(0)}%
          </span>
        </div>
      </Card>
    </div>
  );
}
