"use client";

import { useState } from "react";
import { useImpactReport } from "@/lib/api";
import type { ReportPeriod } from "@/lib/contract";
import { ReportPrintHeader } from "@/components/report/ReportPrintHeader";
import { Card } from "@/components/ui/Card";
import { TagPill } from "@/components/ui/TagPill";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import { Zap, Droplets, Recycle, CheckCircle2 } from "lucide-react";

export default function ImpactReportPage() {
  const [period, setPeriod] = useState<ReportPeriod>("7");
  const { data: report, isLoading, isError, refetch } = useImpactReport(period);

  if (isLoading) {
    return (
      <div className="mx-auto flex max-w-4xl flex-col gap-8 pb-16">
        <Skeleton className="h-20 w-full" />
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          <Skeleton className="h-36 w-full" />
          <Skeleton className="h-36 w-full" />
          <Skeleton className="h-36 w-full" />
        </div>
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (isError || !report) {
    return (
      <ErrorState
        title="Unable to generate Impact Report"
        message="Failed to compute campus verification audit. Please try again."
        onRetry={() => void refetch()}
      />
    );
  }

  const {
    score,
    verified_savings_inr,
    money,
    carbon,
    units,
    actions,
    top_wastes,
    method,
  } = report;

  return (
    <div className="print-page mx-auto flex max-w-4xl flex-col gap-10 pb-16">
      {/* 1. Print Header & Period Switcher */}
      <ReportPrintHeader
        period={period}
        onPeriodChange={setPeriod}
        generatedAt={report.generated_at}
        dataFrom={report.data_period.from}
        dataTo={report.data_period.to}
      />

      {/* 2. Executive Headline: Score & Verified Savings */}
      <div className="print-section grid grid-cols-1 gap-6 sm:grid-cols-2">
        {/* Score Card */}
        <Card className="flex flex-col justify-between p-card">
          <div className="flex items-center justify-between">
            <span className="text-caption font-semibold uppercase tracking-wider text-ink-secondary">
              Campus Sustainability Score
            </span>
            <TagPill tag="estimated" />
          </div>
          <div className="my-4">
            <div className="flex items-baseline gap-2">
              <span className="text-display font-semibold tracking-tight text-ink tabular-nums">
                {score.total.toFixed(1)}
              </span>
              <span className="text-body text-ink-secondary">/ 100</span>
            </div>
            <p className="mt-1 text-caption text-ink-secondary">
              Harmonized index combining electricity, water, and waste segregation
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 border-t border-hairline pt-3">
            <div>
              <div className="flex items-center gap-1 text-caption text-ink-secondary">
                <Zap className="h-3 w-3 text-res-electricity" />
                <span>Elec</span>
              </div>
              <span className="text-body font-semibold text-ink tabular-nums">
                {score.electricity.toFixed(1)}
              </span>
            </div>
            <div>
              <div className="flex items-center gap-1 text-caption text-ink-secondary">
                <Droplets className="h-3 w-3 text-res-water" />
                <span>Water</span>
              </div>
              <span className="text-body font-semibold text-ink tabular-nums">
                {score.water.toFixed(1)}
              </span>
            </div>
            <div>
              <div className="flex items-center gap-1 text-caption text-ink-secondary">
                <Recycle className="h-3 w-3 text-res-waste" />
                <span>Waste</span>
              </div>
              <span className="text-body font-semibold text-ink tabular-nums">
                {score.waste.toFixed(1)}
              </span>
            </div>
          </div>
        </Card>

        {/* Verified Savings Card */}
        <Card className="flex flex-col justify-between border-brand/20 bg-brand-tint/30 p-card">
          <div className="flex items-center justify-between">
            <span className="text-caption font-semibold uppercase tracking-wider text-brand">
              Verified Financial Savings
            </span>
            <TagPill tag={verified_savings_inr.tag} />
          </div>
          <div className="my-4">
            <div className="flex items-baseline gap-1">
              <span className="text-display font-semibold tracking-tight text-brand tabular-nums">
                ₹{verified_savings_inr.value.toLocaleString()}
              </span>
            </div>
            <p className="mt-1 text-caption text-ink-secondary">
              Proven utility bill reductions verified against counterfactual baselines
            </p>
          </div>

          <div className="flex items-center justify-between border-t border-hairline pt-3 text-caption">
            <span className="text-ink-secondary">Resolved Actions</span>
            <span className="font-semibold text-ink">
              {actions.verified.value} of {actions.raised.value} tickets verified
            </span>
          </div>
        </Card>
      </div>

      {/* 3. Financial Impact Section */}
      <section className="print-section flex flex-col gap-4">
        <h2 className="text-section font-semibold text-ink">
          Financial Impact Summary
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Card className="p-card">
            <div className="flex items-center justify-between">
              <span className="text-caption text-ink-secondary">Avoidable Waste</span>
              <TagPill tag={money.wasted.tag} />
            </div>
            <div className="mt-3 text-display font-semibold tracking-tight text-ink tabular-nums">
              ₹{money.wasted.value.toLocaleString()}
            </div>
            <span className="text-caption text-ink-secondary">
              Cumulative loss in period
            </span>
          </Card>

          <Card className="p-card">
            <div className="flex items-center justify-between">
              <span className="text-caption text-ink-secondary">Verified Saved</span>
              <TagPill tag={money.saved.tag} />
            </div>
            <div className="mt-3 text-display font-semibold tracking-tight text-brand tabular-nums">
              ₹{money.saved.value.toLocaleString()}
            </div>
            <span className="text-caption text-ink-secondary">
              Locked in via completed tickets
            </span>
          </Card>

          <Card className="p-card">
            <div className="flex items-center justify-between">
              <span className="text-caption text-ink-secondary">Recoverable Monthly</span>
              <TagPill tag={money.recoverable_per_month.tag} />
            </div>
            <div className="mt-3 text-display font-semibold tracking-tight text-ink tabular-nums">
              ₹{money.recoverable_per_month.value.toLocaleString()}
            </div>
            <span className="text-caption text-ink-secondary">
              If remaining open tickets resolved
            </span>
          </Card>
        </div>
      </section>

      {/* 4. Carbon & Ecological Impact Section */}
      <section className="print-section flex flex-col gap-4">
        <h2 className="text-section font-semibold text-ink">
          Carbon & Ecological Stewardship
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Card className="p-card">
            <div className="flex items-center justify-between">
              <span className="text-caption text-ink-secondary">Carbon Wasted</span>
              <TagPill tag={carbon.wasted.tag} />
            </div>
            <div className="mt-3 text-display font-semibold tracking-tight text-ink tabular-nums">
              {carbon.wasted.value.toLocaleString()}
            </div>
            <span className="text-caption text-ink-secondary">kg CO2e emitted</span>
          </Card>

          <Card className="p-card">
            <div className="flex items-center justify-between">
              <span className="text-caption text-ink-secondary">Carbon Avoided</span>
              <TagPill tag={carbon.avoided.tag} />
            </div>
            <div className="mt-3 text-display font-semibold tracking-tight text-brand tabular-nums">
              {carbon.avoided.value.toLocaleString()}
            </div>
            <span className="text-caption text-ink-secondary">kg CO2e permanently prevented</span>
          </Card>

          <Card className="p-card">
            <div className="flex items-center justify-between">
              <span className="text-caption text-ink-secondary">Trees Equivalent</span>
              <TagPill tag={carbon.trees_equivalent.tag} />
            </div>
            <div className="mt-3 text-display font-semibold tracking-tight text-ink tabular-nums">
              {carbon.trees_equivalent.value}
            </div>
            <span className="text-caption text-ink-secondary">
              Equivalent tree-years of sequestration
            </span>
          </Card>
        </div>
      </section>

      {/* 5. Native Resource Accounting */}
      <section className="print-section flex flex-col gap-4">
        <h2 className="text-section font-semibold text-ink">
          Native Resource Accounting
        </h2>
        <Card className="divide-y divide-hairline p-0">
          {/* Electricity */}
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-control bg-res-electricity/10 text-res-electricity">
                <Zap className="h-5 w-5" />
              </span>
              <div>
                <span className="font-medium text-ink">Electricity</span>
                <p className="text-caption text-ink-secondary">
                  Wasted: {units.kwh_wasted.value.toLocaleString()} kWh
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="font-semibold text-ink tabular-nums">
                  {units.kwh_saved.value.toLocaleString()} kWh saved
                </div>
                <span className="text-caption text-ink-secondary">Verified counterfactual</span>
              </div>
              <TagPill tag={units.kwh_saved.tag} />
            </div>
          </div>

          {/* Water */}
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-control bg-res-water/10 text-res-water">
                <Droplets className="h-5 w-5" />
              </span>
              <div>
                <span className="font-medium text-ink">Water</span>
                <p className="text-caption text-ink-secondary">
                  Wasted: {units.kl_wasted.value.toLocaleString()} kL
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="font-semibold text-ink tabular-nums">
                  {units.kl_saved.value.toLocaleString()} kL saved
                </div>
                <span className="text-caption text-ink-secondary">Verified night baseline</span>
              </div>
              <TagPill tag={units.kl_saved.tag} />
            </div>
          </div>

          {/* Waste */}
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-control bg-res-waste/10 text-res-waste">
                <Recycle className="h-5 w-5" />
              </span>
              <div>
                <span className="font-medium text-ink">Waste Segregated</span>
                <p className="text-caption text-ink-secondary">
                  Physical bin audits logged
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="font-semibold text-ink tabular-nums">
                  {units.kg_segregated.value.toLocaleString()} kg segregated
                </div>
                <span className="text-caption text-ink-secondary">Compliant disposal</span>
              </div>
              <TagPill tag={units.kg_segregated.tag} />
            </div>
          </div>
        </Card>
      </section>

      {/* 6. Action Queue & Featured Before/After Verification */}
      <section className="print-section flex flex-col gap-4">
        <h2 className="text-section font-semibold text-ink">
          Operational Ticket Pipeline
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Card className="flex items-center justify-between p-4">
            <div>
              <span className="text-caption text-ink-secondary">Raised</span>
              <div className="text-section font-semibold text-ink tabular-nums">
                {actions.raised.value} tickets
              </div>
            </div>
            <TagPill tag={actions.raised.tag} />
          </Card>
          <Card className="flex items-center justify-between p-4">
            <div>
              <span className="text-caption text-ink-secondary">Resolved</span>
              <div className="text-section font-semibold text-ink tabular-nums">
                {actions.resolved.value} tickets
              </div>
            </div>
            <TagPill tag={actions.resolved.tag} />
          </Card>
          <Card className="flex items-center justify-between p-4">
            <div>
              <span className="text-caption text-ink-secondary">Verified</span>
              <div className="text-section font-semibold text-brand tabular-nums">
                {actions.verified.value} tickets
              </div>
            </div>
            <TagPill tag={actions.verified.tag} />
          </Card>
        </div>

        {/* Featured Verification Example */}
        {actions.top_example && (
          <Card className="border-brand/30 bg-surface p-card">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-brand" />
                <span className="text-caption font-semibold uppercase tracking-wider text-brand">
                  Featured Proof: Ticket #{actions.top_example.ticket_id}
                </span>
              </div>
              <TagPill tag="verified" />
            </div>
            <h3 className="mt-2 text-section font-semibold text-ink">
              {actions.top_example.title}
            </h3>
            <p className="mt-1 text-caption text-ink-secondary">
              Hardware verification confirmed zero recurrence following technician remediation.
            </p>

            <div className="mt-4 grid grid-cols-3 gap-3 rounded-control bg-canvas p-3 text-caption">
              <div>
                <span className="text-ink-secondary">Physical Conserved</span>
                <div className="font-semibold text-ink tabular-nums">
                  {actions.top_example.saved_units} {actions.top_example.unit}
                </div>
              </div>
              <div>
                <span className="text-ink-secondary">Verified Rupees Saved</span>
                <div className="font-semibold text-brand tabular-nums">
                  ₹{actions.top_example.saved_inr.toLocaleString()}
                </div>
              </div>
              <div>
                <span className="text-ink-secondary">Carbon Prevented</span>
                <div className="font-semibold text-ink tabular-nums">
                  {actions.top_example.saved_co2e_kg} kg CO2e
                </div>
              </div>
            </div>
          </Card>
        )}
      </section>

      {/* 7. Top 5 Ongoing Campus Wastes */}
      <section className="print-section flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-section font-semibold text-ink">
            Top Ongoing Campus Wastes
          </h2>
          <span className="text-caption text-ink-secondary">
            Prioritized by daily financial burn
          </span>
        </div>

        <Card className="divide-y divide-hairline p-0">
          {top_wastes.length === 0 ? (
            <div className="p-6 text-center text-caption text-ink-secondary">
              No active anomalies detected across campus meters.
            </div>
          ) : (
            top_wastes.map((w, idx) => (
              <div key={w.anomaly_id} className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded-pill bg-canvas text-caption font-semibold text-ink">
                    {idx + 1}
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-ink">{w.location_name}</span>
                      <span className="rounded-pill bg-canvas px-2 py-0.5 text-caption text-ink-secondary">
                        {w.location_code}
                      </span>
                    </div>
                    <span className="text-caption capitalize text-ink-secondary">
                      {w.resource} • Priority: {w.priority}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="font-semibold text-ink tabular-nums">
                      ₹{w.daily_cost_inr ? `${w.daily_cost_inr.toFixed(0)}/day` : "—"}
                    </span>
                    <p className="text-caption text-ink-secondary">
                      ₹{w.avoidable_inr ? w.avoidable_inr.toLocaleString() : 0} total
                    </p>
                  </div>
                  <TagPill tag="estimated" />
                </div>
              </div>
            ))
          )}
        </Card>
      </section>

      {/* 8. Method & Audit Footer */}
      <footer className="print-section flex flex-col gap-4 border-t border-hairline pt-6 text-caption text-ink-secondary">
        <div>
          <span className="font-semibold text-ink">Audit Methodology & Constants</span>
          <p className="mt-1">
            Tariffs applied: Electricity ₹{method.rates.tariff_inr_per_kwh}/kWh, Water ₹{method.rates.water_inr_per_kl}/kL.
            Grid emissions calculated at {method.rates.ef_grid_kg_per_kwh} kg CO2e/kWh (CEA Baseline Database).
            Water pumping/treatment emissions calculated at {method.rates.ef_water_kg_per_kl} kg CO2e/kL.
          </p>
        </div>

        <div>
          <span className="font-semibold text-ink">Disclosed Libraries & Technologies</span>
          <p className="mt-1">
            Next.js 15 App Router, TypeScript, SQLite (better-sqlite3), Vitest, Recharts, TanStack Query, Zustand, Zod, Framer Motion, Groq & Gemini Vision API.
          </p>
        </div>

        <div className="rounded-control bg-canvas p-4 text-ink-secondary">
          <span className="font-medium text-ink">Simulated Data Statement: </span>
          {method.simulated_statement}
        </div>
      </footer>
    </div>
  );
}
