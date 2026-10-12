"use client";

import Link from "next/link";
import { Zap, Droplets, Trash2, ArrowRight } from "lucide-react";
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
        <div className="py-6 text-center text-body text-ink-secondary">
          No significant waste locations detected.
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
                className="flex items-center justify-between py-3.5 first:pt-0 last:pb-0"
              >
                {/* Index + Location */}
                <div className="flex items-center gap-3">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-canvas text-caption font-semibold text-ink-secondary">
                    {idx + 1}
                  </span>
                  <span
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-control",
                      w.resource === "electricity" && "bg-res-electricity/10 text-res-electricity",
                      w.resource === "water" && "bg-res-water/10 text-res-water",
                      w.resource === "waste" && "bg-res-waste/10 text-res-waste",
                    )}
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <div className="flex flex-col">
                    <span className="text-body font-medium text-ink">
                      {w.location_name}
                    </span>
                    <span className="font-mono text-caption text-ink-secondary">
                      {w.location_code}
                    </span>
                  </div>
                </div>

                {/* Priority & Cost */}
                <div className="flex items-center gap-3">
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

                  {w.avoidable_inr !== null ? (
                    <div className="flex items-center gap-1.5 rounded-pill border border-hairline bg-canvas px-2.5 py-1">
                      <span className="text-caption font-semibold tabular-nums text-ink">
                        ₹{w.avoidable_inr}
                      </span>
                      <TagPill tag="estimated" />
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 rounded-pill border border-hairline bg-canvas px-2.5 py-1">
                      <span className="text-caption text-ink-secondary">
                        Misrouted
                      </span>
                      <TagPill tag="estimated" />
                    </div>
                  )}

                  <Link
                    href={linkHref}
                    className="text-ink-secondary hover:text-brand"
                    aria-label={`View details for ${w.location_name}`}
                  >
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
