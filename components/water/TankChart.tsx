"use client";

import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from "recharts";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import type { TankSeriesPoint } from "@/lib/mocks";

interface TankChartProps {
  series: TankSeriesPoint[];
  tankMeterId?: string;
  loading?: boolean;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    payload: TankSeriesPoint;
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
          {data.levelPct}% Capacity
        </span>
        <span className="text-caption text-ink-tertiary">
          (Inflow: {data.inflowLph} L/h)
        </span>
      </div>
      {data.isOverflow && (
        <div className="mt-1 flex items-center gap-1.5 text-caption font-medium text-sev-red">
          <span className="h-2 w-2 rounded-full bg-sev-red" />
          Tank Overflow Inflow Alarm (≥99.5%)
        </div>
      )}
    </div>
  );
}

export function TankChart({
  series,
  tankMeterId = "T-AB-B",
  loading = false,
}: TankChartProps) {
  if (loading) {
    return (
      <Card className="flex flex-col gap-6">
        <Skeleton className="h-6 w-44" />
        <Skeleton className="h-60 w-full" />
      </Card>
    );
  }

  return (
    <Card className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-section text-ink">
            Rooftop Water Tank Levels ({tankMeterId})
          </h3>
          <p className="text-body text-ink-secondary">
            Continuous level sensor. Flagged when levels reach ≥99.5% with ongoing high inflow.
          </p>
        </div>

        <div className="flex items-center gap-4 text-caption font-medium text-ink-secondary">
          <div className="flex items-center gap-1.5">
            <span
              className="h-0.5 w-4"
              style={{ backgroundColor: "#0EA5E9" }}
            />
            <span>Water level (%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span
              className="h-0.5 w-4 border-b border-dashed border-sev-red"
            />
            <span>Overflow threshold (99.5%)</span>
          </div>
        </div>
      </div>

      <div className="h-60 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={series}
            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
          >
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
              interval={Math.ceil(series.length / 10)}
            />

            <YAxis
              domain={[0, 100]}
              stroke="#A1A1A6"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              unit="%"
            />

            <Tooltip content={<CustomTooltip />} />

            {/* Overflow cutoff reference line */}
            <ReferenceLine
              y={99.5}
              stroke="#DC2626"
              strokeDasharray="3 3"
              strokeWidth={1.5}
              label={{
                value: "Overflow (99.5%)",
                position: "insideBottomRight",
                fill: "#DC2626",
                fontSize: 10.5,
              }}
            />

            {/* 2px single-hue sky line */}
            <Line
              type="monotone"
              dataKey="levelPct"
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
