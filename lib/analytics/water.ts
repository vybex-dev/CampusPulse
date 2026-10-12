/**
 * Water anomaly detector (pure TypeScript, no database calls).
 * Rules:
 * - W1 (water_night_leak): min(02:00, 03:00 reading) above 28-night median baseline
 *   by more than max(300 L/h, 3 sigma) on at least 2 consecutive nights.
 *   Flagged on night 2. Evening draw is ignored.
 * - W2 (water_overflow): tank level at 99.5% or more while inflow exceeds expected
 *   by more than 1000 L/h. Full tank without extra inflow is ignored.
 * - W3 (per-capita marker): indicates when trailing 7-day per-capita usage > 120% of target.
 */
import { median, scaledMad } from "../stats";
import { DEFAULT_SETTINGS } from "../settings";
import {
  type Detector,
  type DetectorContext,
  type AnomalyDraft,
  type RawEvent,
  mergeAndBuildAnomalies,
} from "./anomalies";

export interface PerCapitaBlockReport {
  block_code: string;
  population: number;
  target_l: number;
  actual_l: number;
  ratio_pct: number;
  is_flagged: boolean;
}

/**
 * Detects water anomalies (W1 night leak and W2 tank overflow) from pure context.
 */
export function detectWaterAnomalies(ctx: DetectorContext): AnomalyDraft[] {
  const settings = ctx.settings ?? DEFAULT_SETTINGS;
  const rawEvents: RawEvent[] = [];

  const waterMeters = ctx.meters.filter((m) => m.resource === "water");
  const tankMeters = ctx.meters.filter((m) => m.resource === "tank_level");

  // Group readings by meter_id
  const readingsByMeter = new Map<string, DetectorContext["readings"]>();
  for (const r of ctx.readings) {
    if (!readingsByMeter.has(r.meter_id)) readingsByMeter.set(r.meter_id, []);
    readingsByMeter.get(r.meter_id)!.push(r);
  }

  // ── Rule W1: Night Leaks ──────────────────────────────────────────────────
  for (const meter of waterMeters) {
    const readings = readingsByMeter.get(meter.id) ?? [];
    if (readings.length === 0) continue;

    // Group readings by date (YYYY-MM-DD)
    const readingsByDate = new Map<string, Map<number, number>>();
    for (const r of readings) {
      const dateStr = r.ts.slice(0, 10);
      const hour = parseInt(r.ts.slice(11, 13), 10);
      if (!readingsByDate.has(dateStr)) readingsByDate.set(dateStr, new Map());
      readingsByDate.get(dateStr)!.set(hour, r.value);
    }

    const sortedDates = Array.from(readingsByDate.keys()).sort();
    if (sortedDates.length === 0) continue;

    // Collect night min (min of 02:00 and 03:00) for each date
    interface NightData {
      date: string;
      nightMin: number;
      ts02: string;
      val02: number;
      val03: number;
    }

    const nightList: NightData[] = [];
    for (const date of sortedDates) {
      const hoursMap = readingsByDate.get(date)!;
      const val02 = hoursMap.get(2);
      const val03 = hoursMap.get(3);
      if (val02 !== undefined && val03 !== undefined) {
        nightList.push({
          date,
          nightMin: Math.min(val02, val03),
          ts02: `${date}T02:00`,
          val02,
          val03,
        });
      }
    }

    if (nightList.length < 2) continue;

    // Baseline over first 28 nights (or available baseline)
    const baselineMins = nightList.slice(0, 28).map((n) => n.nightMin);
    const medBaseline = median(baselineMins);
    const madBaseline = scaledMad(baselineMins);
    const sigma = Math.max(5, isNaN(madBaseline) ? 10 : madBaseline);

    const thresholdExcess = Math.max(
      settings.thresholds.water_leak_min_excess_lph, // 300 L/h
      settings.thresholds.water_leak_sigma_multiplier * sigma, // 3 * sigma
    );
    const leakCutoff = medBaseline + thresholdExcess;

    // Evaluate consecutive leaking nights
    interface LeakingRun {
      nights: NightData[];
    }
    const leakingRuns: LeakingRun[] = [];
    let curRun: NightData[] = [];

    for (let i = 0; i < nightList.length; i++) {
      const item = nightList[i];
      if (item.nightMin > leakCutoff) {
        if (curRun.length === 0) {
          curRun.push(item);
        } else {
          // Check if consecutive calendar day
          const prevDate = new Date(`${curRun[curRun.length - 1].date}T00:00:00Z`);
          const curDate = new Date(`${item.date}T00:00:00Z`);
          const diffDays = Math.round((curDate.getTime() - prevDate.getTime()) / 86400000);

          if (diffDays === 1) {
            curRun.push(item);
          } else {
            if (curRun.length >= settings.thresholds.water_leak_min_nights) {
              leakingRuns.push({ nights: [...curRun] });
            }
            curRun = [item];
          }
        }
      } else {
        if (curRun.length >= settings.thresholds.water_leak_min_nights) {
          leakingRuns.push({ nights: [...curRun] });
        }
        curRun = [];
      }
    }
    if (curRun.length >= settings.thresholds.water_leak_min_nights) {
      leakingRuns.push({ nights: [...curRun] });
    }

    // Build raw events for confirmed leaks
    for (const run of leakingRuns) {
      const firstNight = run.nights[0];
      const lastNight = run.nights[run.nights.length - 1];

      // Leak rate in L/h
      const avgNightMin = run.nights.reduce((s, n) => s + n.nightMin, 0) / run.nights.length;
      const leakRateLph = Math.max(0, avgNightMin - medBaseline);

      // Loss per leaking day = leakRateLph * 24 hours
      const dailyLossLitres = leakRateLph * 24;
      const totalLossLitres = dailyLossLitres * run.nights.length;
      const totalExcessKl = Number((totalLossLitres / 1000).toFixed(2));

      const flaggedHours: { ts: string; value: number; baseline: number }[] = [];
      for (const n of run.nights) {
        flaggedHours.push({
          ts: `${n.date}T02:00`,
          value: n.val02,
          baseline: medBaseline,
        });
        flaggedHours.push({
          ts: `${n.date}T03:00`,
          value: n.val03,
          baseline: medBaseline,
        });
      }

      rawEvents.push({
        type: "water_night_leak",
        resource: "water",
        location_id: meter.location_id,
        meter_id: meter.id,
        start_ts: `${firstNight.date}T00:00`,
        end_ts: `${lastNight.date}T23:00`,
        excess_value: totalExcessKl,
        unit: "kL",
        flagged_hours: flaggedHours,
        confidence: "high",
        evidence_data: {
          median_baseline_lph: Math.round(medBaseline),
          average_leak_night_lph: Math.round(avgNightMin),
          loss_kl_per_day: Number((dailyLossLitres / 1000).toFixed(1)),
          consecutive_nights: run.nights.length,
        },
      });
    }
  }

  // ── Rule W2: Tank Overflow ────────────────────────────────────────────────
  for (const tankMeter of tankMeters) {
    const tankReadings = readingsByMeter.get(tankMeter.id) ?? [];
    if (tankReadings.length === 0) continue;

    // Find block code for this tank (e.g. T-AB-B -> AB-B)
    const blockCode = tankMeter.id.replace(/^T-/, "");
    const inflowMeterId = `W-${blockCode}`;
    const inflowReadings = readingsByMeter.get(inflowMeterId) ?? [];
    if (inflowReadings.length === 0) continue;

    // Index inflow readings by ts
    const inflowByTs = new Map<string, number>();
    for (const r of inflowReadings) inflowByTs.set(r.ts, r.value);

    // Compute expected baseline inflow at each hour (median by hour of day)
    const inflowByHour: number[][] = Array.from({ length: 24 }, () => []);
    for (const r of inflowReadings) {
      const h = parseInt(r.ts.slice(11, 13), 10);
      inflowByHour[h].push(r.value);
    }
    const expectedInflowByHour = new Float64Array(24);
    for (let h = 0; h < 24; h++) {
      expectedInflowByHour[h] = inflowByHour[h].length > 0 ? median(inflowByHour[h]) : 60;
    }

    interface OverflowHour {
      ts: string;
      dateMs: number;
      tankLevel: number;
      inflow: number;
      expectedInflow: number;
      excessLph: number;
    }
    const overflowHours: OverflowHour[] = [];

    for (const r of tankReadings) {
      if (r.value >= settings.thresholds.water_overflow_tank_pct) {
        // Tank full (>= 99.5%)
        const inflowVal = inflowByTs.get(r.ts);
        if (inflowVal !== undefined) {
          const h = parseInt(r.ts.slice(11, 13), 10);
          const expInflow = expectedInflowByHour[h];
          const excess = inflowVal - expInflow;

          if (excess >= settings.thresholds.water_overflow_min_excess_lph) {
            const d = new Date(`${r.ts}:00Z`);
            overflowHours.push({
              ts: r.ts,
              dateMs: d.getTime(),
              tankLevel: r.value,
              inflow: inflowVal,
              expectedInflow: expInflow,
              excessLph: excess,
            });
          }
        }
      }
    }

    if (overflowHours.length > 0) {
      // Group contiguous overflow hours (diff <= 2 hours)
      const clusters: OverflowHour[][] = [];
      let curCluster: OverflowHour[] = [overflowHours[0]];

      for (let i = 1; i < overflowHours.length; i++) {
        const prev = curCluster[curCluster.length - 1];
        const cur = overflowHours[i];
        const diffHours = (cur.dateMs - prev.dateMs) / 3600000;

        if (diffHours <= 2) {
          curCluster.push(cur);
        } else {
          clusters.push(curCluster);
          curCluster = [cur];
        }
      }
      clusters.push(curCluster);

      for (const cluster of clusters) {
        const totalLitres = cluster.reduce((sum, h) => sum + h.excessLph, 0);
        const excessKl = Number((totalLitres / 1000).toFixed(2));

        rawEvents.push({
          type: "water_overflow",
          resource: "water",
          location_id: tankMeter.location_id,
          meter_id: tankMeter.id,
          start_ts: cluster[0].ts,
          end_ts: cluster[cluster.length - 1].ts,
          excess_value: excessKl,
          unit: "kL",
          flagged_hours: cluster.map((h) => ({
            ts: h.ts,
            value: h.inflow,
            baseline: h.expectedInflow,
          })),
          confidence: "high",
          evidence_data: {
            tank_level_pct: cluster[0].tankLevel,
            inflow_meter_id: inflowMeterId,
            excess_inflow_lph: cluster[0].excessLph,
          },
        });
      }
    }
  }

  return mergeAndBuildAnomalies(rawEvents, ctx);
}

/**
 * Computes per-capita daily water consumption per block for the trailing 7-day window.
 */
export function computePerCapitaWater(ctx: DetectorContext): PerCapitaBlockReport[] {
  const settings = ctx.settings ?? DEFAULT_SETTINGS;
  const reports: PerCapitaBlockReport[] = [];

  const clockDate = new Date(`${ctx.clock}:00Z`);
  const sevenDaysAgoMs = clockDate.getTime() - 7 * 86400000;

  const waterMeters = ctx.meters.filter((m) => m.resource === "water");

  for (const m of waterMeters) {
    const loc = ctx.locations.find((l) => l.id === m.location_id);
    if (!loc) continue;

    const blockCode = loc.code;
    const pop = loc.population ?? 1;

    // Default per-capita target
    let target = 20; // academic
    if (loc.kind === "block" && blockCode.startsWith("HST")) {
      target = 120; // hostel
    } else if (blockCode === "MESS") {
      target = 10; // mess
    }

    const mReadings = ctx.readings.filter(
      (r) =>
        r.meter_id === m.id &&
        new Date(`${r.ts}:00Z`).getTime() >= sevenDaysAgoMs &&
        new Date(`${r.ts}:00Z`).getTime() <= clockDate.getTime(),
    );

    const totalLitres = mReadings.reduce((sum, r) => sum + r.value, 0);
    const dailyAvgLitres = totalLitres / 7;
    const perCapitaDaily = Math.round(dailyAvgLitres / pop);
    const ratio = perCapitaDaily / target;

    reports.push({
      block_code: blockCode,
      population: pop,
      target_l: target,
      actual_l: perCapitaDaily,
      ratio_pct: Math.round(ratio * 100),
      is_flagged: ratio >= settings.thresholds.water_percapita_flag_ratio,
    });
  }

  return reports;
}

export const waterDetector: Detector = {
  id: "water",
  resource: "water",
  run: detectWaterAnomalies,
};
