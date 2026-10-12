"use client";

import { useState } from "react";
import {
  Zap,
  Droplets,
  Recycle,
  CheckCircle2,
  Clock,
  RotateCcw,
  User,
  Shield,
  GraduationCap,
  Cpu,
  ArrowRight,
  Send,
} from "lucide-react";
import type { TicketDetail, TicketStatus, Role } from "@/lib/contract";
import { Drawer } from "@/components/ui/Drawer";
import { Pill, type PillTone } from "@/components/ui/Pill";
import { TagPill } from "@/components/ui/TagPill";
import { Button } from "@/components/ui/Button";
import { VerificationCard } from "./VerificationCard";
import { ResolveDialog } from "./ResolveDialog";
import { useToast } from "@/components/ui/Toast";

interface TicketDrawerProps {
  open: boolean;
  ticket: TicketDetail | null;
  onClose: () => void;
  onUpdateStatus: (id: number, status: TicketStatus, note?: string) => Promise<void>;
  role: Role;
}

const RESOURCE_ICONS = {
  electricity: Zap,
  water: Droplets,
  waste: Recycle,
};

const RESOURCE_TONES: Record<string, PillTone> = {
  electricity: "electricity",
  water: "water",
  waste: "waste",
};

const ACTOR_ICONS: Record<string, typeof User> = {
  admin: Shield,
  staff: User,
  student: GraduationCap,
  system: Cpu,
};

export function TicketDrawer({
  open,
  ticket,
  onClose,
  onUpdateStatus,
  role,
}: TicketDrawerProps) {
  const toast = useToast();
  const [resolveDialogOpen, setResolveDialogOpen] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [noteText, setNoteText] = useState("");

  if (!ticket) return null;

  const ResourceIcon = RESOURCE_ICONS[ticket.resource] ?? Zap;
  const resourceTone = RESOURCE_TONES[ticket.resource] ?? "neutral";
  const canAct = role === "admin" || role === "staff";

  const handleAdvanceStatus = async (nextStatus: TicketStatus, note?: string) => {
    setUpdating(true);
    try {
      await onUpdateStatus(ticket.id, nextStatus, note);
      toast(`Ticket #${ticket.id} transitioned to ${nextStatus}`, "success");
    } catch (err: unknown) {
      toast((err as Error)?.message || "Failed to update ticket", "error");
    } finally {
      setUpdating(false);
    }
  };

  const handleAddNote = async () => {
    const trimmed = noteText.trim();
    if (!trimmed) return;
    setUpdating(true);
    try {
      await onUpdateStatus(ticket.id, ticket.status, trimmed);
      setNoteText("");
      toast("Note recorded in activity log", "success");
    } catch (err: unknown) {
      toast((err as Error)?.message || "Failed to add note", "error");
    } finally {
      setUpdating(false);
    }
  };

  return (
    <>
      <Drawer
        open={open}
        onClose={onClose}
        title={`Ticket #${ticket.id}`}
        footer={
          canAct ? (
            <div className="flex items-center justify-between gap-3">
              <div className="text-caption text-ink-secondary">
                Status: <strong className="capitalize text-ink">{ticket.status.replace("_", " ")}</strong>
              </div>
              <div className="flex items-center gap-2">
                {ticket.status === "open" && (
                  <Button
                    variant="primary"
                    size="sm"
                    loading={updating}
                    onClick={() => handleAdvanceStatus("in_progress")}
                  >
                    Start Progress
                  </Button>
                )}
                {ticket.status === "in_progress" && (
                  <Button
                    variant="primary"
                    size="sm"
                    loading={updating}
                    onClick={() => setResolveDialogOpen(true)}
                  >
                    Mark Resolved
                  </Button>
                )}
                {ticket.status === "resolved" && (
                  <Button
                    variant="primary"
                    size="sm"
                    loading={updating}
                    onClick={() => handleAdvanceStatus("verifying")}
                  >
                    Start Verification
                  </Button>
                )}
                {ticket.status === "reopened" && (
                  <Button
                    variant="primary"
                    size="sm"
                    loading={updating}
                    onClick={() => handleAdvanceStatus("in_progress")}
                  >
                    Resume In-Progress
                  </Button>
                )}
              </div>
            </div>
          ) : undefined
        }
      >
        <div className="flex flex-col gap-6">
          {/* Main Title & Badges */}
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <Pill tone={resourceTone} icon={ResourceIcon}>
                <span className="capitalize">{ticket.resource}</span>
              </Pill>
              <Pill tone={ticket.priority === "high" ? "red" : ticket.priority === "medium" ? "amber" : "neutral"}>
                <span className="capitalize">{ticket.priority} priority</span>
              </Pill>
              <Pill tone="neutral">
                <span className="capitalize">{ticket.team} team</span>
              </Pill>
            </div>
            <h3 className="text-section font-semibold text-ink leading-snug">
              {ticket.title}
            </h3>
            <p className="mt-1 text-body text-ink-secondary">
              {ticket.location_name}
            </p>
          </div>

          {/* Finding Explanation Card */}
          <div className="rounded-control border border-hairline bg-canvas p-4">
            <span className="text-caption font-medium uppercase tracking-wider text-ink-tertiary">
              Plain-English Finding
            </span>
            <p className="mt-1 text-body text-ink">
              {ticket.anomaly.explanation}
            </p>

            <div className="mt-3 flex items-center gap-4 text-caption text-ink-secondary pt-3 border-t border-hairline">
              <div>
                <span>Excess: </span>
                <strong className="text-ink">
                  {ticket.anomaly.excess.value.toLocaleString("en-IN")} {ticket.anomaly.excess.unit}
                </strong>
              </div>
              {ticket.daily_cost_inr !== null && (
                <div className="flex items-center gap-1">
                  <span>Daily Cost: </span>
                  <strong className="text-ink">
                    ₹{Math.round(ticket.daily_cost_inr).toLocaleString("en-IN")}
                  </strong>
                  <TagPill tag="estimated" className="scale-75 origin-left" />
                </div>
              )}
            </div>
          </div>

          {/* Verification Card (if verified or has savings) */}
          {ticket.status === "verified" && (
            <VerificationCard ticket={ticket} />
          )}

          {/* Activity Log */}
          <div>
            <h4 className="text-caption font-semibold uppercase tracking-wider text-ink-secondary mb-3">
              Activity & Audit Trail ({ticket.events.length})
            </h4>

            <div className="flex flex-col gap-3 relative before:absolute before:left-3.5 before:top-2 before:bottom-2 before:w-px before:bg-hairline">
              {ticket.events.map((ev) => {
                const ActorIcon = ACTOR_ICONS[ev.actor_role] ?? User;
                return (
                  <div key={ev.id} className="relative flex items-start gap-3 pl-1">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-pill bg-surface border border-hairline text-ink-secondary z-10">
                      <ActorIcon className="h-3 w-3" />
                    </span>
                    <div className="flex-1 rounded-control border border-hairline bg-surface p-3 text-caption">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-ink capitalize">
                          {ev.actor_role} &bull; {ev.event.replace("_", " ")}
                        </span>
                        <span className="font-mono text-ink-tertiary text-[11px]">
                          {ev.ts}
                        </span>
                      </div>
                      {ev.note && (
                        <p className="mt-1.5 text-ink-secondary text-body leading-relaxed">
                          {ev.note}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Append Note Input */}
            {canAct && (
              <div className="mt-4 pt-4 border-t border-hairline">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        void handleAddNote();
                      }
                    }}
                    placeholder="Add an internal progress note..."
                    className="flex-1 rounded-control border border-hairline bg-canvas px-3 py-2 text-caption text-ink placeholder:text-ink-tertiary focus:border-brand focus:outline-none"
                  />
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={Send}
                    loading={updating}
                    onClick={handleAddNote}
                    disabled={!noteText.trim()}
                  >
                    Post
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </Drawer>

      <ResolveDialog
        open={resolveDialogOpen}
        ticketId={ticket.id}
        ticketTitle={ticket.title}
        onClose={() => setResolveDialogOpen(false)}
        onConfirm={async (note) => {
          await onUpdateStatus(ticket.id, "resolved", note);
          toast(`Ticket #${ticket.id} marked resolved`, "success");
        }}
        loading={updating}
      />
    </>
  );
}
