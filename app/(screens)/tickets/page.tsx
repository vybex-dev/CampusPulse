"use client";

import { useState, useMemo } from "react";
import {
  Ticket as TicketIcon,
  LayoutGrid,
  List,
  Filter,
  CheckCircle2,
  Clock,
  RotateCcw,
  Sparkles,
  ArrowRight,
  TrendingDown,
} from "lucide-react";
import { useTickets, useTicket, useUpdateTicket } from "@/lib/api";
import { useUIStore } from "@/lib/store";
import type { Ticket, TicketStatus, Resource, Team, Priority } from "@/lib/contract";
import { PageHeader } from "@/components/ui/PageHeader";
import { Segmented } from "@/components/ui/Segmented";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { TicketCard } from "@/components/tickets/TicketCard";
import { TicketDrawer } from "@/components/tickets/TicketDrawer";
import { ResolveDialog } from "@/components/tickets/ResolveDialog";
import { Pill } from "@/components/ui/Pill";
import { useToast } from "@/components/ui/Toast";

const COLUMNS: { status: TicketStatus; label: string; description: string }[] = [
  { status: "open", label: "Open", description: "Freshly identified findings awaiting triage" },
  { status: "in_progress", label: "In Progress", description: "Operational team currently inspecting" },
  { status: "resolved", label: "Resolved", description: "Fix applied; fault marked cleared" },
  { status: "verifying", label: "Verifying", description: "Measuring post-fix counterfactual window" },
  { status: "verified", label: "Verified", description: "Eliminated excess validated in data" },
];

export default function ActionQueuePage() {
  const role = useUIStore((s) => s.role);
  const toast = useToast();

  // View toggle: Board or List
  const [viewMode, setViewMode] = useState<"board" | "list">("board");

  // Filter States
  const [resourceFilter, setResourceFilter] = useState<Resource | "all">("all");
  const [teamFilter, setTeamFilter] = useState<Team | "all">("all");
  const [priorityFilter, setPriorityFilter] = useState<Priority | "all">("all");

  // Drawer & Dialog State
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);
  const [resolvingTicket, setResolvingTicket] = useState<Ticket | null>(null);

  // Queries & Mutations
  const { data: tickets = [], isLoading, isError, refetch } = useTickets();
  const { data: ticketDetail } = useTicket(selectedTicketId);
  const updateTicketMutation = useUpdateTicket();

  // Filter tickets
  const filteredTickets = useMemo(() => {
    return tickets.filter((t) => {
      if (resourceFilter !== "all" && t.resource !== resourceFilter) return false;
      if (teamFilter !== "all" && t.team !== teamFilter) return false;
      if (priorityFilter !== "all" && t.priority !== priorityFilter) return false;
      return true;
    });
  }, [tickets, resourceFilter, teamFilter, priorityFilter]);

  // Group tickets into columns (reopened tickets appear under in_progress with badge)
  const ticketsByColumn = useMemo(() => {
    const map: Record<TicketStatus, Ticket[]> = {
      open: [],
      in_progress: [],
      resolved: [],
      verifying: [],
      verified: [],
      reopened: [],
    };
    for (const t of filteredTickets) {
      if (t.status === "reopened") {
        // Group under in_progress for column view with high prominence
        map.in_progress.push(t);
      } else {
        map[t.status]?.push(t);
      }
    }
    return map;
  }, [filteredTickets]);

  const handleUpdateStatus = async (
    id: number,
    status: TicketStatus,
    note?: string,
  ) => {
    await updateTicketMutation.mutateAsync({ id, status, note });
  };

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Action Queue"
        description="Every campus finding becomes an actionable operational ticket. Track fixes through physical remediation to counterfactual proof."
        actions={
          <Segmented
            ariaLabel="Tickets view format"
            value={viewMode}
            onChange={(v) => setViewMode(v as "board" | "list")}
            options={[
              { value: "board", label: "Board", icon: LayoutGrid },
              { value: "list", label: "List", icon: List },
            ]}
          />
        }
      />

      {/* Filter Control Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-card border border-hairline bg-surface p-4 shadow-card">
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex items-center gap-1.5 text-caption font-semibold text-ink-secondary">
            <Filter className="h-3.5 w-3.5" />
            Filters:
          </span>

          {/* Resource Filter */}
          <select
            value={resourceFilter}
            onChange={(e) => setResourceFilter(e.target.value as Resource | "all")}
            className="rounded-control border border-hairline bg-canvas px-3 py-1.5 text-caption text-ink focus:border-brand focus:outline-none"
          >
            <option value="all">All Resources</option>
            <option value="electricity">Electricity</option>
            <option value="water">Water</option>
            <option value="waste">Waste</option>
          </select>

          {/* Team Filter */}
          <select
            value={teamFilter}
            onChange={(e) => setTeamFilter(e.target.value as Team | "all")}
            className="rounded-control border border-hairline bg-canvas px-3 py-1.5 text-caption text-ink focus:border-brand focus:outline-none"
          >
            <option value="all">All Teams</option>
            <option value="electrical">Electrical</option>
            <option value="plumbing">Plumbing</option>
            <option value="housekeeping">Housekeeping</option>
          </select>

          {/* Priority Filter */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value as Priority | "all")}
            className="rounded-control border border-hairline bg-canvas px-3 py-1.5 text-caption text-ink focus:border-brand focus:outline-none"
          >
            <option value="all">All Priorities</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          {(resourceFilter !== "all" || teamFilter !== "all" || priorityFilter !== "all") && (
            <button
              type="button"
              onClick={() => {
                setResourceFilter("all");
                setTeamFilter("all");
                setPriorityFilter("all");
              }}
              className="text-caption text-brand hover:underline"
            >
              Reset filters
            </button>
          )}
        </div>

        <div className="text-caption text-ink-secondary">
          Showing <strong className="text-ink">{filteredTickets.length}</strong> of {tickets.length} tickets
        </div>
      </div>

      {/* Main Content Area */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {COLUMNS.map((col) => (
            <div key={col.status} className="flex flex-col gap-3">
              <Skeleton className="h-10 w-full rounded-control" />
              <Skeleton className="h-32 w-full rounded-card" />
              <Skeleton className="h-32 w-full rounded-card" />
            </div>
          ))}
        </div>
      ) : isError ? (
        <ErrorState
          title="Could not load action tickets"
          message="We encountered an issue connecting to the tickets store."
          onRetry={() => refetch()}
        />
      ) : filteredTickets.length === 0 ? (
        <EmptyState
          icon={TicketIcon}
          title="No tickets found"
          description="Try adjusting your filter settings or fast-forward simulated time to surface new anomalies."
        />
      ) : viewMode === "board" ? (
        /* Five-column Kanban Board */
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5 items-start">
          {COLUMNS.map((col) => {
            const columnTickets = ticketsByColumn[col.status] ?? [];
            return (
              <div
                key={col.status}
                className="flex flex-col rounded-card bg-canvas/60 p-3 border border-hairline min-h-[500px]"
              >
                {/* Column Header */}
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-hairline px-1">
                  <div className="flex items-center gap-2">
                    <span className="text-body font-semibold text-ink">
                      {col.label}
                    </span>
                    <span className="flex h-5 w-5 items-center justify-center rounded-pill bg-surface text-caption font-semibold text-ink-secondary border border-hairline">
                      {columnTickets.length}
                    </span>
                  </div>
                </div>

                {/* Tickets list */}
                <div className="flex flex-col gap-3 flex-1 overflow-y-auto">
                  {columnTickets.length === 0 ? (
                    <div className="flex h-32 items-center justify-center rounded-card border border-dashed border-hairline text-caption text-ink-tertiary">
                      No tickets
                    </div>
                  ) : (
                    columnTickets.map((t) => (
                      <TicketCard
                        key={t.id}
                        ticket={t}
                        onClick={() => setSelectedTicketId(t.id)}
                        onResolve={() => setResolvingTicket(t)}
                        onAdvanceToVerifying={() =>
                          handleUpdateStatus(t.id, "verifying")
                        }
                        onStartProgress={() =>
                          handleUpdateStatus(t.id, "in_progress")
                        }
                        role={role}
                      />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* List View */
        <div className="flex flex-col gap-3">
          {filteredTickets.map((t) => (
            <TicketCard
              key={t.id}
              ticket={t}
              onClick={() => setSelectedTicketId(t.id)}
              onResolve={() => setResolvingTicket(t)}
              onAdvanceToVerifying={() =>
                handleUpdateStatus(t.id, "verifying")
              }
              onStartProgress={() =>
                handleUpdateStatus(t.id, "in_progress")
              }
              role={role}
            />
          ))}
        </div>
      )}

      {/* Ticket Details Drawer */}
      <TicketDrawer
        open={selectedTicketId !== null}
        ticket={ticketDetail ?? null}
        onClose={() => setSelectedTicketId(null)}
        onUpdateStatus={handleUpdateStatus}
        role={role}
      />

      {/* Inline Resolve Note Dialog */}
      {resolvingTicket && (
        <ResolveDialog
          open={true}
          ticketId={resolvingTicket.id}
          ticketTitle={resolvingTicket.title}
          onClose={() => setResolvingTicket(null)}
          onConfirm={async (note) => {
            await handleUpdateStatus(resolvingTicket.id, "resolved", note);
            toast(`Ticket #${resolvingTicket.id} resolved and fault marked fixed`, "success");
            setResolvingTicket(null);
          }}
          loading={updateTicketMutation.isPending}
        />
      )}
    </div>
  );
}
