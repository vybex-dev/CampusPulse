"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { TagPill } from "@/components/ui/TagPill";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import { useWhatIfSnapshot } from "@/lib/api";
import { scoreFromShares } from "@/lib/score";
import { WhatIfGauges } from "@/components/simulator/WhatIfGauges";
import { AssumptionsDrawer } from "@/components/simulator/AssumptionsDrawer";
import {
  SlidersHorizontal,
  RotateCcw,
  Sparkles,
  Zap,
  Droplets,
  Thermometer,
  Recycle,
  HelpCircle,
  IndianRupee,
  Leaf,
  Trees,
} from "lucide-react";

export default function SimulatorPage() {
  const { data: snapshot, isLoading, isError, refetch } = useWhatIfSnapshot();

  // State sliders
  const [fE, setFE] = useState<number>(0); // 0..100%
  const [fW, setFW] = useState<number>(0); // 0..100%
  const [deltaAC, setDeltaAC] = useState<number>(0); // 0..3 °C
  const [targetA, setTargetA] = useState<number | null>(null); // % (defaults to current A)
  const [assumptionsOpen, setAssumptionsOpen] = useState(false);

  const baselineA = snapshot?.A ?? 75;
  const currentTargetA = targetA !== null ? targetA : baselineA;

  // Real-time calculations (< 300 ms in browser)
  const calculations = useMemo(() => {
    if (!snapshot) return null;

    const eta = snapshot.fix_effectiveness ?? 0.85;
    const fEFrac = fE / 100;
    const fWFrac = fW / 100;

    // Post-intervention avoidable shares
    const aEPrime = Math.max(0, snapshot.a_E * (1 - eta * fEFrac));
    const aWPrime = Math.max(0, snapshot.a_W * (1 - eta * fWFrac));
    const aStar = Math.min(100, Math.max(baselineA, currentTargetA));

    // Resource delta savings
    const deltaKWh =
      (snapshot.a_E - aEPrime) * snapshot.U_E +
      (snapshot.ac_share_of_academic_load ?? 0.5) *
        (snapshot.ac_saving_per_degree_c ?? 0.05) *
        deltaAC *
        snapshot.E_acad;

    const deltaKL = (snapshot.a_W - aWPrime) * snapshot.U_W;
    const deltaKg = Math.max(0, ((aStar - snapshot.A) / 100) * snapshot.M);

    // Current and projected scores
    const currentScore = scoreFromShares(
      snapshot.a_E,
      snapshot.a_W,
      snapshot.A,
      snapshot.score_ceiling_electricity,
      snapshot.score_ceiling_water,
    );

    const projectedScore = scoreFromShares(
      aEPrime,
      aWPrime,
      aStar,
      snapshot.score_ceiling_electricity,
      snapshot.score_ceiling_water,
    );

    // Financial & carbon conversions
    const deltaInr = Math.round(
      deltaKWh * snapshot.tariff_inr_per_kwh + deltaKL * snapshot.water_inr_per_kl,
    );

    const deltaCo2e = Math.round(
      deltaKWh * snapshot.ef_grid_kg_per_kwh +
        deltaKL * snapshot.ef_water_kg_per_kl +
        deltaKg * (snapshot.ef_waste_avg_kg_per_kg ?? 0.75),
    );

    const treesEquiv = Number((deltaCo2e / 21).toFixed(1));

    return {
      currentScore,
      projectedScore,
      deltaKWh: Math.round(deltaKWh),
      deltaKL: Number(deltaKL.toFixed(1)),
      deltaKg: Math.round(deltaKg),
      deltaInr,
      deltaCo2e,
      treesEquiv,
    };
  }, [snapshot, fE, fW, deltaAC, currentTargetA, baselineA]);

  // Presets handlers
  const handlePresetFixAll = () => {
    setFE(100);
    setFW(100);
    setDeltaAC(0);
    setTargetA(baselineA);
  };

  const handlePresetSegregation = () => {
    setFE(0);
    setFW(0);
    setDeltaAC(0);
    setTargetA(Math.max(90, baselineA));
  };

  const handlePresetAC = () => {
    setFE(0);
    setFW(0);
    setDeltaAC(1);
    setTargetA(baselineA);
  };

  const handlePresetEverything = () => {
    setFE(100);
    setFW(100);
    setDeltaAC(1.5);
    setTargetA(Math.max(95, baselineA));
  };

  const handleReset = () => {
    setFE(0);
    setFW(0);
    setDeltaAC(0);
    setTargetA(baselineA);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-8">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-5 w-96" />
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Skeleton className="h-44 w-full" />
          <Skeleton className="h-44 w-full" />
        </div>
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  if (isError || !snapshot) {
    return (
      <ErrorState
        title="Unable to load What-If model"
        message="Could not retrieve the baseline campus meter snapshot. Please check connection and try again."
        onRetry={() => void refetch()}
      />
    );
  }

  return (
    <div className="flex flex-col gap-8 pb-12">
      {/* 1. Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-title font-semibold tracking-tight text-ink">
              What-If Simulator
            </h1>
            <span className="rounded-pill border border-hairline bg-surface px-2.5 py-0.5 text-caption font-medium text-ink-secondary">
              Simulated data
            </span>
          </div>
          <p className="mt-1 text-body text-ink-secondary">
            Model operational interventions in electricity, water, and waste segregation to forecast your score and monthly savings.
          </p>
        </div>

        <Button
          variant="secondary"
          size="sm"
          icon={HelpCircle}
          onClick={() => setAssumptionsOpen(true)}
        >
          Model Assumptions
        </Button>
      </div>

      {/* 2. Presets Strip */}
      <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="flex items-center gap-2 text-caption font-medium text-ink-secondary">
          <Sparkles className="h-4 w-4 text-brand" />
          <span>Quick Presets:</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" size="sm" onClick={handlePresetFixAll}>
            Fix all flagged
          </Button>
          <Button variant="secondary" size="sm" onClick={handlePresetSegregation}>
            Reach 90% segregation
          </Button>
          <Button variant="secondary" size="sm" onClick={handlePresetAC}>
            Raise AC 1°C
          </Button>
          <Button variant="secondary" size="sm" onClick={handlePresetEverything}>
            Everything
          </Button>
          <Button
            variant="ghost"
            size="sm"
            icon={RotateCcw}
            onClick={handleReset}
            className="text-ink-secondary hover:text-ink"
          >
            Reset
          </Button>
        </div>
      </Card>

      {/* 3. Dual Score Gauges (Current vs Projected) */}
      {calculations && (
        <WhatIfGauges
          current={calculations.currentScore}
          projected={calculations.projectedScore}
        />
      )}

      {/* 4. Controls & Projected Monthly Impact */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Sliders Panel (7 cols) */}
        <Card className="flex flex-col gap-6 p-card lg:col-span-7">
          <div className="flex items-center justify-between border-b border-hairline pb-4">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="h-5 w-5 text-brand" />
              <h2 className="text-section font-semibold text-ink">
                Intervention Sliders
              </h2>
            </div>
            <span className="text-caption text-ink-secondary">
              Updates under 300 ms
            </span>
          </div>

          {/* Slider 1: Electricity Fix Share (f_E) */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-body">
              <label htmlFor="slider-fe" className="flex items-center gap-2 font-medium text-ink">
                <Zap className="h-4 w-4 text-accent-electricity" />
                Fix Flagged Electricity Faults (f_E)
              </label>
              <span className="font-semibold text-ink tabular-nums">{fE}%</span>
            </div>
            <input
              id="slider-fe"
              type="range"
              min="0"
              max="100"
              step="5"
              value={fE}
              onChange={(e) => setFE(Number(e.target.value))}
              className="h-2 w-full cursor-pointer appearance-none rounded-pill bg-canvas accent-brand"
            />
            <div className="flex justify-between text-caption text-ink-secondary">
              <span>0% (Leave active)</span>
              <span>100% (Remediate all faults)</span>
            </div>
          </div>

          {/* Slider 2: Water Fix Share (f_W) */}
          <div className="flex flex-col gap-2 border-t border-hairline pt-4">
            <div className="flex items-center justify-between text-body">
              <label htmlFor="slider-fw" className="flex items-center gap-2 font-medium text-ink">
                <Droplets className="h-4 w-4 text-accent-water" />
                Fix Flagged Water Leaks (f_W)
              </label>
              <span className="font-semibold text-ink tabular-nums">{fW}%</span>
            </div>
            <input
              id="slider-fw"
              type="range"
              min="0"
              max="100"
              step="5"
              value={fW}
              onChange={(e) => setFW(Number(e.target.value))}
              className="h-2 w-full cursor-pointer appearance-none rounded-pill bg-canvas accent-brand"
            />
            <div className="flex justify-between text-caption text-ink-secondary">
              <span>0% (No repairs)</span>
              <span>100% (Fix all leaks)</span>
            </div>
          </div>

          {/* Slider 3: Campus AC Set-point (delta T_AC) */}
          <div className="flex flex-col gap-2 border-t border-hairline pt-4">
            <div className="flex items-center justify-between text-body">
              <label htmlFor="slider-ac" className="flex items-center gap-2 font-medium text-ink">
                <Thermometer className="h-4 w-4 text-amber-600" />
                Campus AC Set-Point Adjustment (ΔT)
              </label>
              <span className="font-semibold text-ink tabular-nums">+{deltaAC}°C</span>
            </div>
            <input
              id="slider-ac"
              type="range"
              min="0"
              max="3"
              step="0.5"
              value={deltaAC}
              onChange={(e) => setDeltaAC(Number(e.target.value))}
              className="h-2 w-full cursor-pointer appearance-none rounded-pill bg-canvas accent-brand"
            />
            <div className="flex justify-between text-caption text-ink-secondary">
              <span>0°C (Default 24°C)</span>
              <span>+3°C (Summer set-point 27°C)</span>
            </div>
          </div>

          {/* Slider 4: Target Waste Segregation (A*) */}
          <div className="flex flex-col gap-2 border-t border-hairline pt-4">
            <div className="flex items-center justify-between text-body">
              <label htmlFor="slider-waste" className="flex items-center gap-2 font-medium text-ink">
                <Recycle className="h-4 w-4 text-accent-waste" />
                Target Waste Segregation Compliance (A*)
              </label>
              <span className="font-semibold text-ink tabular-nums">
                {currentTargetA.toFixed(1)}%
              </span>
            </div>
            <input
              id="slider-waste"
              type="range"
              min={Math.floor(baselineA)}
              max="100"
              step="1"
              value={currentTargetA}
              onChange={(e) => setTargetA(Number(e.target.value))}
              className="h-2 w-full cursor-pointer appearance-none rounded-pill bg-canvas accent-brand"
            />
            <div className="flex justify-between text-caption text-ink-secondary">
              <span>Current ({baselineA.toFixed(1)}%)</span>
              <span>100% (Zero contamination)</span>
            </div>
          </div>
        </Card>

        {/* Projected Monthly Savings (5 cols) */}
        <div className="flex flex-col gap-4 lg:col-span-5">
          <Card className="flex flex-col gap-4 p-card">
            <div className="flex items-center justify-between">
              <span className="text-caption font-semibold uppercase tracking-wider text-ink-secondary">
                Projected Monthly Value
              </span>
              <TagPill tag="projected" />
            </div>

            {/* Rupee Savings */}
            <div className="rounded-control bg-canvas p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-caption text-ink-secondary">
                  <IndianRupee className="h-4 w-4 text-brand" />
                  <span>Cost Avoided</span>
                </div>
                <TagPill tag="projected" />
              </div>
              <div className="mt-2 text-display font-semibold tracking-tight text-ink tabular-nums">
                ₹{calculations?.deltaInr.toLocaleString() ?? 0}
              </div>
              <span className="text-caption text-ink-secondary">
                per month in reduced electricity & water bills
              </span>
            </div>

            {/* Carbon & Trees */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-control bg-canvas p-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-caption text-ink-secondary">
                    <Leaf className="h-3.5 w-3.5 text-accent-waste" />
                    <span>Carbon</span>
                  </div>
                </div>
                <div className="mt-2 text-section font-semibold text-ink tabular-nums">
                  {calculations?.deltaCo2e.toLocaleString() ?? 0}
                </div>
                <span className="text-caption text-ink-secondary">kg CO2e / mo</span>
              </div>

              <div className="rounded-control bg-canvas p-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-caption text-ink-secondary">
                    <Trees className="h-3.5 w-3.5 text-brand" />
                    <span>Trees Equiv.</span>
                  </div>
                </div>
                <div className="mt-2 text-section font-semibold text-ink tabular-nums">
                  {calculations?.treesEquiv.toFixed(1) ?? 0}
                </div>
                <span className="text-caption text-ink-secondary">tree-years</span>
              </div>
            </div>

            {/* Native Units Grid */}
            <div className="flex flex-col gap-2 rounded-control border border-hairline p-3.5 text-caption">
              <div className="flex items-center justify-between">
                <span className="text-ink-secondary">Electricity Conserved</span>
                <span className="font-semibold text-ink tabular-nums">
                  {calculations?.deltaKWh.toLocaleString() ?? 0} kWh / mo
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-ink-secondary">Water Saved</span>
                <span className="font-semibold text-ink tabular-nums">
                  {calculations?.deltaKL.toLocaleString() ?? 0} kL / mo
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-ink-secondary">Diverted from Landfill</span>
                <span className="font-semibold text-ink tabular-nums">
                  {calculations?.deltaKg.toLocaleString() ?? 0} kg / mo
                </span>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Assumptions Drawer */}
      <AssumptionsDrawer
        open={assumptionsOpen}
        onClose={() => setAssumptionsOpen(false)}
        snapshot={snapshot}
      />
    </div>
  );
}
