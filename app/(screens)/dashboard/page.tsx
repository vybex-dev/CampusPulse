"use client";

import { useUIStore } from "@/lib/store";
import { useSummary, useAnomalies } from "@/lib/api";
import { PageHeader } from "@/components/ui/PageHeader";
import { Segmented, type SegmentedOption } from "@/components/ui/Segmented";
import { ErrorState } from "@/components/ui/ErrorState";
import { HeadlineCards } from "@/components/command/HeadlineCards";
import { CampusMap } from "@/components/command/CampusMap";
import { AlertFeed } from "@/components/command/AlertFeed";
import { TopWasters } from "@/components/command/TopWasters";
import type { Range, ResourceTab } from "@/lib/contract";
import { Zap, Droplets, Trash2, LayoutGrid } from "lucide-react";

const RESOURCE_OPTIONS: readonly SegmentedOption<ResourceTab>[] = [
  { value: "all", label: "All Resources", icon: LayoutGrid },
  { value: "electricity", label: "Electricity", icon: Zap },
  { value: "water", label: "Water", icon: Droplets },
  { value: "waste", label: "Waste", icon: Trash2 },
];

const RANGE_OPTIONS: readonly SegmentedOption<Range>[] = [
  { value: 7, label: "7 days" },
  { value: 30, label: "30 days" },
];

export default function CommandCenterPage() {
  const range = useUIStore((s) => s.range);
  const setRange = useUIStore((s) => s.setRange);
  const resourceTab = useUIStore((s) => s.resourceTab);
  const setResourceTab = useUIStore((s) => s.setResourceTab);

  const {
    data: summary,
    isLoading: summaryLoading,
    isError: summaryError,
    refetch: refetchSummary,
  } = useSummary(range, resourceTab);

  const {
    data: anomalies,
    isLoading: anomaliesLoading,
    isError: anomaliesError,
    refetch: refetchAnomalies,
  } = useAnomalies();

  const handleRetryAll = () => {
    void refetchSummary();
    void refetchAnomalies();
  };

  if (summaryError && anomaliesError) {
    return (
      <div className="flex flex-col gap-12">
        <PageHeader
          title="Command Center"
          description="High-level visibility into campus energy, water and waste efficiency."
        />
        <ErrorState
          title="Failed to load Command Center"
          message="Could not retrieve real-time summary data from the server."
          onRetry={handleRetryAll}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-12">
      {/* Top Header with Resource Filter & Range Switcher */}
      <PageHeader
        title="Command Center"
        description="See where the campus wastes electricity, water and waste-handling effort this week."
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <Segmented
              ariaLabel="Filter by resource"
              options={RESOURCE_OPTIONS}
              value={resourceTab}
              onChange={setResourceTab}
              size="md"
            />
            <Segmented
              ariaLabel="Select period range"
              options={RANGE_OPTIONS}
              value={range}
              onChange={setRange}
              size="md"
            />
          </div>
        }
      />

      {/* 1. Four Headline Metric Cards */}
      <section aria-label="Key Performance Indicators">
        <HeadlineCards summary={summary} loading={summaryLoading} />
      </section>

      {/* 2. Campus Map */}
      <section aria-label="Campus Facility Map">
        <CampusMap
          blockSeverity={
            summary?.block_severity ?? {
              "AB-A": "green",
              "AB-B": "green",
              LIB: "green",
              "HST-1": "green",
              "HST-2": "green",
              MESS: "green",
            }
          }
          anomalies={anomalies ?? []}
        />
      </section>

      {/* 3. Operational Feed & Top Wasters */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <AlertFeed
            anomalies={anomalies ?? []}
            resourceFilter={resourceTab}
            loading={anomaliesLoading}
            error={anomaliesError}
            onRetry={refetchAnomalies}
          />
        </div>

        <div className="lg:col-span-1">
          <TopWasters
            wasters={summary?.top_wasters ?? []}
            loading={summaryLoading}
          />
        </div>
      </div>
    </div>
  );
}
