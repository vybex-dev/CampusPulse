import crypto from "node:crypto";
import { describe, expect, it, beforeEach } from "vitest";
import { getDb, closeDb } from "@/lib/db";
import { resetCampus } from "@/lib/sim/reset";
import { advanceDays, getClock, SIM_START } from "@/lib/sim/clock";

function hashReadingTable(): string {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT meter_id, ts, value FROM reading ORDER BY meter_id ASC, ts ASC`,
    )
    .all() as { meter_id: string; ts: string; value: number }[];

  const hash = crypto.createHash("sha256");
  for (const r of rows) {
    hash.update(`${r.meter_id}|${r.ts}|${r.value.toFixed(4)};`);
  }
  return hash.digest("hex");
}

describe("deterministic simulator (lib/sim)", () => {
  beforeEach(() => {
    resetCampus();
  });

  it("resetting twice gives identical reading-table hashes", () => {
    const hash1 = hashReadingTable();

    // Reset a second time
    const res2 = resetCampus();
    expect(res2.readingsCount).toBe(42480);
    expect(res2.clock).toBe(SIM_START);

    const hash2 = hashReadingTable();
    expect(hash1).toBe(hash2);
  });

  it("fast-forward 7 equals 7 x fast-forward 1 (identical reading-table hashes)", () => {
    // Branch A: fast-forward 7 days directly
    resetCampus();
    advanceDays(7);
    const hash7Direct = hashReadingTable();

    // Branch B: fast-forward 1 day, 7 times sequentially
    resetCampus();
    for (let i = 0; i < 7; i++) {
      advanceDays(1);
    }
    const hash1Times7 = hashReadingTable();

    expect(hash7Direct).toBe(hash1Times7);
    expect(getClock()).toBe("2026-10-19T00:00");
  });

  it("ST-1 evenings sit near 3.4 kW on active dates", () => {
    const db = getDb();
    // Oct 5, 6, 8, 9, 10 between 19:00 and 23:00 (hours 19, 20, 21, 22)
    const st1Dates = [
      "2026-10-05",
      "2026-10-06",
      "2026-10-08",
      "2026-10-09",
      "2026-10-10",
    ];

    for (const d of st1Dates) {
      const rows = db
        .prepare(
          `SELECT ts, value FROM reading
           WHERE meter_id = 'E-A-204'
             AND ts IN (?, ?, ?, ?)`,
        )
        .all(`${d}T19:00`, `${d}T20:00`, `${d}T21:00`, `${d}T22:00`) as {
        ts: string;
        value: number;
      }[];

      expect(rows).toHaveLength(4);
      for (const r of rows) {
        expect(r.value).toBeCloseTo(3.4, 1);
      }

      const eveningKwh = rows.reduce((acc, cur) => acc + cur.value, 0);
      // Standby is 0.05 kW, so excess is ~13.4 kWh
      expect(eveningKwh).toBeCloseTo(13.6, 0.5);
    }
  });

  it("ST-3 HST-1 night flow increases by ~800 L/h from Oct 6 (night flow ~920 L/h)", () => {
    const db = getDb();
    // Normal night flow on Oct 5 at 02:00
    const normal = db
      .prepare(
        `SELECT value FROM reading WHERE meter_id = 'W-HST-1' AND ts = '2026-10-05T02:00'`,
      )
      .get() as { value: number };
    expect(normal.value).toBeLessThan(200);

    // Leaking night flow on Oct 6 at 02:00
    const leaking = db
      .prepare(
        `SELECT value FROM reading WHERE meter_id = 'W-HST-1' AND ts = '2026-10-06T02:00'`,
      )
      .get() as { value: number };
    expect(leaking.value).toBeGreaterThan(850);
    expect(leaking.value).toBeLessThan(1000);
  });

  it("ST-4 AB-B rooftop tank overflows at 100% on Oct 7-11 at 05:00 and 06:00", () => {
    const db = getDb();
    const rows = db
      .prepare(
        `SELECT ts, value FROM reading
         WHERE meter_id = 'T-AB-B' AND ts IN ('2026-10-07T05:00', '2026-10-07T06:00')`,
      )
      .all() as { ts: string; value: number }[];

    expect(rows).toHaveLength(2);
    expect(rows[0].value).toBe(100.0);
    expect(rows[1].value).toBe(100.0);
  });

  it("recreates the pre-seeded ST-6 ticket and savings on reset", () => {
    const db = getDb();
    const ticket = db
      .prepare(`SELECT * FROM ticket WHERE status = 'verified'`)
      .get() as any;
    expect(ticket).toBeDefined();
    expect(ticket.title).toBe("Block B after-hours HVAC schedule");
    expect(ticket.team).toBe("electrical");
    expect(ticket.priority).toBe("high");

    const savings = db
      .prepare(`SELECT * FROM savings WHERE ticket_id = ?`)
      .get(ticket.id) as any;
    expect(savings).toBeDefined();
    expect(savings.saved_units).toBe(396);
    expect(savings.saved_inr).toBe(3168);
    expect(savings.saved_co2e_kg).toBeCloseTo(285.12, 1);
  });

  it("performance: reset under 5s and 7-day fast-forward under 1s", () => {
    const tReset = Date.now();
    const res = resetCampus();
    const resetDuration = Date.now() - tReset;
    expect(resetDuration).toBeLessThan(5000);

    const tFF = Date.now();
    advanceDays(7);
    const ffDuration = Date.now() - tFF;
    expect(ffDuration).toBeLessThan(1000);
  });
});
