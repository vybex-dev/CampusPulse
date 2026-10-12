"use client";

import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceDot,
} from "recharts";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { TimetableStrip } from "./TimetableStrip";
import type { ElectricitySeriesPoint } from "@/lib/mocks";

interface UsageChartProps {
  series: ElectricitySeriesPoint[];
  unit?: string;
  loading?: boolean;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    payload: ElectricitySeriesPoint;
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
          {data.value} kW
        </span>
        <span className="text-caption text-ink-tertiary">
          (Expected: {data.expectedMin}-{data.expectedMax} kW)
        </span>
      </div>
      <div className="mt-1 flex items-center gap-1.5 text-caption">
        <span
          className={`h-2 w-2 rounded-full ${
            data.isAnomaly
              ? "bg-sev-red"
              : data.scheduled
                ? "bg-brand"
                : "bg-ink-tertiary"
          }`}
        />
        <span className="text-ink-secondary">
          {data.isAnomaly
            ? "Unscheduled Load Anomaly"
            : data.scheduled
              ? "Scheduled Class Slot"
              : "Unscheduled Standby"}
        </span>
      </div>
    </div>
  );
}

export function UsageChart({
  series,
  unit = "kW",
  loading = false,
}: UsageChartProps) {
  if (loading) {
    return (
      <Card className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-24" />
        </div>
        <Skeleton className="h-72 w-full" />
      </Card>
    );
  }

  // Find points flagged as anomaly for red highlight markers
  const anomalyPoints = series.filter((p) => p.isAnomaly);

  return (
    <Card className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-section text-ink">Hourly Electricity Load</h3>
          <p className="text-body text-ink-secondary">
            Measured active load against expected schedule baseline and 12% tolerance band.
          </p>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 text-caption font-medium text-ink-secondary">
          <div className="flex items-center gap-1.5">
            <span
              className="h-0.5 w-4"
              style={{ backgroundColor: "#7C3AED" }}
            />
            <span>Actual load</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span
              className="h-2 w-4 rounded-sm"
              style={{ backgroundColor: "rgba(124, 58, 237, 0.12)" }}
            />
            <span>Expected band</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: "#DC2626" }}
            />
            <span>Anomaly</span>
          </div>
        </div>
      </div>

      {/* Chart container */}
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={series}
            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
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

            {/* Expected upper band as 12% fill */}
            <Area
              type="monotone"
              dataKey="expectedMax"
              fill="#7C3AED"
              fillOpacity={0.12}
              stroke="none"
              isAnimationActive={false}
            />

            {/* Expected lower cutout */}
            <Area
              type="monotone"
              dataKey="expectedMin"
              fill="#FFFFFF"
              fillOpacity={1}
              stroke="none"
              isAnimationActive={false}
            />

            {/* Single-hue 2px line for actual usage */}
            <Line
              type="monotone"
              dataKey="value"
              stroke="#7C3AED"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 5, fill: "#7C3AED", stroke: "#FFFFFF", strokeWidth: 2 }}
            />

            {/* Red dots on anomaly spans */}
            {anomalyPoints.map((pt, i) => (
              <ReferenceDot
                key={i}
                x={pt.hour}
                y={pt.value}
                r={4}
                fill="#DC2626"
                stroke="#FFFFFF"
                strokeWidth={1.5}
              />
            ))}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* TimetableStrip aligned with the x-axis */}
      <div className="border-t border-hairline pt-4">
        <h4 className="text-caption font-semibold uppercase tracking-wider text-ink-secondary">
          Timetable Occupancy Schedule
        </h4>
        <TimetableStrip series={series} />
      </div>
    </Card>
  );
}
