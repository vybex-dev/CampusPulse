import { describe, expect, it, beforeEach } from "vitest";
import { getDb } from "@/lib/db";
import { resetCampus } from "@/lib/sim/reset";
import { advanceDays } from "@/lib/sim/clock";
import {
  createTicket,
  updateTicket,
  getTicketDetail,
  getTickets,
  syncAndGetAnomalies,
  evaluateTicketVerification,
  TicketStateError,
  TicketValidationError,
} from "@/lib/analytics/tickets";
import { computeCampusScore, scoreFromShares } from "@/lib/impact";

describe("Ticket Lifecycle & State Machine (lib/analytics/tickets)", () => {
  beforeEach(() => {
    resetCampus();
  });

  it("handles all legal state machine transitions", () => {
    const anomalies = syncAndGetAnomalies();
    const anomaly = anomalies.find((a) => a.meter_id === "E-A-204") ?? anomalies[0];
    expect(anomaly).toBeDefined();

    // 1. Create: status = 'open'
    const { ticket, isExisting } = createTicket(anomaly.id, "staff");
    expect(isExisting).toBe(false);
    expect(ticket.status).toBe("open");

    // 2. open -> in_progress
    const inProg = updateTicket(ticket.id, { status: "in_progress" }, "staff");
    expect(inProg.status).toBe("in_progress");

    // 3. in_progress -> resolved (with note)
    const resolved = updateTicket(
      ticket.id,
      { status: "resolved", note: "Override schedule turned off" },
      "staff",
    );
    expect(resolved.status).toBe("resolved");
    expect(resolved.resolve_note).toBe("Override schedule turned off");

    // 4. resolved -> verifying
    const verifying = updateTicket(ticket.id, { status: "verifying" }, "staff");
    expect(verifying.status).toBe("verifying");

    // 5. verifying -> reopened
    const reopened = updateTicket(
      ticket.id,
      { status: "reopened", note: "Spike recurred" },
      "system",
    );
    expect(reopened.status).toBe("reopened");

    // 6. reopened -> in_progress
    const backToProgress = updateTicket(ticket.id, { status: "in_progress" }, "admin");
    expect(backToProgress.status).toBe("in_progress");

    // 7. in_progress -> resolved again
    const resolvedAgain = updateTicket(
      ticket.id,
      { status: "resolved", note: "Timer replaced" },
      "staff",
    );
    expect(resolvedAgain.status).toBe("resolved");

    // 8. resolved -> verifying -> verified
    updateTicket(ticket.id, { status: "verifying" }, "staff");
    const verified = updateTicket(ticket.id, { status: "verified" }, "system");
    expect(verified.status).toBe("verified");
  });

  it("rejects illegal transitions with TicketStateError (409)", () => {
    const anomalies = syncAndGetAnomalies();
    const anomaly = anomalies.find((a) => a.meter_id === "E-A-204") ?? anomalies[0];
    const { ticket } = createTicket(anomaly.id, "staff");

    // open -> resolved (skipping in_progress)
    expect(() =>
      updateTicket(ticket.id, { status: "resolved", note: "Direct resolve" }, "staff"),
    ).toThrow(TicketStateError);

    // open -> verified
    expect(() =>
      updateTicket(ticket.id, { status: "verified" }, "staff"),
    ).toThrow(TicketStateError);

    // open -> verifying
    expect(() =>
      updateTicket(ticket.id, { status: "verifying" }, "staff"),
    ).toThrow(TicketStateError);

    // Move to in_progress
    updateTicket(ticket.id, { status: "in_progress" }, "staff");

    // in_progress -> open
    expect(() =>
      updateTicket(ticket.id, { status: "open" }, "staff"),
    ).toThrow(TicketStateError);

    // in_progress -> verified
    expect(() =>
      updateTicket(ticket.id, { status: "verified" }, "staff"),
    ).toThrow(TicketStateError);

    // Resolve properly
    updateTicket(ticket.id, { status: "resolved", note: "Fixed" }, "staff");

    // resolved -> in_progress
    expect(() =>
      updateTicket(ticket.id, { status: "in_progress" }, "staff"),
    ).toThrow(TicketStateError);

    // resolved -> open
    expect(() =>
      updateTicket(ticket.id, { status: "open" }, "staff"),
    ).toThrow(TicketStateError);
  });

  it("enforces non-empty note when transitioning to resolved", () => {
    const anomalies = syncAndGetAnomalies();
    const anomaly = anomalies[0];
    const { ticket } = createTicket(anomaly.id, "staff");

    updateTicket(ticket.id, { status: "in_progress" }, "staff");

    // Empty note throws TicketValidationError
    expect(() =>
      updateTicket(ticket.id, { status: "resolved", note: "" }, "staff"),
    ).toThrow(TicketValidationError);

    // Whitespace only note throws TicketValidationError
    expect(() =>
      updateTicket(ticket.id, { status: "resolved", note: "   " }, "staff"),
    ).toThrow(TicketValidationError);

    // Undefined note throws TicketValidationError
    expect(() =>
      updateTicket(ticket.id, { status: "resolved" }, "staff"),
    ).toThrow(TicketValidationError);
  });

  it("duplicate create for one anomaly returns existing ticket with isExisting=true", () => {
    const anomalies = syncAndGetAnomalies();
    const anomaly = anomalies[0];

    const first = createTicket(anomaly.id, "staff");
    expect(first.isExisting).toBe(false);
    expect(first.ticket.id).toBeGreaterThan(0);

    const second = createTicket(anomaly.id, "staff");
    expect(second.isExisting).toBe(true);
    expect(second.ticket.id).toBe(first.ticket.id);
  });

  it("records activity log events with actor role", () => {
    const anomalies = syncAndGetAnomalies();
    const anomaly = anomalies[0];
    const { ticket } = createTicket(anomaly.id, "admin");

    updateTicket(ticket.id, { status: "in_progress" }, "student");
    updateTicket(ticket.id, { status: "resolved", note: "Fixed valve" }, "staff");

    const detail = getTicketDetail(ticket.id);
    expect(detail).toBeDefined();
    expect(detail!.events.length).toBeGreaterThanOrEqual(3);

    const roles = detail!.events.map((e) => e.actor_role);
    expect(roles).toContain("admin");
    expect(roles).toContain("student");
    expect(roles).toContain("staff");
  });

  it("completes ST-1 end-to-end verification (~Rs 535 saved, Verified)", () => {
    const anomalies = syncAndGetAnomalies();
    const st1 = anomalies.find((a) => a.meter_id === "E-A-204");
    expect(st1).toBeDefined();

    const { ticket } = createTicket(st1!.id, "staff");
    updateTicket(ticket.id, { status: "in_progress" }, "staff");
    updateTicket(
      ticket.id,
      { status: "resolved", note: "Classroom lighting schedule restored" },
      "staff",
    );

    // Advance clock past the observation window (7 days)
    advanceDays(7);

    // Fast-forward hook automatically verifies the ticket
    const detail = getTicketDetail(ticket.id);
    expect(detail).toBeDefined();
    expect(detail!.status).toBe("verified");
    expect(detail!.verified_at).not.toBeNull();
    expect(detail!.savings).toBeDefined();
    expect(detail!.savings!.saved_inr).toBe(535);
    expect(detail!.savings!.saved_units).toBe(67.0);
  });

  it("starts campus score in calibrated range 55-62 (target ~58)", () => {
    const score = computeCampusScore();
    expect(score.total).toBeGreaterThanOrEqual(55);
    expect(score.total).toBeLessThanOrEqual(62);
    expect(score.electricity).toBeGreaterThan(0);
    expect(score.water).toBeGreaterThan(0);
    expect(score.waste).toBeGreaterThan(0);
  });

  it("computes Everything preset score at ~92", () => {
    // When avoidable shares are 0 and segregation accuracy is at peer target ~76%
    const presetScore = scoreFromShares(0, 0, 76);
    expect(presetScore.electricity).toBe(100);
    expect(presetScore.water).toBe(100);
    expect(presetScore.waste).toBe(76);
    expect(presetScore.total).toBe(92);
  });
});
