"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from "recharts";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import type { PerCapitaBlockReport } from "@/lib/analytics/water";

interface PerCapitaChartProps {
  data: PerCapitaBlockReport[];
  loading?: boolean;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: PerCapitaBlockReport;
  }>;
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || !payload.length) return null;
  const item = payload[0].payload;

  return (
    <div className="rounded-control border border-hairline bg-surface p-3 shadow-card">
      <div className="text-body font-semibold text-ink">{item.block_code}</div>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="text-body font-semibold text-ink">
          {item.actual_l} L/person/day
        </span>
        <span className="text-caption text-ink-tertiary">
          (Target: {item.target_l} L)
        </span>
      </div>
      <div className="mt-1 text-caption">
        <span className="text-ink-secondary">Ratio: </span>
        <span
          className={`font-semibold ${
            item.is_flagged ? "text-sev-red" : "text-ink"
          }`}
        >
          {item.ratio_pct}% of target
        </span>
        {item.is_flagged && " (Exceeds 120% threshold)"}
      </div>
    </div>
  );
}

export function PerCapitaChart({
  data,
  loading = false,
}: PerCapitaChartProps) {
  if (loading) {
    return (
      <Card className="flex flex-col gap-6">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-60 w-full" />
      </Card>
    );
  }

  return (
    <Card className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-section text-ink">
            Per-Capita Daily Water Consumption
          </h3>
          <p className="text-body text-ink-secondary">
            Trailing 7-day average per occupant. Highlighted when exceeding 120% of design target.
          </p>
        </div>

        <div className="flex items-center gap-4 text-caption font-medium text-ink-secondary">
          <div className="flex items-center gap-1.5">
            <span
              className="h-3 w-3 rounded-sm"
              style={{ backgroundColor: "#0EA5E9" }}
            />
            <span>Within target</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span
              className="h-3 w-3 rounded-sm"
              style={{ backgroundColor: "#DC2626" }}
            />
            <span>Above 120% threshold</span>
          </div>
        </div>
      </div>

      <div className="h-60 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
          >
            <CartesianGrid
              stroke="rgba(0,0,0,0.06)"
              strokeDasharray="0"
              vertical={false}
            />

            <XAxis
              dataKey="block_code"
              stroke="#A1A1A6"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: "rgba(0,0,0,0.08)" }}
            />

            <YAxis
              stroke="#A1A1A6"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              unit=" L"
            />

            <Tooltip content={<CustomTooltip />} />

            <Bar dataKey="actual_l" radius={[6, 6, 0, 0]}>
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.is_flagged ? "#DC2626" : "#0EA5E9"}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t border-hairline pt-3 text-caption text-ink-secondary">
        <span className="font-semibold text-ink">Threshold Note:</span>
        <span>
          Hostels have a target of 120 L/day/resident (flagged at &gt;144 L).
          Academic blocks target 20 L/day/user.
        </span>
      </div>
    </Card>
  );
}
