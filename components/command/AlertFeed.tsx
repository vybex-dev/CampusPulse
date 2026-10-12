"use client";

import Link from "next/link";
import { Zap, Droplets, Trash2, ArrowRight, ShieldCheck } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { TagPill } from "@/components/ui/TagPill";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import type { Anomaly, ResourceTab } from "@/lib/contract";
import { cn } from "@/lib/cn";

interface AlertFeedProps {
  anomalies?: Anomaly[];
  resourceFilter?: ResourceTab;
  loading?: boolean;
  error?: boolean;
  onRetry?: () => void;
}

const PRIORITY_RANK: Record<string, number> = {
  high: 3,
  medium: 2,
  low: 1,
};

export function AlertFeed({
  anomalies = [],
  resourceFilter = "all",
  loading = false,
  error = false,
  onRetry,
}: AlertFeedProps) {
  if (error) {
    return (
      <Card>
        <ErrorState
          title="Could not load alerts"
          message="There was an issue fetching the campus anomaly alert feed."
          onRetry={onRetry}
        />
      </Card>
    );
  }

  // Filter by resource tab
  const filtered = anomalies.filter((a) => {
    if (a.status !== "active") return false;
    if (resourceFilter !== "all" && a.resource !== resourceFilter) return false;
    return true;
  });

  // Sort by priority (high > medium > low), then daily cost descending
  const sorted = [...filtered].sort((a, b) => {
    const pDiff = (PRIORITY_RANK[b.priority] ?? 0) - (PRIORITY_RANK[a.priority] ?? 0);
    if (pDiff !== 0) return pDiff;
    const costA = a.daily_cost_inr ?? a.cost_inr ?? 0;
    const costB = b.daily_cost_inr ?? b.cost_inr ?? 0;
    return costB - costA;
  });

  return (
    <Card className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-section text-ink">Alert Feed</h2>
          <p className="text-body text-ink-secondary">
            Prioritized operational waste events across campus facilities.
          </p>
        </div>
        <div className="text-caption font-medium text-ink-secondary">
          {loading ? "..." : `${sorted.length} active alerts`}
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="flex items-center justify-between rounded-control border border-hairline p-4"
            >
              <div className="flex items-center gap-3">
                <Skeleton className="h-9 w-9 rounded-full" />
                <div className="flex flex-col gap-1.5">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-64" />
                </div>
              </div>
              <Skeleton className="h-6 w-20" />
            </div>
          ))}
        </div>
      ) : sorted.length === 0 ? (
        <EmptyState
          icon={ShieldCheck}
          title="Everything looks efficient"
          description="No unaddressed anomalies found for the current resource filter."
        />
      ) : (
        <div className="flex flex-col divide-y divide-hairline">
          {sorted.map((item) => {
            const Icon =
              item.resource === "electricity"
                ? Zap
                : item.resource === "water"
                  ? Droplets
                  : Trash2;

            const inspectHref =
              item.resource === "electricity"
                ? `/electricity?meter=${item.meter_id ?? ""}`
                : item.resource === "water"
                  ? `/water?block=${item.location.block}`
                  : "/waste";

            return (
              <div
                key={item.id}
                className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 xl:flex-row xl:items-center xl:gap-6"
              >
                {/* Left details */}
                <div className="flex min-w-0 flex-1 items-start gap-3.5">
                  <span
                    className={cn(
                      "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-control",
                      item.resource === "electricity" && "bg-res-electricity/10 text-res-electricity",
                      item.resource === "water" && "bg-res-water/10 text-res-water",
                      item.resource === "waste" && "bg-res-waste/10 text-res-waste",
                    )}
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </span>

                  <div className="flex min-w-0 flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-body font-semibold text-ink">
                        {item.location.name}
                      </span>
                      <span className="font-mono text-caption text-ink-secondary">
                        ({item.location.block})
                      </span>
                      <Pill
                        tone={
                          item.priority === "high"
                            ? "red"
                            : item.priority === "medium"
                              ? "amber"
                              : "green"
                        }
                      >
                        {item.priority}
                      </Pill>
                    </div>

                    <p className="text-body text-ink-secondary">
                      {item.explanation}
                    </p>
                  </div>
                </div>

                {/* Right cost chip & inspect link */}
                <div className="flex shrink-0 items-center gap-2 pl-[3.125rem] xl:w-[16.5rem] xl:justify-end xl:pl-0">
                  {item.daily_cost_inr !== null ? (
                    <div className="flex min-w-0 items-center justify-between gap-2 rounded-pill border border-hairline bg-canvas py-1 pl-3 pr-1.5 xl:flex-1">
                      <span className="whitespace-nowrap text-caption font-semibold tabular-nums text-ink">
                        ₹{item.daily_cost_inr}/day
                      </span>
                      <TagPill tag="estimated" />
                    </div>
                  ) : (
                    <div className="flex min-w-0 items-center justify-between gap-2 rounded-pill border border-hairline bg-canvas py-1 pl-3 pr-1.5 xl:flex-1">
                      <span className="whitespace-nowrap text-caption font-medium text-ink-secondary">
                        {item.excess.value} {item.excess.unit}
                      </span>
                      <TagPill tag="estimated" />
                    </div>
                  )}

                  <Link
                    href={inspectHref}
                    className="inline-flex h-8 shrink-0 items-center gap-1 whitespace-nowrap rounded-control px-3 text-caption font-medium text-brand hover:bg-brand-tint"
                  >
                    <span>Inspect</span>
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
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
