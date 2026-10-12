/**
 * Electricity anomaly detector (pure TypeScript, no database calls).
 * Rules:
 * - R1 (elec_unscheduled_load): room unscheduled and load - standby > max(0.4 kW, 4 sigma).
 *   Events need at least 2 consecutive hours; 1-hour gap is tolerated; 1-hour blips are ignored.
 * - R2 (elec_band_excess): meters without a timetable (hostel floors, mess) use 168-bucket
 *   hour-of-week medians with tolerance = max(25% of expected, 3 scaled MAD).
 *   Flagged if band excess lasts for at least 3 consecutive hours.
 * Also computes after-hours share per block as an indicator.
 */
import { median, scaledMad } from "../stats";
import { DEFAULT_SETTINGS } from "../settings";
import {
  type Detector,
  type DetectorContext,
  type DetectorLocation,
  type AnomalyDraft,
  type RawEvent,
  mergeAndBuildAnomalies,
} from "./anomalies";

/**
 * Builds a fast lookup map for timetable slots: (location_id, weekday, hour) -> boolean.
 */
function buildTimetableIndex(
  timetable: DetectorContext["timetable"],
  locations: DetectorContext["locations"],
): (locId: number, weekday: number, hour: number) => boolean {
  if (timetable instanceof Map) {
    const locCodeMap = new Map<number, string>();
    for (const l of locations) locCodeMap.set(l.id, l.code);

    return (locId: number, weekday: number, hour: number) => {
      const code = locCodeMap.get(locId);
      if (!code) return false;
      const sched = timetable.get(code);
      if (!sched) return false;
      return sched[weekday * 24 + hour] ?? false;
    };
  }

  const lookup = new Set<string>();
  for (const s of timetable) {
    if (s.scheduled === 1) {
      lookup.add(`${s.location_id}:${s.weekday}:${s.hour}`);
    }
  }

  return (locId: number, weekday: number, hour: number) => {
    return lookup.has(`${locId}:${weekday}:${hour}`);
  };
}

/**
 * Detects electricity anomalies (R1 and R2) from pure context.
 */
export function detectElectricityAnomalies(ctx: DetectorContext): AnomalyDraft[] {
  const settings = ctx.settings ?? DEFAULT_SETTINGS;
  const isScheduled = buildTimetableIndex(ctx.timetable, ctx.locations);

  const elecMeters = ctx.meters.filter((m) => m.resource === "electricity");
  const rawEvents: RawEvent[] = [];

  // Group readings by meter_id
  const readingsByMeter = new Map<string, DetectorContext["readings"]>();
  for (const r of ctx.readings) {
    if (!readingsByMeter.has(r.meter_id)) readingsByMeter.set(r.meter_id, []);
    readingsByMeter.get(r.meter_id)!.push(r);
  }

  for (const meter of elecMeters) {
    const meterReadings = readingsByMeter.get(meter.id) ?? [];
    if (meterReadings.length === 0) continue;

    // Sort chronologically
    meterReadings.sort((a, b) => a.ts.localeCompare(b.ts));

    const isNonTimetable = meter.id.startsWith("E-HST") || meter.id.startsWith("E-MESS");

    if (!isNonTimetable) {
      // ── Rule R1: Timetable-based rooms ───────────────────────────────────
      // 1. Compute 28-day baseline for standby and occupied
      const standbyVals: number[] = [];
      const occupiedVals: number[] = [];

      for (const r of meterReadings) {
        const d = new Date(`${r.ts}:00Z`);
        const campusWeekday = (d.getUTCDay() + 6) % 7;
        const hour = d.getUTCHours();
        const sched = isScheduled(meter.location_id, campusWeekday, hour);

        if (sched) {
          occupiedVals.push(r.value);
        } else {
          standbyVals.push(r.value);
        }
      }

      const medStandby = standbyVals.length > 0 ? median(standbyVals) : 0.05;
      const madStandby = standbyVals.length > 0 ? scaledMad(standbyVals) : 0.02;
      const sigmaStandby = Math.max(0.01, isNaN(madStandby) ? 0.02 : madStandby);

      const threshold = Math.max(
        settings.thresholds.elec_min_excess_kw, // 0.4
        settings.thresholds.elec_sigma_multiplier * sigmaStandby, // 4 * sigma
      );

      // 2. Identify flagged hours (unscheduled & excess > threshold)
      interface FlaggedHour {
        ts: string;
        dateMs: number;
        hour: number;
        value: number;
        baseline: number;
        excess: number;
      }

      const flagged: FlaggedHour[] = [];

      for (const r of meterReadings) {
        const d = new Date(`${r.ts}:00Z`);
        const campusWeekday = (d.getUTCDay() + 6) % 7;
        const hour = d.getUTCHours();
        const sched = isScheduled(meter.location_id, campusWeekday, hour);

        if (!sched) {
          const excess = r.value - medStandby;
          if (excess > threshold) {
            flagged.push({
              ts: r.ts,
              dateMs: d.getTime(),
              hour,
              value: r.value,
              baseline: medStandby,
              excess,
            });
          }
        }
      }

      // 3. Cluster flagged hours: consecutive or 1-hour gap tolerated (gap <= 2 hours)
      if (flagged.length > 0) {
        const clusters: FlaggedHour[][] = [];
        let curCluster: FlaggedHour[] = [flagged[0]];

        for (let i = 1; i < flagged.length; i++) {
          const prev = curCluster[curCluster.length - 1];
          const cur = flagged[i];
          const diffHours = (cur.dateMs - prev.dateMs) / 3600000;

          if (diffHours <= settings.thresholds.elec_gap_tolerance_hours + 1) {
            // Gap of 1 hour tolerated (e.g. diff is 1 or 2 hours)
            curCluster.push(cur);
          } else {
            clusters.push(curCluster);
            curCluster = [cur];
          }
        }
        clusters.push(curCluster);

        // 4. Filter clusters: need at least 2 consecutive/flagged hours (blips ignored)
        for (const cluster of clusters) {
          if (cluster.length >= settings.thresholds.elec_min_run_hours_r1) {
            const start_ts = cluster[0].ts;
            const end_ts = cluster[cluster.length - 1].ts;
            const excess_value = cluster.reduce((sum, h) => sum + h.excess, 0);

            rawEvents.push({
              type: "elec_unscheduled_load",
              resource: "electricity",
              location_id: meter.location_id,
              meter_id: meter.id,
              start_ts,
              end_ts,
              excess_value,
              unit: "kWh",
              flagged_hours: cluster.map((h) => ({
                ts: h.ts,
                value: h.value,
                baseline: h.baseline,
              })),
              confidence: "high",
            });
          }
        }
      }
    } else {
      // ── Rule R2: Meters without timetable (hostel floors, mess) ──────────
      // 168 hour-of-week buckets
      const buckets: number[][] = Array.from({ length: 168 }, () => []);

      for (const r of meterReadings) {
        const d = new Date(`${r.ts}:00Z`);
        const campusWeekday = (d.getUTCDay() + 6) % 7;
        const hour = d.getUTCHours();
        const how = campusWeekday * 24 + hour;
        buckets[how].push(r.value);
      }

      const expectedByHow = new Float64Array(168);
      const toleranceByHow = new Float64Array(168);

      for (let how = 0; how < 168; how++) {
        const vals = buckets[how];
        const exp = vals.length > 0 ? median(vals) : 10.0;
        const madVal = vals.length > 0 ? scaledMad(vals) : 1.0;
        const tol = Math.max(
          settings.thresholds.elec_band_min_tolerance_pct * exp, // 25% of expected
          settings.thresholds.elec_band_sigma_multiplier * (isNaN(madVal) ? 0.5 : madVal), // 3 * scaled MAD
        );
        expectedByHow[how] = exp;
        toleranceByHow[how] = tol;
      }

      // Check for band excess lasting at least 3 consecutive hours
      let currentRun: {
        ts: string;
        dateMs: number;
        value: number;
        baseline: number;
        excess: number;
      }[] = [];

      for (const r of meterReadings) {
        const d = new Date(`${r.ts}:00Z`);
        const campusWeekday = (d.getUTCDay() + 6) % 7;
        const hour = d.getUTCHours();
        const how = campusWeekday * 24 + hour;

        const exp = expectedByHow[how];
        const tol = toleranceByHow[how];

        if (r.value > exp + tol) {
          const item = {
            ts: r.ts,
            dateMs: d.getTime(),
            value: r.value,
            baseline: exp,
            excess: r.value - exp,
          };

          if (currentRun.length === 0) {
            currentRun.push(item);
          } else {
            const prev = currentRun[currentRun.length - 1];
            const diffHours = (item.dateMs - prev.dateMs) / 3600000;
            if (diffHours === 1) {
              currentRun.push(item);
            } else {
              if (currentRun.length >= settings.thresholds.elec_min_run_hours_r2) {
                rawEvents.push({
                  type: "elec_band_excess",
                  resource: "electricity",
                  location_id: meter.location_id,
                  meter_id: meter.id,
                  start_ts: currentRun[0].ts,
                  end_ts: currentRun[currentRun.length - 1].ts,
                  excess_value: currentRun.reduce((s, h) => s + h.excess, 0),
                  unit: "kWh",
                  flagged_hours: currentRun.map((h) => ({
                    ts: h.ts,
                    value: h.value,
                    baseline: h.baseline,
                  })),
                  confidence: "medium",
                });
              }
              currentRun = [item];
            }
          }
        } else {
          if (currentRun.length >= settings.thresholds.elec_min_run_hours_r2) {
            rawEvents.push({
              type: "elec_band_excess",
              resource: "electricity",
              location_id: meter.location_id,
              meter_id: meter.id,
              start_ts: currentRun[0].ts,
              end_ts: currentRun[currentRun.length - 1].ts,
              excess_value: currentRun.reduce((s, h) => s + h.excess, 0),
              unit: "kWh",
              flagged_hours: currentRun.map((h) => ({
                ts: h.ts,
                value: h.value,
                baseline: h.baseline,
              })),
              confidence: "medium",
            });
          }
          currentRun = [];
        }
      }

      if (currentRun.length >= settings.thresholds.elec_min_run_hours_r2) {
        rawEvents.push({
          type: "elec_band_excess",
          resource: "electricity",
          location_id: meter.location_id,
          meter_id: meter.id,
          start_ts: currentRun[0].ts,
          end_ts: currentRun[currentRun.length - 1].ts,
          excess_value: currentRun.reduce((s, h) => s + h.excess, 0),
          unit: "kWh",
          flagged_hours: currentRun.map((h) => ({
            ts: h.ts,
            value: h.value,
            baseline: h.baseline,
          })),
          confidence: "medium",
        });
      }
    }
  }

  return mergeAndBuildAnomalies(rawEvents, ctx);
}

/**
 * Computes after-hours electricity share per block as an indicator.
 * After-hours: outside teaching schedule (Mon-Fri 09-17, Sat 09-13).
 */
export function computeAfterHoursSharePerBlock(
  ctx: DetectorContext,
): Record<string, { totalKwh: number; afterHoursKwh: number; afterHoursPct: number }> {
  const result: Record<string, { totalKwh: number; afterHoursKwh: number; afterHoursPct: number }> = {};

  const meterToBlock = new Map<string, string>();
  for (const m of ctx.meters) {
    if (m.resource === "electricity") {
      const loc = ctx.locations.find((l) => l.id === m.location_id);
      if (loc) {
        let blockCode = loc.code;
        if (loc.kind === "room" || loc.kind === "floor") {
          let cur: DetectorLocation | undefined = loc;
          while (cur && cur.kind !== "block") {
            cur = ctx.locations.find((l) => l.id === cur?.parent_id);
          }
          if (cur) blockCode = cur.code;
        }
        meterToBlock.set(m.id, blockCode);
      }
    }
  }

  for (const r of ctx.readings) {
    const blockCode = meterToBlock.get(r.meter_id);
    if (!blockCode) continue;

    if (!result[blockCode]) {
      result[blockCode] = { totalKwh: 0, afterHoursKwh: 0, afterHoursPct: 0 };
    }

    const d = new Date(`${r.ts}:00Z`);
    const campusWeekday = (d.getUTCDay() + 6) % 7;
    const hour = d.getUTCHours();

    let isAfterHours = true;
    if (campusWeekday < 5 && hour >= 9 && hour < 17) {
      isAfterHours = false;
    } else if (campusWeekday === 5 && hour >= 9 && hour < 13) {
      isAfterHours = false;
    }

    result[blockCode].totalKwh += r.value;
    if (isAfterHours) {
      result[blockCode].afterHoursKwh += r.value;
    }
  }

  for (const blk of Object.keys(result)) {
    const data = result[blk];
    data.afterHoursPct = data.totalKwh > 0 ? Number(((data.afterHoursKwh / data.totalKwh) * 100).toFixed(1)) : 0;
    data.totalKwh = Number(data.totalKwh.toFixed(1));
    data.afterHoursKwh = Number(data.afterHoursKwh.toFixed(1));
  }

  return result;
}

export const electricityDetector: Detector = {
  id: "electricity",
  resource: "electricity",
  run: detectElectricityAnomalies,
};
