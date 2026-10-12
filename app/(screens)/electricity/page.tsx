"use client";

import { useState } from "react";
import { AlertTriangle, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { Pill } from "@/components/ui/Pill";
import { TagPill } from "@/components/ui/TagPill";
import { HierarchyTree } from "@/components/electricity/HierarchyTree";
import { ExplanationCard } from "@/components/electricity/ExplanationCard";
import { UsageChart } from "@/components/electricity/UsageChart";
import { useElectricitySeries, useAnomalies } from "@/lib/api";

export default function ElectricityPage() {
  const [selectedMeterId, setSelectedMeterId] = useState<string>("E-A-204");
  const [selectedName, setSelectedName] = useState<string>("Hall A-204");
  const [selectedCode, setSelectedCode] = useState<string>("A-204");

  const {
    data: seriesData,
    isLoading: seriesLoading,
    isError: seriesError,
    refetch: refetchSeries,
  } = useElectricitySeries({ meter_id: selectedMeterId });

  const {
    data: anomalies,
    refetch: refetchAnomalies,
  } = useAnomalies();

  const handleSelectMeter = (meterId: string, name: string, code: string) => {
    setSelectedMeterId(meterId);
    setSelectedName(name);
    setSelectedCode(code);
  };

  // Find anomaly corresponding to the selected meter if any
  const currentAnomaly = anomalies?.find(
    (a) => a.meter_id === selectedMeterId && a.status === "active",
  );

  return (
    <div className="flex flex-col gap-12">
      <PageHeader
        title="Electricity Management"
        description="Hourly load analysis against what each room or floor should draw, aligned to campus lecture schedules."
      />

      {seriesError ? (
        <ErrorState
          title="Failed to load electricity load series"
          message="Could not retrieve meter telemetry for this room."
          onRetry={() => {
            void refetchSeries();
            void refetchAnomalies();
          }}
        />
      ) : (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-4">
          {/* Left Column: HierarchyTree */}
          <div className="lg:col-span-1">
            <HierarchyTree
              selectedMeterId={selectedMeterId}
              onSelectMeter={handleSelectMeter}
            />
          </div>

          {/* Right Column: ExplanationCard FIRST, then UsageChart and Events */}
          <div className="flex flex-col gap-8 lg:col-span-3">
            {/* 1. Plain-English Explanation Card sits above chart */}
            <ExplanationCard
              locationName={selectedName}
              roomCode={selectedCode}
              meterId={selectedMeterId}
              anomaly={currentAnomaly}
            />

            {/* 2. Usage Chart with Expected Band and Timetable Strip */}
            <UsageChart
              series={seriesData?.series ?? []}
              unit={seriesData?.unit ?? "kW"}
              loading={seriesLoading}
            />

            {/* 3. Event List */}
            <Card className="flex flex-col gap-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-section text-ink">Load Events & Diagnostics</h3>
                  <p className="text-body text-ink-secondary">
                    Log of abnormal power draws, peak periods, and standby breaches.
                  </p>
                </div>
              </div>

              {currentAnomaly ? (
                <div className="flex flex-col divide-y divide-hairline">
                  <div className="flex flex-col gap-3 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-control bg-sev-red/10 text-sev-red">
                        <AlertTriangle className="h-4 w-4" />
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-body font-semibold text-ink">
                            Unscheduled evening draw detected
                          </span>
                          <Pill tone="red">High</Pill>
                        </div>
                        <p className="text-caption text-ink-secondary">
                          {currentAnomaly.start_ts} to {currentAnomaly.end_ts} (
                          {currentAnomaly.occurrences} consecutive nights)
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="rounded-pill border border-hairline bg-canvas px-3 py-1 text-caption font-semibold tabular-nums text-ink">
                        {currentAnomaly.excess.value} kWh excess
                      </div>
                      <TagPill tag="estimated" />
                    </div>
                  </div>
                </div>
              ) : (
                <EmptyState
                  icon={ShieldCheck}
                  title="Everything looks efficient"
                  description={`No active power draw anomalies recorded for ${selectedName}. Standby load is optimal.`}
                />
              )}
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
