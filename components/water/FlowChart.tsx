"use client";

import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceArea,
  ReferenceLine,
} from "recharts";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import type { WaterSeriesPoint } from "@/lib/mocks";

interface FlowChartProps {
  series: WaterSeriesPoint[];
  blockName: string;
  baseline?: number;
  unit?: string;
  loading?: boolean;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    payload: WaterSeriesPoint;
  }>;
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || !payload.length) return null;
  const data = payload[0].payload;

  return (
    <div className="rounded-control border border-hairline bg-surface p-3 shadow-card">
      <div className="font-mono text-caption text-ink-secondary">{data.ts}</div>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="text-body font-semibold text-ink">
          {data.value} L/h
        </span>
        <span className="text-caption text-ink-tertiary">
          (Baseline: {data.baseline} L/h)
        </span>
      </div>
      <div className="mt-1 flex items-center gap-1.5 text-caption">
        <span
          className={`h-2 w-2 rounded-full ${
            data.isLeak
              ? "bg-sev-red"
              : data.isNightWindow
                ? "bg-res-water"
                : "bg-ink-tertiary"
          }`}
        />
        <span className="text-ink-secondary">
          {data.isLeak
            ? "Nocturnal Leak Detected"
            : data.isNightWindow
              ? "02:00-04:00 Night Window"
              : "Standard Consumption"}
        </span>
      </div>
    </div>
  );
}

export function FlowChart({
  series,
  blockName,
  baseline = 120,
  unit = "L/h",
  loading = false,
}: FlowChartProps) {
  if (loading) {
    return (
      <Card className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-28" />
        </div>
        <Skeleton className="h-72 w-full" />
      </Card>
    );
  }

  // Find night window timestamps for reference area shading (e.g. 02:00 to 04:00)
  const nightWindows = series.filter((p) => p.isNightWindow);
  const firstNightHour = nightWindows[0]?.hour;
  const lastNightHour = nightWindows[nightWindows.length - 1]?.hour;

  return (
    <Card className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-section text-ink">
            Water Flow Telemetry & Night Leak Auditing
          </h3>
          <p className="text-body text-ink-secondary">
            Continuous main inflow for {blockName}. The 02:00–04:00 nocturnal window isolates leaks when legitimate draw is minimal.
          </p>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 text-caption font-medium text-ink-secondary">
          <div className="flex items-center gap-1.5">
            <span
              className="h-0.5 w-4"
              style={{ backgroundColor: "#0EA5E9" }}
            />
            <span>Actual flow</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span
              className="h-2 w-4 rounded-sm"
              style={{ backgroundColor: "rgba(14, 165, 233, 0.12)" }}
            />
            <span>02:00–04:00 Night window</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span
              className="h-0.5 w-4 border-b border-dashed border-ink-secondary"
            />
            <span>Baseline ({baseline} L/h)</span>
          </div>
        </div>
      </div>

      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={series}
            margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
          >
            {/* Faint horizontal gridlines only */}
            <CartesianGrid
              stroke="rgba(0,0,0,0.06)"
              strokeDasharray="0"
              vertical={false}
            />

            <XAxis
              dataKey="hour"
              stroke="#A1A1A6"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: "rgba(0,0,0,0.08)" }}
              interval={Math.ceil(series.length / 12)}
            />

            <YAxis
              stroke="#A1A1A6"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              unit={` ${unit}`}
            />

            <Tooltip content={<CustomTooltip />} />

            {/* Shaded 02:00-04:00 night window */}
            {firstNightHour && lastNightHour && (
              <ReferenceArea
                x1={firstNightHour}
                x2={lastNightHour}
                fill="#0EA5E9"
                fillOpacity={0.08}
                label={{
                  value: "02:00-04:00 Night Window",
                  position: "top",
                  fill: "#0EA5E9",
                  fontSize: 11,
                }}
              />
            )}

            {/* Dashed baseline */}
            <ReferenceLine
              y={baseline}
              stroke="#6E6E73"
              strokeDasharray="4 4"
              strokeWidth={1.5}
              label={{
                value: `Baseline: ${baseline} L/h`,
                position: "insideTopRight",
                fill: "#6E6E73",
                fontSize: 11,
              }}
            />

            {/* Actual flow line (2px single-hue sky) */}
            <Line
              type="monotone"
              dataKey="value"
              stroke="#0EA5E9"
              strokeWidth={2}
              dot={false}
              activeDot={{
                r: 5,
                fill: "#0EA5E9",
                stroke: "#FFFFFF",
                strokeWidth: 2,
              }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
