"use client";

import type { ElectricitySeriesPoint } from "@/lib/mocks";

interface TimetableStripProps {
  series: ElectricitySeriesPoint[];
}

export function TimetableStrip({ series }: TimetableStripProps) {
  // Show first 24-48 hours sample if long series, or compressed blocks
  const displaySlice = series.slice(0, 48);

  return (
    <div className="flex flex-col gap-1.5 pt-2">
      <div className="flex items-center justify-between text-[11px] font-medium text-ink-secondary">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-sm bg-brand" />
          Scheduled Teaching Slot
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-sm bg-ink/10" />
          Unscheduled / Standby Slot
        </span>
      </div>

      {/* SVG strip aligned horizontally */}
      <div className="h-6 w-full rounded-control border border-hairline bg-canvas">
        <svg
          viewBox={`0 0 ${displaySlice.length * 10} 24`}
          preserveAspectRatio="none"
          className="h-full w-full"
        >
          {displaySlice.map((pt, i) => (
            <rect
              key={pt.ts}
              x={i * 10}
              y="0"
              width="9.5"
              height="24"
              fill={pt.scheduled ? "#1E7F5C" : "rgba(0,0,0,0.06)"}
              rx="1.5"
            >
              <title>{`${pt.ts}: ${pt.scheduled ? "Scheduled lecture" : "Unscheduled"}`}</title>
            </rect>
          ))}
        </svg>
      </div>

      <div className="flex justify-between text-[10px] text-ink-tertiary">
        <span>00:00 (Day 1)</span>
        <span>12:00</span>
        <span>23:00</span>
        <span>12:00 (Day 2)</span>
        <span>23:00</span>
      </div>
    </div>
  );
}
