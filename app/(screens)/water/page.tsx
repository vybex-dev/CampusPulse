"use client";

import { useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Segmented, type SegmentedOption } from "@/components/ui/Segmented";
import { ErrorState } from "@/components/ui/ErrorState";
import { WaterExplanationCard } from "@/components/water/WaterExplanationCard";
import { FlowChart } from "@/components/water/FlowChart";
import { TankChart } from "@/components/water/TankChart";
import { PerCapitaChart } from "@/components/water/PerCapitaChart";
import {
  useWaterSeries,
  useTankSeries,
  usePerCapitaWater,
  useAnomalies,
} from "@/lib/api";
import { BLOCK_NAMES, type BlockCode } from "@/lib/contract";

const BLOCK_OPTIONS: readonly SegmentedOption<BlockCode>[] = [
  { value: "HST-1", label: "Boys Hostel 1" },
  { value: "HST-2", label: "Girls Hostel" },
  { value: "AB-A", label: "Academic Block A" },
  { value: "AB-B", label: "Academic Block B" },
  { value: "LIB", label: "Library" },
  { value: "MESS", label: "Mess & Canteen" },
];

export default function WaterPage() {
  const [selectedBlock, setSelectedBlock] = useState<BlockCode>("HST-1");

  const {
    data: flowData,
    isLoading: flowLoading,
    isError: flowError,
    refetch: refetchFlow,
  } = useWaterSeries({ block: selectedBlock });

  const {
    data: tankData,
    isLoading: tankLoading,
    isError: tankError,
    refetch: refetchTank,
  } = useTankSeries({ block: selectedBlock });

  const {
    data: perCapitaData,
    isLoading: perCapitaLoading,
    refetch: refetchPerCapita,
  } = usePerCapitaWater();

  const {
    data: anomalies,
    refetch: refetchAnomalies,
  } = useAnomalies();

  const handleRetryAll = () => {
    void refetchFlow();
    void refetchTank();
    void refetchPerCapita();
    void refetchAnomalies();
  };

  const currentAnomaly = anomalies?.find(
    (a) => a.location.block === selectedBlock && a.status === "active",
  );

  const blockName = BLOCK_NAMES[selectedBlock] ?? selectedBlock;
  const baselineLph = selectedBlock === "HST-1" ? 120 : selectedBlock === "AB-A" ? 70 : 60;

  if (flowError && tankError) {
    return (
      <div className="flex flex-col gap-12">
        <PageHeader
          title="Water Network"
          description="Acoustic flow and nocturnal leak auditing across campus distribution mains."
        />
        <ErrorState
          title="Failed to load water telemetry"
          message="Could not connect to the campus water monitoring service."
          onRetry={handleRetryAll}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-12">
      {/* Top Header with Block Selector */}
      <PageHeader
        title="Water Management"
        description="Night-flow leak detection and tank overflow checks for every campus block."
        actions={
          <Segmented
            ariaLabel="Select campus building block"
            options={BLOCK_OPTIONS}
            value={selectedBlock}
            onChange={setSelectedBlock}
            size="md"
          />
        }
      />

      {/* 1. Plain-English Explanation Card FIRST (above charts) */}
      <section aria-label="Facility Water Diagnosis">
        <WaterExplanationCard
          blockName={blockName}
          blockCode={selectedBlock}
          anomaly={currentAnomaly}
        />
      </section>

      {/* 2. Flow Chart with shaded 02:00-04:00 night window and baseline */}
      <section aria-label="Main Inflow Telemetry">
        <FlowChart
          series={flowData?.series ?? []}
          blockName={blockName}
          baseline={baselineLph}
          unit={flowData?.unit ?? "L/h"}
          loading={flowLoading}
        />
      </section>

      {/* 3. Tank Level & Per-Capita Charts */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <section aria-label="Rooftop Storage Tank Level">
          <TankChart
            series={tankData?.series ?? []}
            tankMeterId={`T-${selectedBlock}`}
            loading={tankLoading}
          />
        </section>

        <section aria-label="Per-Capita Consumption Benchmarks">
          <PerCapitaChart
            data={perCapitaData ?? []}
            loading={perCapitaLoading}
          />
        </section>
      </div>
    </div>
  );
}
