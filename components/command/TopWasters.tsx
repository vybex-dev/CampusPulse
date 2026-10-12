"use client";

import Link from "next/link";
import { Zap, Droplets, Trash2, ArrowRight, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { TagPill } from "@/components/ui/TagPill";
import { Skeleton } from "@/components/ui/Skeleton";
import type { TopWaster } from "@/lib/contract";
import { cn } from "@/lib/cn";

interface TopWastersProps {
  wasters?: TopWaster[];
  loading?: boolean;
}

export function TopWasters({ wasters = [], loading = false }: TopWastersProps) {
  return (
    <Card className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-section text-ink">Top Waste Locations</h2>
          <p className="text-body text-ink-secondary">
            Facilities contributing the largest avoidable cost or volume.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col gap-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="flex items-center justify-between rounded-control border border-hairline p-3"
            >
              <div className="flex items-center gap-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <Skeleton className="h-4 w-36" />
              </div>
              <Skeleton className="h-6 w-24" />
            </div>
          ))}
        </div>
      ) : wasters.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sev-green/10 text-sev-green">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <p className="text-body font-medium text-ink">No significant waste detected</p>
          <p className="text-caption text-ink-secondary">All monitored zones are currently running within expected baseline limits.</p>
        </div>
      ) : (
        <div className="flex flex-col divide-y divide-hairline">
          {wasters.map((w, idx) => {
            const Icon =
              w.resource === "electricity"
                ? Zap
                : w.resource === "water"
                  ? Droplets
                  : Trash2;

            const linkHref =
              w.resource === "electricity"
                ? `/electricity?meter=E-${w.location_code}`
                : w.resource === "water"
                  ? `/water?block=${w.location_code}`
                  : "/waste";

            return (
              <div
                key={w.anomaly_id}
                className="flex items-start gap-3 py-4 first:pt-0 last:pb-0"
              >
                {/* Rank + resource icon */}
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-canvas text-caption font-semibold text-ink-secondary">
                  {idx + 1}
                </span>
                <span
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-control",
                    w.resource === "electricity" && "bg-res-electricity/10 text-res-electricity",
                    w.resource === "water" && "bg-res-water/10 text-res-water",
                    w.resource === "waste" && "bg-res-waste/10 text-res-waste",
                  )}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>

                {/* Two stacked lines so nothing is squeezed: name on top, badges below */}
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 flex-col">
                      <span className="text-body font-medium leading-snug text-ink">
                        {w.location_name}
                      </span>
                      <span className="font-mono text-caption text-ink-secondary">
                        {w.location_code}
                      </span>
                    </div>
                    <Link
                      href={linkHref}
                      className="mt-0.5 shrink-0 text-ink-secondary hover:text-brand"
                      aria-label={`View details for ${w.location_name}`}
                    >
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Pill
                      tone={
                        w.priority === "high"
                          ? "red"
                          : w.priority === "medium"
                            ? "amber"
                            : "green"
                      }
                    >
                      {w.priority}
                    </Pill>

                    <div className="flex items-center gap-1.5 rounded-pill border border-hairline bg-canvas py-1 pl-2.5 pr-1.5">
                      <span
                        className={cn(
                          "text-caption tabular-nums",
                          w.avoidable_inr !== null
                            ? "font-semibold text-ink"
                            : "text-ink-secondary",
                        )}
                      >
                        {w.avoidable_inr !== null
                          ? `₹${w.avoidable_inr}`
                          : "Misrouted"}
                      </span>
                      <TagPill tag="estimated" />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
