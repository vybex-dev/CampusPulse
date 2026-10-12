"use client";

import Link from "next/link";
import {
  Building2,
  Zap,
  Droplets,
  Trash2,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import { Drawer } from "@/components/ui/Drawer";
import { Pill } from "@/components/ui/Pill";
import { Button } from "@/components/ui/Button";
import { TagPill } from "@/components/ui/TagPill";
import {
  type BlockCode,
  type Severity,
  type Anomaly,
  BLOCK_NAMES,
} from "@/lib/contract";
import { cn } from "@/lib/cn";

interface BlockDrawerProps {
  block: BlockCode | null;
  severity: Severity;
  anomalies: Anomaly[];
  open: boolean;
  onClose: () => void;
}

const BLOCK_SUBTITLES: Record<BlockCode, string> = {
  "AB-A": "Engineering labs, lecture halls, and dean offices",
  "AB-B": "Management, sciences, and rooftop water tanks",
  LIB: "Central library, archive rooms, and administrative wing",
  "HST-1": "Boys residential hostel (600 capacity)",
  "HST-2": "Girls residential hostel (500 capacity)",
  MESS: "Central kitchen, dining hall, and food waste sorting bins",
};

export function BlockDrawer({
  block,
  severity,
  anomalies,
  open,
  onClose,
}: BlockDrawerProps) {
  if (!block) return null;

  const blockName = BLOCK_NAMES[block] ?? block;
  const blockAnomalies = anomalies.filter(
    (a) => a.location.block === block && a.status === "active",
  );

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={blockName}
      footer={
        <div className="flex items-center justify-between gap-3">
          <Button variant="secondary" size="sm" onClick={onClose}>
            Close
          </Button>
          <div className="flex items-center gap-2">
            <Link href={`/electricity?block=${block}`}>
              <Button variant="secondary" size="sm" icon={Zap}>
                Electricity
              </Button>
            </Link>
            <Link href={`/water?block=${block}`}>
              <Button variant="secondary" size="sm" icon={Droplets}>
                Water
              </Button>
            </Link>
          </div>
        </div>
      }
    >
      <div className="flex flex-col gap-6">
        {/* Block Header info */}
        <div className="flex flex-col gap-3 rounded-control border border-hairline bg-canvas p-4">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 font-mono text-caption font-semibold text-ink">
              <Building2 className="h-4 w-4 text-ink-secondary" />
              Code: {block}
            </span>
            <Pill tone={severity}>
              {severity === "green"
                ? "Normal"
                : severity === "amber"
                  ? "Elevated"
                  : "Critical"}
            </Pill>
          </div>
          <p className="text-body text-ink-secondary">
            {BLOCK_SUBTITLES[block] ?? "Campus building zone"}
          </p>
        </div>

        {/* Active Anomalies in Block */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="text-body font-semibold text-ink">
              Active Issues ({blockAnomalies.length})
            </h3>
            {blockAnomalies.length === 0 && (
              <span className="flex items-center gap-1 text-caption text-sev-green">
                <ShieldCheck className="h-3.5 w-3.5" />
                No active faults
              </span>
            )}
          </div>

          {blockAnomalies.length === 0 ? (
            <div className="rounded-control border border-hairline bg-surface p-6 text-center text-body text-ink-secondary">
              Everything in {block} is currently operating within expected baselines.
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {blockAnomalies.map((a) => {
                const Icon =
                  a.resource === "electricity"
                    ? Zap
                    : a.resource === "water"
                      ? Droplets
                      : Trash2;

                return (
                  <div
                    key={a.id}
                    className="flex flex-col gap-2 rounded-control border border-hairline bg-surface p-4 shadow-card"
                  >
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-caption font-medium text-ink">
                        <Icon
                          className={cn(
                            "h-4 w-4",
                            a.resource === "electricity" && "text-res-electricity",
                            a.resource === "water" && "text-res-water",
                            a.resource === "waste" && "text-res-waste",
                          )}
                        />
                        {a.location.name}
                      </span>
                      <Pill
                        tone={
                          a.priority === "high"
                            ? "red"
                            : a.priority === "medium"
                              ? "amber"
                              : "green"
                        }
                      >
                        {a.priority}
                      </Pill>
                    </div>

                    <p className="text-body text-ink-secondary">
                      {a.explanation}
                    </p>

                    <div className="mt-2 flex items-center justify-between border-t border-hairline pt-2 text-caption">
                      <div className="flex items-center gap-2">
                        {a.daily_cost_inr !== null && (
                          <span className="font-semibold tabular-nums text-ink">
                            ₹{a.daily_cost_inr}/day
                          </span>
                        )}
                        <TagPill tag="estimated" />
                      </div>
                      <Link
                        href={
                          a.resource === "electricity"
                            ? `/electricity?meter=${a.meter_id ?? ""}`
                            : a.resource === "water"
                              ? `/water?block=${block}`
                              : "/waste"
                        }
                        className="inline-flex items-center gap-1 text-caption font-medium text-brand hover:underline"
                      >
                        Inspect
                        <ArrowRight className="h-3 w-3" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Drawer>
  );
}
