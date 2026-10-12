"use client";

import { Drawer } from "@/components/ui/Drawer";
import { TagPill } from "@/components/ui/TagPill";
import type { WhatIfSnapshot } from "@/lib/contract";
import { BookOpen, Calculator, Info } from "lucide-react";

interface AssumptionsDrawerProps {
  open: boolean;
  onClose: () => void;
  snapshot?: WhatIfSnapshot;
}

export function AssumptionsDrawer({
  open,
  onClose,
  snapshot,
}: AssumptionsDrawerProps) {
  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Model Assumptions & Math"
    >
      <div className="flex flex-col gap-6 text-body">
        {/* Intro */}
        <div className="rounded-control bg-canvas p-4 text-caption text-ink-secondary">
          <div className="flex items-center gap-1.5 font-medium text-ink">
            <Info className="h-4 w-4 text-brand" />
            <span>Deterministic Campus Physics</span>
          </div>
          <p className="mt-1">
            All projected values update in real-time under 300 ms using counterfactual
            baseline models calibrated to actual campus meter networks.
          </p>
        </div>

        {/* 1. Baseline parameters */}
        <div>
          <h3 className="flex items-center gap-2 text-section font-semibold text-ink">
            <Calculator className="h-4 w-4 text-brand" />
            Active Baseline Values
          </h3>
          <div className="mt-3 divide-y divide-hairline rounded-control border border-hairline bg-surface">
            <div className="flex items-center justify-between px-3 py-2 text-caption">
              <span className="text-ink-secondary">Monthly Electricity Usage (U_E)</span>
              <span className="font-semibold text-ink tabular-nums">
                {snapshot ? `${snapshot.U_E.toLocaleString()} kWh` : "—"}
              </span>
            </div>
            <div className="flex items-center justify-between px-3 py-2 text-caption">
              <span className="text-ink-secondary">Monthly Water Usage (U_W)</span>
              <span className="font-semibold text-ink tabular-nums">
                {snapshot ? `${snapshot.U_W.toLocaleString()} kL` : "—"}
              </span>
            </div>
            <div className="flex items-center justify-between px-3 py-2 text-caption">
              <span className="text-ink-secondary">Academic & Library Electricity (E_acad)</span>
              <span className="font-semibold text-ink tabular-nums">
                {snapshot ? `${snapshot.E_acad.toLocaleString()} kWh` : "—"}
              </span>
            </div>
            <div className="flex items-center justify-between px-3 py-2 text-caption">
              <span className="text-ink-secondary">Avoidable Electricity Share (a_E)</span>
              <span className="font-semibold text-ink tabular-nums">
                {snapshot ? `${(snapshot.a_E * 100).toFixed(2)}%` : "—"}
              </span>
            </div>
            <div className="flex items-center justify-between px-3 py-2 text-caption">
              <span className="text-ink-secondary">Avoidable Water Share (a_W)</span>
              <span className="font-semibold text-ink tabular-nums">
                {snapshot ? `${(snapshot.a_W * 100).toFixed(2)}%` : "—"}
              </span>
            </div>
            <div className="flex items-center justify-between px-3 py-2 text-caption">
              <span className="text-ink-secondary">Current Waste Segregation (A)</span>
              <span className="font-semibold text-ink tabular-nums">
                {snapshot ? `${snapshot.A.toFixed(1)}%` : "—"}
              </span>
            </div>
            <div className="flex items-center justify-between px-3 py-2 text-caption">
              <span className="text-ink-secondary">Monthly Waste Generation (M)</span>
              <span className="font-semibold text-ink tabular-nums">
                {snapshot ? `${snapshot.M.toLocaleString()} kg` : "—"}
              </span>
            </div>
          </div>
        </div>

        {/* 2. Physical & Economic Constants */}
        <div>
          <h3 className="flex items-center gap-2 text-section font-semibold text-ink">
            <BookOpen className="h-4 w-4 text-brand" />
            Conversion & Utility Rates
          </h3>
          <div className="mt-3 divide-y divide-hairline rounded-control border border-hairline bg-surface">
            <div className="flex items-center justify-between px-3 py-2 text-caption">
              <span className="text-ink-secondary">Electricity Tariff</span>
              <span className="font-semibold text-ink tabular-nums">
                ₹{snapshot?.tariff_inr_per_kwh ?? 8}/kWh
              </span>
            </div>
            <div className="flex items-center justify-between px-3 py-2 text-caption">
              <span className="text-ink-secondary">Water Rate</span>
              <span className="font-semibold text-ink tabular-nums">
                ₹{snapshot?.water_inr_per_kl ?? 20}/kL
              </span>
            </div>
            <div className="flex items-center justify-between px-3 py-2 text-caption">
              <span className="text-ink-secondary">Grid Carbon Intensity</span>
              <span className="font-semibold text-ink tabular-nums">
                {snapshot?.ef_grid_kg_per_kwh ?? 0.72} kg CO2e/kWh
              </span>
            </div>
            <div className="flex items-center justify-between px-3 py-2 text-caption">
              <span className="text-ink-secondary">Water Carbon Factor</span>
              <span className="font-semibold text-ink tabular-nums">
                {snapshot?.ef_water_kg_per_kl ?? 0.3} kg CO2e/kL
              </span>
            </div>
            <div className="flex items-center justify-between px-3 py-2 text-caption">
              <span className="text-ink-secondary">Fault Fix Effectiveness (η)</span>
              <span className="font-semibold text-ink tabular-nums">
                {((snapshot?.fix_effectiveness ?? 0.85) * 100).toFixed(0)}%
              </span>
            </div>
            <div className="flex items-center justify-between px-3 py-2 text-caption">
              <span className="text-ink-secondary">AC Share of Academic Load</span>
              <span className="font-semibold text-ink tabular-nums">
                {((snapshot?.ac_share_of_academic_load ?? 0.5) * 100).toFixed(0)}%
              </span>
            </div>
            <div className="flex items-center justify-between px-3 py-2 text-caption">
              <span className="text-ink-secondary">AC Saving per 1°C increase</span>
              <span className="font-semibold text-ink tabular-nums">
                {((snapshot?.ac_saving_per_degree_c ?? 0.05) * 100).toFixed(0)}%
              </span>
            </div>
            <div className="flex items-center justify-between px-3 py-2 text-caption">
              <span className="text-ink-secondary">Tree Carbon Sequestration</span>
              <span className="font-semibold text-ink tabular-nums">21 kg CO2e / tree-yr</span>
            </div>
          </div>
        </div>

        {/* 3. Mathematical Formulas */}
        <div>
          <h3 className="text-section font-semibold text-ink">Governing Equations</h3>
          <div className="mt-3 flex flex-col gap-2 rounded-control bg-canvas p-4 text-caption font-mono text-ink">
            <div>
              <span className="text-ink-secondary">{"// Electricity Avoidable Post-Fix"}</span>
              <div className="font-semibold">a_E&apos; = a_E · (1 - η · f_E)</div>
            </div>
            <div className="pt-2">
              <span className="text-ink-secondary">{"// Monthly Electricity Savings (kWh)"}</span>
              <div className="font-semibold">
                ΔkWh = (a_E - a_E&apos;) · U_E + 0.5 · 0.05 · ΔT_AC · E_acad
              </div>
            </div>
            <div className="pt-2">
              <span className="text-ink-secondary">{"// Monthly Water Savings (kL)"}</span>
              <div className="font-semibold">ΔkL = (a_W - a_W&apos;) · U_W</div>
            </div>
            <div className="pt-2">
              <span className="text-ink-secondary">{"// Diverted Waste Mass (kg)"}</span>
              <div className="font-semibold">Δkg = ((A* - A) / 100) · M</div>
            </div>
            <div className="pt-2">
              <span className="text-ink-secondary">{"// Projected Campus Score"}</span>
              <div className="font-semibold">
                Score&apos; = (S_E(a_E&apos;) + S_W(a_W&apos;) + A*) / 3
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          <TagPill tag="projected" />
          <span className="text-caption text-ink-secondary">
            Simulated campus model v1.0
          </span>
        </div>
      </div>
    </Drawer>
  );
}
