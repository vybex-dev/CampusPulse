/**
 * Simulated campus clock and deterministic fast-forward engine.
 * Fast-forward generates additional readings and waste logs using the deterministic generator,
 * respecting active faults (faults with fixed_at stop applying), and invokes afterFastForward()
 * for analytics.
 */
import { getDb, tx, type Db } from "../db";
import {
  loadCampusConfig,
  loadFaultScript,
  deriveMeters,
  type FaultSpec,
} from "../config";
import {
  generateMeterDayReadings,
  generateDayWasteLogs,
} from "./generator";

export const SIM_START = "2026-10-12T00:00";
const HISTORY_START = "2026-09-12T00:00";

export interface FastForwardContext {
  fromTs: string;
  toTs: string;
  days: number;
  db: Db;
}

export type FastForwardHook = (ctx: FastForwardContext) => void;

const hooks: FastForwardHook[] = [];

/**
 * Register a hook to be called after fast-forward finishes inserting new readings.
 */
export function registerAfterFastForward(hook: FastForwardHook): void {
  hooks.push(hook);
}

/**
 * Executes all registered afterFastForward hooks.
 */
export function afterFastForward(ctx: FastForwardContext): void {
  for (const hook of hooks) {
    try {
      hook(ctx);
    } catch (err) {
      console.error("Error in afterFastForward hook:", err);
    }
  }
}

const g = globalThis as unknown as { __simClock?: { iso: string } };

export function getClock(): string {
  g.__simClock ??= { iso: SIM_START };
  return g.__simClock.iso;
}

export function resetClock(): string {
  g.__simClock = { iso: SIM_START };
  return SIM_START;
}

export function getDemoState() {
  return { clock: getClock(), seed: Number(process.env.SIM_SEED ?? 42) };
}

/**
 * Fast-forwards the clock by 1 or 7 days, deterministically generating data for the window.
 * Executes in under 1 second using batch SQLite transactions.
 */
export function advanceDays(days: number, seed = Number(process.env.SIM_SEED ?? 42)): string {
  const currentTs = getClock();
  const startDate = new Date(`${currentTs}:00Z`);
  const endDate = new Date(startDate.getTime() + days * 86400000);
  const targetTs = endDate.toISOString().slice(0, 16);

  const db = getDb();
  const cfg = loadCampusConfig();
  const meters = deriveMeters(cfg);

  // Read current active faults directly from DB table `fault`
  const faultRows = db.prepare(`SELECT * FROM fault`).all() as {
    id: number;
    story_code: string | null;
    meter_id: string | null;
    kind: string;
    params_json: string;
    start_ts: string;
    active: number;
    fixed_at: string | null;
  }[];

  const dbFaults: FaultSpec[] = faultRows.map((r) => ({
    story_code: r.story_code ?? "",
    meter_id: r.meter_id,
    kind: r.kind as FaultSpec["kind"],
    params: JSON.parse(r.params_json),
    start_ts: r.start_ts,
    active: r.active === 1,
    fixed_at: r.fixed_at,
    expected: {},
  }));

  const faultScript = loadFaultScript();
  const activeScript = {
    faults: dbFaults,
    diffuse: faultScript.diffuse,
  };

  // Build timetable lookup
  const timetableSlots = db.prepare(`
    SELECT l.code, t.weekday, t.hour, t.scheduled
    FROM timetable_slot t
    JOIN location l ON l.id = t.location_id
  `).all() as { code: string; weekday: number; hour: number; scheduled: number }[];

  const timetableLookup = new Map<string, boolean[]>();
  for (const row of timetableSlots) {
    if (!timetableLookup.has(row.code)) {
      timetableLookup.set(row.code, new Array<boolean>(168).fill(false));
    }
    timetableLookup.get(row.code)![row.weekday * 24 + row.hour] = row.scheduled === 1;
  }

  // Generate data inside a transaction
  tx((dbInstance) => {
    const insertReading = dbInstance.prepare(`
      INSERT OR REPLACE INTO reading (meter_id, ts, value)
      VALUES (?, ?, ?)
    `);

    const insertWasteLog = dbInstance.prepare(`
      INSERT INTO waste_log (
        ts, block_id, mode, category, item_name, confidence,
        source, provider, chosen_bin, correct_bin, is_correct,
        est_weight_kg, co2e_avoided_kg, points, thumb
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const histStart = new Date(`${HISTORY_START}:00Z`).getTime();

    for (let d = 0; d < days; d++) {
      const curDate = new Date(startDate.getTime() + d * 86400000);
      const dateStr = curDate.toISOString().slice(0, 10);
      const jsDay = curDate.getUTCDay();
      const campusWeekday = (jsDay + 6) % 7;
      const dayIndex = Math.floor((curDate.getTime() - histStart) / 86400000);

      // Readings for all 59 meters
      for (const meter of meters) {
        const readings = generateMeterDayReadings(
          meter,
          dateStr,
          dayIndex,
          campusWeekday,
          seed,
          cfg,
          timetableLookup,
          activeScript,
        );

        for (let h = 0; h < 24; h++) {
          insertReading.run(readings[h].meter_id, readings[h].ts, readings[h].value);
        }
      }

      // Waste logs
      const wasteLogs = generateDayWasteLogs(dateStr, seed, cfg, activeScript);
      for (const log of wasteLogs) {
        insertWasteLog.run(
          log.ts,
          log.block_id,
          log.mode,
          log.category,
          log.item_name,
          log.confidence,
          log.source,
          log.provider,
          log.chosen_bin,
          log.correct_bin,
          log.is_correct,
          log.est_weight_kg,
          log.co2e_avoided_kg,
          log.points,
          log.thumb,
        );
      }
    }
  }, db);

  g.__simClock = { iso: targetTs };

  // Call afterFastForward hook
  afterFastForward({
    fromTs: currentTs,
    toTs: targetTs,
    days,
    db,
  });

  return targetTs;
}
