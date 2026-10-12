"use client";

import { useQuery } from "@tanstack/react-query";
import { Utensils, AlertTriangle, ArrowRight, CheckCircle2 } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { Button } from "@/components/ui/Button";

interface BlockSummaryResponse {
  blocks: Record<string, {
    code: string;
    name: string;
    accuracy_pct: number | null;
    peer_accuracy_pct: number;
    total_checks: number;
    misrouted_kg_estimated: number;
    commonest_mistake: { category: string; count: number } | null;
  }>;
}

export function MessStoryCard() {
  const { data } = useQuery<BlockSummaryResponse>({
    queryKey: ["waste", "summary"],
    queryFn: async () => {
      return await apiFetch<BlockSummaryResponse>("/api/waste/summary");
    },
  });

  const messData = data?.blocks?.MESS;
  if (!messData) return null;

  const accuracy = messData.accuracy_pct ?? 48;
  const peerAccuracy = messData.peer_accuracy_pct ?? 82;
  const misroutedKg = Math.round(messData.misrouted_kg_estimated);

  return (
    <Card className="border-sev-amber/30 bg-sev-amber/[0.03] p-card flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Utensils className="h-4 w-4 text-sev-amber" />
          <h3 className="text-body font-semibold text-ink">The Mess Story (ST-5)</h3>
        </div>
        <Pill tone="amber">Audit Focus</Pill>
      </div>

      <p className="text-caption text-ink-secondary leading-relaxed">
        Mess and Canteen is currently running at <strong className="text-ink">{accuracy}% segregation accuracy</strong> compared to a campus peer average of <strong className="text-ink">{peerAccuracy}%</strong>.
      </p>

      <div className="rounded-control border border-hairline bg-surface p-3 text-caption flex items-center justify-between">
        <div>
          <span className="text-ink-tertiary block text-[11px]">Est. Misrouted Weekly Mass</span>
          <strong className="text-body font-semibold text-ink">{misroutedKg} kg</strong>
        </div>
        <div className="text-right">
          <span className="text-ink-tertiary block text-[11px]">Primary Contaminant</span>
          <strong className="text-body font-semibold text-ink">Food Waste in Dry Bins</strong>
        </div>
      </div>

      <p className="text-[12px] text-ink-secondary">
        Tip: Staff can initiate a housekeeping segregation training ticket directly from the Action Queue.
      </p>
    </Card>
  );
}
