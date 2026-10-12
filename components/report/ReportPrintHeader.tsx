"use client";

import { Printer, Calendar, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { ReportPeriod } from "@/lib/contract";
import { formatSimClock } from "@/lib/format";

interface ReportPrintHeaderProps {
  period: ReportPeriod;
  onPeriodChange: (p: ReportPeriod) => void;
  generatedAt: string;
  dataFrom: string;
  dataTo: string;
}

export function ReportPrintHeader({
  period,
  onPeriodChange,
  generatedAt,
  dataFrom,
  dataTo,
}: ReportPrintHeaderProps) {
  return (
    <div className="flex flex-col gap-4 border-b border-hairline pb-6">
      {/* Top action row (hidden in print) */}
      <div className="flex flex-wrap items-center justify-between gap-4 no-print">
        <div className="flex items-center gap-3">
          <div className="flex rounded-control border border-hairline bg-surface p-1">
            <button
              type="button"
              onClick={() => onPeriodChange("7")}
              className={`rounded-control px-3 py-1.5 text-caption font-medium transition-colors ${
                period === "7"
                  ? "bg-brand text-surface"
                  : "text-ink-secondary hover:text-ink"
              }`}
            >
              7 Days
            </button>
            <button
              type="button"
              onClick={() => onPeriodChange("30")}
              className={`rounded-control px-3 py-1.5 text-caption font-medium transition-colors ${
                period === "30"
                  ? "bg-brand text-surface"
                  : "text-ink-secondary hover:text-ink"
              }`}
            >
              30 Days
            </button>
            <button
              type="button"
              onClick={() => onPeriodChange("all")}
              className={`rounded-control px-3 py-1.5 text-caption font-medium transition-colors ${
                period === "all"
                  ? "bg-brand text-surface"
                  : "text-ink-secondary hover:text-ink"
              }`}
            >
              Since start
            </button>
          </div>
          <span className="rounded-pill border border-hairline bg-surface px-2.5 py-1 text-caption font-medium text-ink-secondary">
            Simulated data
          </span>
        </div>

        <Button
          variant="primary"
          size="sm"
          icon={Printer}
          onClick={() => window.print()}
        >
          Print / Export PDF
        </Button>
      </div>

      {/* Printable header document banner */}
      <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-baseline">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-caption font-semibold uppercase tracking-wider text-brand">
              Official Verification Audit
            </span>
            <ShieldCheck className="h-4 w-4 text-brand" />
          </div>
          <h1 className="mt-1 text-title font-semibold tracking-tight text-ink">
            Campus Sustainability Impact Report
          </h1>
        </div>

        <div className="flex flex-col text-right text-caption text-ink-secondary">
          <div className="flex items-center gap-1 sm:justify-end">
            <Calendar className="h-3.5 w-3.5" />
            <span>Observation: {formatSimClock(dataFrom)} – {formatSimClock(dataTo)}</span>
          </div>
          <span className="mt-0.5">Generated: {formatSimClock(generatedAt)}</span>
        </div>
      </div>
    </div>
  );
}
