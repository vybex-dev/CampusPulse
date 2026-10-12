import { describe, expect, it, beforeEach } from "vitest";
import { getDb } from "@/lib/db";
import { resetCampus } from "@/lib/sim/reset";
import { advanceDays, getClock, SIM_START } from "@/lib/sim/clock";
import { getSettings } from "@/lib/settings";
import {
  type DetectorContext,
  type DetectorLocation,
  type DetectorMeter,
  type DetectorReading,
} from "@/lib/analytics/anomalies";
import { detectElectricityAnomalies } from "@/lib/analytics/electricity";
import { detectWaterAnomalies, computePerCapitaWater } from "@/lib/analytics/water";
import {
  detectWasteAnomalies,
  computeBlockAccuracy,
  type WasteCheckRecord,
} from "@/lib/analytics/waste";
import {
  createTicket,
  updateTicket,
  getTicketDetail,
  syncAndGetAnomalies,
} from "@/lib/analytics/tickets";
import { buildImpactReport, computeCampusScore } from "@/lib/impact";

function buildDetectorContext(): DetectorContext {
  const db = getDb();
  const settings = getSettings(db);
  const readings = db
    .prepare("SELECT meter_id, ts, value FROM reading")
    .all() as DetectorReading[];
  const meters = db
    .prepare("SELECT id, location_id, resource, unit FROM meter")
    .all() as DetectorMeter[];
  const locations = db
    .prepare("SELECT id, parent_id, kind, code, name, room_type, population FROM location")
    .all() as DetectorLocation[];
  const timetable = db
    .prepare("SELECT location_id, weekday, hour, scheduled, label FROM timetable_slot")
    .all() as any[];

  return {
    readings,
    meters,
    locations,
    timetable,
    clock: getClock(),
    settings,
  };
}

describe("Golden Stories (ST-1 to ST-6) Suite", () => {
  beforeEach(() => {
    resetCampus();
  });

  // ════════════════════════════════════════════════════════════════════════
  // 1. Expected results after reset (clock = 2026-10-12T00:00)
  // ════════════════════════════════════════════════════════════════════════

  describe("After Reset (Clock = 2026-10-12T00:00)", () => {
    it("ST-1: Hall A-204 evening lighting load (~13.4 kWh/evening, ~Rs 76/day)", () => {
      const ctx = buildDetectorContext();
      const elecAnomalies = detectElectricityAnomalies(ctx);
      const st1 = elecAnomalies.find((a) => a.meter_id === "E-A-204");

      expect(st1).toBeDefined();
      expect(st1!.type).toBe("elec_unscheduled_load");
      expect(st1!.priority).toBe("medium");
      expect(st1!.occurrences).toBe(5);
      expect(st1!.excess_value).toBeCloseTo(67.0, 1);
      expect(st1!.daily_cost_inr).toBeCloseTo(76.6, 0);
      expect(st1!.cost_inr).toBeCloseTo(536, 0);
      expect(st1!.explanation).toContain("Hall A-204");
    });

    it("ST-2: Lab A-L3 weekend equipment load (~160 kWh/weekend, ~Rs 186/day)", () => {
      const ctx = buildDetectorContext();
      const elecAnomalies = detectElectricityAnomalies(ctx);
      const st2 = elecAnomalies.find((a) => a.meter_id === "E-A-L3");

      expect(st2).toBeDefined();
      expect(st2!.type).toBe("elec_unscheduled_load");
      expect(st2!.priority).toBe("medium");
      expect(st2!.daily_cost_inr).toBeGreaterThan(150);
      expect(st2!.daily_cost_inr).toBeLessThan(200);
      expect(st2!.explanation).toContain("Lab A-L3");
    });

    it("ST-3: Boys Hostel 1 continuous plumbing leak (800 L/h extra, 19.2 kL/day, Rs 384/day)", () => {
      const ctx = buildDetectorContext();
      const waterAnomalies = detectWaterAnomalies(ctx);
      const st3 = waterAnomalies.find((a) => a.meter_id === "W-HST-1");

      expect(st3).toBeDefined();
      expect(st3!.type).toBe("water_night_leak");
      expect(st3!.priority).toBe("high");
      expect(st3!.daily_cost_inr).toBeGreaterThan(375);
      expect(st3!.daily_cost_inr).toBeLessThan(390);

      // Per capita consumption exceeds 120 L target (~152 L/resident)
      const perCapita = computePerCapitaWater(ctx);
      const hst1 = perCapita.find((b) => b.block_code === "HST-1");
      expect(hst1).toBeDefined();
      expect(hst1!.is_flagged).toBe(true);
      expect(hst1!.actual_l).toBeGreaterThanOrEqual(145);
      expect(hst1!.ratio_pct).toBeGreaterThan(120);
    });

    it("ST-4: Academic Block B rooftop tank overflow (100% level, 3 kL/morning, Rs 43/day)", () => {
      const ctx = buildDetectorContext();
      const waterAnomalies = detectWaterAnomalies(ctx);
      const st4 = waterAnomalies.find((a) => a.meter_id === "T-AB-B");

      expect(st4).toBeDefined();
      expect(st4!.type).toBe("water_overflow");
      expect(st4!.priority).toBe("low");
      expect(st4!.occurrences).toBe(5);
      expect(st4!.excess_value).toBeCloseTo(15.0, 1);
      expect(st4!.daily_cost_inr).toBeCloseTo(43, 0);
    });

    it("ST-5: Mess waste segregation failure (accuracy < 50% vs ~76% peer, high priority anomaly)", () => {
      const db = getDb();
      const settings = getSettings(db);
      const logs = db
        .prepare("SELECT id, ts, block_id, mode, category, item_name, is_correct, chosen_bin FROM waste_log")
        .all() as WasteCheckRecord[];
      const locations = db
        .prepare("SELECT id, parent_id, kind, code, name, room_type, population FROM location")
        .all() as DetectorLocation[];

      const drafts = detectWasteAnomalies({
        wasteLogs: logs,
        locations,
        clock: "2026-10-12T00:00",
        settings,
      });

      const st5 = drafts.find((d) => d.type === "waste_bad_segregation");
      expect(st5).toBeDefined();
      expect(st5!.priority).toBe("high");
      expect(st5!.unit).toBe("kg");
      expect(st5!.cost_inr).toBeNull();
      expect(st5!.daily_cost_inr).toBeNull();
      expect(st5!.excess_value).toBeGreaterThan(50);

      const evidence = JSON.parse(st5!.evidence_json);
      expect(evidence.block).toBe("MESS");
      expect(evidence.commonest_mistake?.category).toBe("wet_biodegradable");
      expect(evidence.commonest_mistake?.chosen_bin).toBe("blue");
    });

    it("ST-6: Academic Block B after-hours HVAC pre-seeded as verified (396 kWh, Rs 3,168, 285 kg CO2e)", () => {
      const db = getDb();
      const ticket = db
        .prepare("SELECT * FROM ticket WHERE status = 'verified'")
        .get() as any;

      expect(ticket).toBeDefined();
      expect(ticket.title).toBe("Block B after-hours HVAC schedule");
      expect(ticket.team).toBe("electrical");
      expect(ticket.priority).toBe("high");

      const savings = db
        .prepare("SELECT * FROM savings WHERE ticket_id = ?")
        .get(ticket.id) as any;

      expect(savings).toBeDefined();
      expect(savings.saved_units).toBe(396);
      expect(savings.saved_inr).toBe(3168);
      expect(savings.saved_co2e_kg).toBeCloseTo(285.12, 1);
    });

    it("Campus Score starts in calibrated 55-62 range", () => {
      const score = computeCampusScore();
      expect(score.total).toBeGreaterThanOrEqual(55);
      expect(score.total).toBeLessThanOrEqual(62);
      expect(score.electricity).toBeGreaterThan(0);
      expect(score.water).toBeGreaterThan(0);
      expect(score.waste).toBeGreaterThan(0);
    });
  });

  // ════════════════════════════════════════════════════════════════════════
  // 2. Expected results after 7-day fast-forward (clock = 2026-10-19T00:00)
  // ════════════════════════════════════════════════════════════════════════

  describe("After 7-Day Fast-Forward (Clock = 2026-10-19T00:00)", () => {
    it("verifies ST-1 savings (~Rs 535) when ticket is resolved prior to fast-forward", () => {
      const anomalies = syncAndGetAnomalies();
      const st1 = anomalies.find((a) => a.meter_id === "E-A-204");
      expect(st1).toBeDefined();

      // Resolve ST-1 ticket
      const { ticket } = createTicket(st1!.id, "staff");
      updateTicket(ticket.id, { status: "in_progress" }, "staff");
      updateTicket(
        ticket.id,
        { status: "resolved", note: "Restored classroom automated lighting schedule" },
        "staff",
      );

      // Fast-forward 7 days
      advanceDays(7);
      expect(getClock()).toBe("2026-10-19T00:00");

      // Verify ticket state has transitioned to 'verified'
      const detail = getTicketDetail(ticket.id);
      expect(detail).toBeDefined();
      expect(detail!.status).toBe("verified");
      expect(detail!.verified_at).not.toBeNull();
      expect(detail!.savings).toBeDefined();
      expect(detail!.savings!.saved_inr).toBe(535);
      expect(detail!.savings!.saved_units).toBe(67.0);
      expect(detail!.savings!.saved_co2e_kg).toBeCloseTo(48.24, 1);
    });

    it("clears ST-3 water leak and marks savings verified when resolved prior to fast-forward", () => {
      const anomalies = syncAndGetAnomalies();
      const st3 = anomalies.find((a) => a.meter_id === "W-HST-1");
      expect(st3).toBeDefined();

      const { ticket } = createTicket(st3!.id, "staff");
      updateTicket(ticket.id, { status: "in_progress" }, "staff");
      updateTicket(
        ticket.id,
        { status: "resolved", note: "Replaced leaking flush valves in Boys Hostel 1" },
        "staff",
      );

      advanceDays(7);

      const detail = getTicketDetail(ticket.id);
      expect(detail).toBeDefined();
      expect(detail!.status).toBe("verified");
      expect(detail!.savings).toBeDefined();
      expect(detail!.savings!.saved_inr).toBeGreaterThan(0);

      // Flow during post-fix nights should drop back to normal baseline
      const db = getDb();
      const postFixNight = db
        .prepare("SELECT value FROM reading WHERE meter_id = 'W-HST-1' AND ts = '2026-10-15T02:00'")
        .get() as { value: number };
      expect(postFixNight.value).toBeLessThan(200);
    });

    it("keeps unfixed continuous anomalies active across 7-day fast-forward (ST-3)", () => {
      advanceDays(7);
      expect(getClock()).toBe("2026-10-19T00:00");

      const ctx = buildDetectorContext();
      const waterAnomalies = detectWaterAnomalies(ctx);
      const st3 = waterAnomalies.find((a) => a.meter_id === "W-HST-1");

      expect(st3).toBeDefined();
      expect(st3!.status).toBe("active");
      expect(st3!.priority).toBe("high");
      expect(st3!.daily_cost_inr).toBeGreaterThan(375);
    });

    it("retains ST-6 pre-seeded savings in 30-day and all-time reports after fast-forward", () => {
      advanceDays(7);

      const report30 = buildImpactReport("30");
      expect(report30.verified_savings_inr.value).toBeGreaterThanOrEqual(3168);

      const reportAll = buildImpactReport("all");
      expect(reportAll.verified_savings_inr.value).toBeGreaterThanOrEqual(3168);
    });

    it("demonstrates score recovery when ST-1 and ST-3 are both fixed and verified", () => {
      const initialScore = computeCampusScore().total;

      // Fix ST-1
      const anomalies = syncAndGetAnomalies();
      const st1 = anomalies.find((a) => a.meter_id === "E-A-204")!;
      const { ticket: t1 } = createTicket(st1.id, "staff");
      updateTicket(t1.id, { status: "in_progress" }, "staff");
      updateTicket(t1.id, { status: "resolved", note: "Fixed lighting" }, "staff");

      // Fix ST-3
      const st3 = anomalies.find((a) => a.meter_id === "W-HST-1")!;
      const { ticket: t3 } = createTicket(st3.id, "staff");
      updateTicket(t3.id, { status: "in_progress" }, "staff");
      updateTicket(t3.id, { status: "resolved", note: "Fixed plumbing leak" }, "staff");

      advanceDays(7);

      const postFixScore = computeCampusScore();
      // Verified tickets reduce avoidable waste in trailing 7 days
      expect(postFixScore.total).toBeGreaterThan(initialScore);
    });
  });
});
