import { describe, expect, it } from "vitest";
import { getDb } from "@/lib/db";
import { resetCampus } from "@/lib/sim/reset";
import { getSettings } from "@/lib/settings";
import {
  detectElectricityAnomalies,
  computeAfterHoursSharePerBlock,
} from "@/lib/analytics/electricity";
import {
  detectWaterAnomalies,
  computePerCapitaWater,
} from "@/lib/analytics/water";
import type {
  DetectorContext,
  DetectorLocation,
  DetectorMeter,
  DetectorReading,
} from "@/lib/analytics/anomalies";

function createSyntheticContext(overrides?: Partial<DetectorContext>): DetectorContext {
  const locations: DetectorLocation[] = [
    {
      id: 1,
      parent_id: null,
      kind: "campus",
      code: "CAMPUS",
      name: "Campus",
      room_type: null,
      population: 1000,
    },
    {
      id: 2,
      parent_id: 1,
      kind: "block",
      code: "AB-A",
      name: "Block A",
      room_type: null,
      population: 500,
    },
    {
      id: 10,
      parent_id: 2,
      kind: "room",
      code: "A-101",
      name: "Room A-101",
      room_type: "classroom",
      population: null,
    },
  ];

  const meters: DetectorMeter[] = [
    {
      id: "E-A-101",
      location_id: 10,
      resource: "electricity",
      unit: "kW",
    },
    {
      id: "W-AB-A",
      location_id: 2,
      resource: "water",
      unit: "L/h",
    },
    {
      id: "T-AB-A",
      location_id: 2,
      resource: "tank_level",
      unit: "percent",
    },
  ];

  // Room scheduled Mon-Fri 09:00 - 17:00 (hours 9..16 except lunch 13)
  const timetable = new Map<string, boolean[]>();
  const sched = new Array<boolean>(168).fill(false);
  for (let w = 0; w < 5; w++) {
    for (const h of [9, 10, 11, 12, 14, 15, 16]) {
      sched[w * 24 + h] = true;
    }
  }
  timetable.set("A-101", sched);

  return {
    readings: [],
    meters,
    locations,
    timetable,
    clock: "2026-10-12T00:00",
    ...overrides,
  };
}

describe("Electricity detector (Rule R1 and R2)", () => {
  it("clean week gives no flags", () => {
    const ctx = createSyntheticContext();
    const readings: DetectorReading[] = [];

    // 7 days of normal readings (Oct 5 to Oct 11)
    for (let day = 5; day <= 11; day++) {
      const dateStr = `2026-10-${String(day).padStart(2, "0")}`;
      const weekday = (day - 5); // 0 = Mon
      for (let hour = 0; hour < 24; hour++) {
        const hh = String(hour).padStart(2, "0");
        const isSched = weekday < 5 && [9, 10, 11, 12, 14, 15, 16].includes(hour);
        const val = isSched ? 1.8 : 0.05;
        readings.push({
          meter_id: "E-A-101",
          ts: `${dateStr}T${hh}:00`,
          value: val,
        });
      }
    }
    ctx.readings = readings;

    const anomalies = detectElectricityAnomalies(ctx);
    expect(anomalies).toHaveLength(0);
  });

  it("one evening detected when load is held unscheduled for >= 2 consecutive hours", () => {
    const ctx = createSyntheticContext();
    const readings: DetectorReading[] = [];

    // Oct 5: normal day with 19:00 - 22:00 held at 3.4 kW
    for (let hour = 0; hour < 24; hour++) {
      const hh = String(hour).padStart(2, "0");
      let val = [9, 10, 11, 12, 14, 15, 16].includes(hour) ? 1.8 : 0.05;
      if (hour >= 19 && hour <= 22) val = 3.4;
      readings.push({
        meter_id: "E-A-101",
        ts: `2026-10-05T${hh}:00`,
        value: val,
      });
    }
    ctx.readings = readings;

    const anomalies = detectElectricityAnomalies(ctx);
    expect(anomalies).toHaveLength(1);
    expect(anomalies[0].meter_id).toBe("E-A-101");
    expect(anomalies[0].type).toBe("elec_unscheduled_load");
    expect(anomalies[0].occurrences).toBe(1);
    // 4 hours * (3.4 - 0.05) = 13.4 kWh
    expect(anomalies[0].excess_value).toBeCloseTo(13.4, 0.5);
  });

  it("one-hour blip ignored", () => {
    const ctx = createSyntheticContext();
    const readings: DetectorReading[] = [];

    // Oct 5: single 1-hour spike at 20:00
    for (let hour = 0; hour < 24; hour++) {
      const hh = String(hour).padStart(2, "0");
      const val = hour === 20 ? 3.4 : 0.05;
      readings.push({
        meter_id: "E-A-101",
        ts: `2026-10-05T${hh}:00`,
        value: val,
      });
    }
    ctx.readings = readings;

    const anomalies = detectElectricityAnomalies(ctx);
    expect(anomalies).toHaveLength(0);
  });

  it("weekend hold is one event", () => {
    const ctx = createSyntheticContext();
    const readings: DetectorReading[] = [];

    // Normal weekday baseline Oct 5 to Oct 9
    for (let day = 5; day <= 9; day++) {
      const dateStr = `2026-10-${String(day).padStart(2, "0")}`;
      for (let hour = 0; hour < 24; hour++) {
        readings.push({
          meter_id: "E-A-101",
          ts: `${dateStr}T${String(hour).padStart(2, "0")}:00`,
          value: [9, 10, 11, 12, 14, 15, 16].includes(hour) ? 1.8 : 0.05,
        });
      }
    }

    // Saturday Oct 10 and Sunday Oct 11: 48 hours held at 3.6 kW
    for (let day = 10; day <= 11; day++) {
      const dateStr = `2026-10-${String(day).padStart(2, "0")}`;
      for (let hour = 0; hour < 24; hour++) {
        const hh = String(hour).padStart(2, "0");
        readings.push({
          meter_id: "E-A-101",
          ts: `${dateStr}T${hh}:00`,
          value: 3.6,
        });
      }
    }
    ctx.readings = readings;

    const anomalies = detectElectricityAnomalies(ctx);
    expect(anomalies).toHaveLength(1);
    expect(anomalies[0].occurrences).toBe(1);
    expect(anomalies[0].start_ts).toBe("2026-10-10T00:00");
    expect(anomalies[0].end_ts).toBe("2026-10-11T23:00");
  });

  it("evenings a week apart merge into one anomaly with occurrences count", () => {
    const ctx = createSyntheticContext();
    const readings: DetectorReading[] = [];

    // Evening 1: Oct 3 at 19:00 - 22:00
    for (let hour = 0; hour < 24; hour++) {
      const hh = String(hour).padStart(2, "0");
      const val = hour >= 19 && hour <= 22 ? 3.4 : 0.05;
      readings.push({ meter_id: "E-A-101", ts: `2026-10-03T${hh}:00`, value: val });
    }

    // Evening 2: Oct 10 at 19:00 - 22:00 (7 days apart)
    for (let hour = 0; hour < 24; hour++) {
      const hh = String(hour).padStart(2, "0");
      const val = hour >= 19 && hour <= 22 ? 3.4 : 0.05;
      readings.push({ meter_id: "E-A-101", ts: `2026-10-10T${hh}:00`, value: val });
    }
    ctx.readings = readings;

    const anomalies = detectElectricityAnomalies(ctx);
    expect(anomalies).toHaveLength(1);
    expect(anomalies[0].occurrences).toBe(2);
    expect(anomalies[0].start_ts).toBe("2026-10-03T19:00");
    expect(anomalies[0].end_ts).toBe("2026-10-10T22:00");
  });
});

describe("Water detector (Rule W1 and W2)", () => {
  it("normal nights no leak", () => {
    const ctx = createSyntheticContext();
    const readings: DetectorReading[] = [];

    // 10 nights of normal flow (~120 L/h at 02:00 and 03:00)
    for (let day = 1; day <= 10; day++) {
      const dateStr = `2026-10-${String(day).padStart(2, "0")}`;
      for (let h = 0; h < 24; h++) {
        readings.push({
          meter_id: "W-AB-A",
          ts: `${dateStr}T${String(h).padStart(2, "0")}:00`,
          value: h === 2 || h === 3 ? 120 : 1500,
        });
      }
    }
    ctx.readings = readings;

    const anomalies = detectWaterAnomalies(ctx);
    expect(anomalies.filter((a) => a.type === "water_night_leak")).toHaveLength(0);
  });

  it("constant flow flagged on night 2", () => {
    const ctx = createSyntheticContext();
    const readings: DetectorReading[] = [];

    // Days 1 to 5 normal (120 L/h), Days 6 and 7 leaking (920 L/h)
    for (let day = 1; day <= 7; day++) {
      const dateStr = `2026-10-${String(day).padStart(2, "0")}`;
      const leak = day >= 6;
      for (let h = 0; h < 24; h++) {
        readings.push({
          meter_id: "W-AB-A",
          ts: `${dateStr}T${String(h).padStart(2, "0")}:00`,
          value: leak ? 920 : 120,
        });
      }
    }
    ctx.readings = readings;

    const anomalies = detectWaterAnomalies(ctx);
    const leakAnomalies = anomalies.filter((a) => a.type === "water_night_leak");
    expect(leakAnomalies).toHaveLength(1);
    expect(leakAnomalies[0].meter_id).toBe("W-AB-A");
    expect(leakAnomalies[0].start_ts).toBe("2026-10-06T00:00");
  });

  it("evening draw is not a leak", () => {
    const ctx = createSyntheticContext();
    const readings: DetectorReading[] = [];

    // High evening draw (19:00 to 22:00 at 5000 L/h), normal night (120 L/h)
    for (let day = 1; day <= 7; day++) {
      const dateStr = `2026-10-${String(day).padStart(2, "0")}`;
      for (let h = 0; h < 24; h++) {
        let val = 200;
        if (h === 2 || h === 3) val = 120;
        if (h >= 19 && h <= 21) val = 5000;
        readings.push({
          meter_id: "W-AB-A",
          ts: `${dateStr}T${String(h).padStart(2, "0")}:00`,
          value: val,
        });
      }
    }
    ctx.readings = readings;

    const anomalies = detectWaterAnomalies(ctx);
    expect(anomalies.filter((a) => a.type === "water_night_leak")).toHaveLength(0);
  });

  it("full tank without extra inflow is not overflow", () => {
    const ctx = createSyntheticContext();
    const readings: DetectorReading[] = [];

    // Tank at 100%, but inflow is normal (60 L/h)
    for (let h = 0; h < 24; h++) {
      const hh = String(h).padStart(2, "0");
      readings.push({
        meter_id: "T-AB-A",
        ts: `2026-10-07T${hh}:00`,
        value: h === 5 || h === 6 ? 100 : 80,
      });
      readings.push({
        meter_id: "W-AB-A",
        ts: `2026-10-07T${hh}:00`,
        value: 60, // normal baseline
      });
    }
    ctx.readings = readings;

    const anomalies = detectWaterAnomalies(ctx);
    expect(anomalies.filter((a) => a.type === "water_overflow")).toHaveLength(0);
  });
});

describe("Golden stories (ST-1 to ST-4) on seeded database", () => {
  it("detects ST-1 to ST-4 with expected golden numbers", () => {
    resetCampus();
    const db = getDb();
    const settings = getSettings(db);

    const readings = db.prepare("SELECT meter_id, ts, value FROM reading").all() as DetectorReading[];
    const meters = db.prepare("SELECT id, location_id, resource, unit FROM meter").all() as DetectorMeter[];
    const locations = db.prepare("SELECT id, parent_id, kind, code, name, room_type, population FROM location").all() as DetectorLocation[];
    const timetable = db.prepare("SELECT location_id, weekday, hour, scheduled, label FROM timetable_slot").all() as any[];

    const ctx: DetectorContext = {
      readings,
      meters,
      locations,
      timetable,
      clock: "2026-10-12T00:00",
      settings,
    };

    const elec = detectElectricityAnomalies(ctx);
    const water = detectWaterAnomalies(ctx);

    // ── ST-1 Hall A-204 ──────────────────────────────────────────────────
    const st1 = elec.find((a) => a.meter_id === "E-A-204");
    expect(st1).toBeDefined();
    expect(st1!.priority).toBe("medium");
    expect(st1!.occurrences).toBe(5);
    // ~13.4 kWh/evening * 5 = 67.0 kWh
    expect(st1!.excess_value).toBeCloseTo(67.0, 1);
    // Cost ~Rs 536 total, ~Rs 76/day
    expect(st1!.daily_cost_inr).toBeCloseTo(76.6, 0);

    // ── ST-2 Lab A-L3 ────────────────────────────────────────────────────
    const st2 = elec.find((a) => a.meter_id === "E-A-L3");
    expect(st2).toBeDefined();
    expect(st2!.priority).toBe("medium");
    // Daily cost ~Rs 186/day
    expect(st2!.daily_cost_inr).toBeGreaterThan(150);
    expect(st2!.daily_cost_inr).toBeLessThan(200);

    // ── ST-3 HST-1 Water ─────────────────────────────────────────────────
    const st3 = water.find((a) => a.meter_id === "W-HST-1");
    expect(st3).toBeDefined();
    expect(st3!.priority).toBe("high");
    expect(st3!.type).toBe("water_night_leak");
    // Daily cost ~Rs 384/day (19.2 kL/day * 20)
    expect(st3!.daily_cost_inr).toBeGreaterThan(375);
    expect(st3!.daily_cost_inr).toBeLessThan(390);

    // Check per-capita marker
    const perCapitaReports = computePerCapitaWater(ctx);
    const hst1Report = perCapitaReports.find((r) => r.block_code === "HST-1");
    expect(hst1Report).toBeDefined();
    expect(hst1Report!.is_flagged).toBe(true);
    expect(hst1Report!.actual_l).toBeGreaterThanOrEqual(145);
    expect(hst1Report!.ratio_pct).toBeGreaterThan(120);

    // ── ST-4 AB-B Tank ───────────────────────────────────────────────────
    const st4 = water.find((a) => a.meter_id === "T-AB-B");
    expect(st4).toBeDefined();
    expect(st4!.priority).toBe("low");
    expect(st4!.type).toBe("water_overflow");
    expect(st4!.occurrences).toBe(5);
    // ~3 kL/morning * 5 = 15 kL
    expect(st4!.excess_value).toBeCloseTo(15.0, 1);
    // Daily cost ~Rs 43/day
    expect(st4!.daily_cost_inr).toBeCloseTo(43, 0);

    // Check after-hours indicator
    const afterHours = computeAfterHoursSharePerBlock(ctx);
    expect(afterHours["AB-A"]).toBeDefined();
    expect(afterHours["AB-A"].afterHoursPct).toBeGreaterThan(0);
  });
});
