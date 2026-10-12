"use client";

import {
  Zap,
  Droplets,
  Recycle,
  Calendar,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  Clock,
  Wrench,
} from "lucide-react";
import type { Ticket, Resource, Team } from "@/lib/contract";
import { Pill, type PillTone } from "@/components/ui/Pill";
import { TagPill } from "@/components/ui/TagPill";
import { cn } from "@/lib/cn";

interface TicketCardProps {
  ticket: Ticket;
  onClick: () => void;
  onResolve?: () => void;
  onAdvanceToVerifying?: () => void;
  onStartProgress?: () => void;
  role?: string;
}

const RESOURCE_ICONS: Record<Resource, typeof Zap> = {
  electricity: Zap,
  water: Droplets,
  waste: Recycle,
};

const RESOURCE_TONES: Record<Resource, PillTone> = {
  electricity: "electricity",
  water: "water",
  waste: "waste",
};

const PRIORITY_TONES: Record<string, PillTone> = {
  high: "red",
  medium: "amber",
  low: "neutral",
};

const TEAM_LABELS: Record<Team, string> = {
  electrical: "Electrical",
  plumbing: "Plumbing",
  housekeeping: "Housekeeping",
};

export function TicketCard({
  ticket,
  onClick,
  onResolve,
  onAdvanceToVerifying,
  onStartProgress,
  role = "staff",
}: TicketCardProps) {
  const ResourceIcon = RESOURCE_ICONS[ticket.resource] ?? Zap;
  const resourceTone = RESOURCE_TONES[ticket.resource] ?? "neutral";
  const priorityTone = PRIORITY_TONES[ticket.priority] ?? "neutral";
  const canAct = role === "admin" || role === "staff";

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      className={cn(
        "group relative flex flex-col justify-between rounded-card border bg-surface p-5 text-left transition-all duration-200 cursor-pointer shadow-card hover:shadow-drawer focus:outline-none focus:ring-2 focus:ring-brand",
        ticket.status === "reopened"
          ? "border-sev-red/40 bg-sev-red/[0.02]"
          : "border-hairline hover:border-ink/20",
      )}
    >
      <div>
        {/* Top Badges */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            <Pill tone={resourceTone} icon={ResourceIcon}>
              <span className="capitalize">{ticket.resource}</span>
            </Pill>
            <Pill tone={priorityTone}>
              <span className="capitalize">{ticket.priority}</span>
            </Pill>
            {ticket.status === "reopened" && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-pill text-caption font-semibold bg-sev-red/10 text-sev-red">
                <RotateCcw className="h-3 w-3" />
                Reopened
              </span>
            )}
          </div>
          <span className="text-caption font-mono text-ink-tertiary">
            #{ticket.id}
          </span>
        </div>

        {/* Title */}
        <h4 className="text-body font-semibold text-ink line-clamp-2 leading-snug group-hover:text-brand transition-colors">
          {ticket.title}
        </h4>

        {/* Location & Team */}
        <div className="mt-2.5 flex items-center justify-between gap-2 text-caption text-ink-secondary">
          <span className="truncate" title={ticket.location_name}>
            {ticket.location_name}
          </span>
          <span className="shrink-0 inline-flex items-center gap-1 font-medium bg-canvas px-2 py-0.5 rounded-pill border border-hairline text-ink-secondary">
            <Wrench className="h-3 w-3" />
            {TEAM_LABELS[ticket.team] ?? ticket.team}
          </span>
        </div>
      </div>

      {/* Footer Info: Cost chip and quick action */}
      <div className="mt-4 pt-3 border-t border-hairline flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          {ticket.daily_cost_inr !== null && ticket.daily_cost_inr > 0 ? (
            <div className="flex items-center gap-1 text-caption">
              <span className="font-semibold text-ink tabular-nums">
                ₹{Math.round(ticket.daily_cost_inr).toLocaleString("en-IN")}/day
              </span>
              <TagPill tag="estimated" className="scale-90 origin-left" />
            </div>
          ) : ticket.resource === "waste" ? (
            <span className="text-caption text-ink-tertiary">Waste check</span>
          ) : (
            <span className="text-caption text-ink-tertiary">Usage issue</span>
          )}
        </div>

        {/* Inline Quick Action Buttons depending on status */}
        {canAct && (
          <div className="flex items-center gap-1">
            {ticket.status === "open" && onStartProgress && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onStartProgress();
                }}
                className="px-2.5 py-1 text-caption font-medium rounded-pill bg-canvas text-ink hover:bg-brand/10 hover:text-brand transition-colors border border-hairline"
              >
                Start
              </button>
            )}
            {ticket.status === "in_progress" && onResolve && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onResolve();
                }}
                className="px-2.5 py-1 text-caption font-medium rounded-pill bg-brand text-surface hover:bg-brand-hover transition-colors"
              >
                Resolve
              </button>
            )}
            {ticket.status === "resolved" && onAdvanceToVerifying && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onAdvanceToVerifying();
                }}
                className="px-2.5 py-1 text-caption font-medium rounded-pill bg-canvas text-ink hover:bg-ink/5 transition-colors border border-hairline"
              >
                Verify
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
