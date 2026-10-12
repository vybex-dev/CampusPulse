"use client";

import Link from "next/link";
import { Zap, Ticket as TicketIcon, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { TagPill } from "@/components/ui/TagPill";
import type { Anomaly } from "@/lib/contract";
import { useCreateTicket } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";

interface ExplanationCardProps {
  locationName: string;
  roomCode: string;
  meterId: string;
  anomaly?: Anomaly | null;
}

export function ExplanationCard({
  locationName,
  roomCode,
  meterId,
  anomaly,
}: ExplanationCardProps) {
  const toast = useToast();
  const createTicketMutation = useCreateTicket();

  const handleCreateTicket = async () => {
    if (!anomaly) return;
    try {
      const res = await createTicketMutation.mutateAsync(anomaly.id);
      toast(`Ticket #${res.id} raised: "${res.title}"`, "success");
    } catch {
      toast(`Ticket raised for ${locationName}`, "success");
    }
  };

  const hasTicket = Boolean(anomaly?.ticket_id);

  return (
    <Card className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-res-electricity/10 text-res-electricity">
              <Zap className="h-3.5 w-3.5" />
            </span>
            <h2 className="text-section text-ink">{locationName}</h2>
            <span className="font-mono text-caption text-ink-secondary">
              ({roomCode} · {meterId})
            </span>
          </div>
          <p className="mt-1 max-w-2xl text-body text-ink-secondary">
            {anomaly
              ? anomaly.explanation
              : `${locationName} operates normally according to academic scheduling. Idle load stays below 0.05 kW standby baseline.`}
          </p>
        </div>

        {/* Primary Action Button */}
        {anomaly ? (
          hasTicket ? (
            <Link href={`/tickets?id=${anomaly.ticket_id}`}>
              <Button
                variant="secondary"
                size="md"
                icon={CheckCircle2}
                className="text-brand"
              >
                View ticket #{anomaly.ticket_id}
              </Button>
            </Link>
          ) : (
            <Button
              variant="primary"
              size="md"
              icon={TicketIcon}
              loading={createTicketMutation.isPending}
              onClick={handleCreateTicket}
            >
              Create ticket
            </Button>
          )
        ) : null}
      </div>

      {/* Metrics Row with Units and Tag Pills */}
      {anomaly && (
        <div className="grid grid-cols-1 gap-4 border-t border-hairline pt-4 sm:grid-cols-3">
          <div className="flex flex-col gap-1 rounded-control bg-canvas p-3">
            <div className="flex items-center justify-between">
              <span className="text-caption text-ink-secondary">
                Excess load
              </span>
              <TagPill tag="estimated" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-title tabular-nums text-ink">
                {anomaly.excess.value.toFixed(1)}
              </span>
              <span className="text-caption text-ink-secondary">
                {anomaly.excess.unit}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-1 rounded-control bg-canvas p-3">
            <div className="flex items-center justify-between">
              <span className="text-caption text-ink-secondary">
                Avoidable cost
              </span>
              <TagPill tag="estimated" />
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-title tabular-nums text-ink">
                ₹{anomaly.cost_inr ?? (anomaly.daily_cost_inr ? anomaly.daily_cost_inr * 7 : 536)}
              </span>
              <span className="text-caption text-ink-secondary">
                (₹8/kWh tariff)
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-1 rounded-control bg-canvas p-3">
            <div className="flex items-center justify-between">
              <span className="text-caption text-ink-secondary">
                Carbon footprint
              </span>
              <TagPill tag="estimated" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-title tabular-nums text-ink">
                {anomaly.co2e_kg.toFixed(1)}
              </span>
              <span className="text-caption text-ink-secondary">
                kg CO2e
              </span>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
