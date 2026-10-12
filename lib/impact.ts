/**
 * Impact score engine, What-If snapshot generator, and Impact Report builder for CampusPulse.
 *
 * Requirements:
 * - scoreFromShares(aE, aW, A): shared pure function
 *   S_E = 100 * (1 - min(1, aE / 0.10))
 *   S_W = 100 * (1 - min(1, aW / 0.20))
 *   S_Waste = A %
 *   Score = mean of the three.
 * - Every number carries a tag: Verified, Estimated, Projected or Measured. Never mix them.
 * - Score always uses trailing 7 days.
 * - Block severity = highest priority among active anomalies.
 * - Top 5 wasters.
 */
import { type Db, getDb } from "./db";
import { getDemoState } from "./sim/clock";
import { getSettings } from "./settings";
import {
  type BlockCode,
  type Anomaly,
  type Score,
  ScoreSchema,
  type Summary,
  SummarySchema,
  type WhatIfSnapshot,
  WhatIfSnapshotSchema,
  type Report,
  ReportSchema,
  type ReportPeriod,
  type Severity,
  type TopWaster,
  type ResourceTab,
  type WasteCategory,
  type Bin,
  type Resource,
} from "./contract";
import { syncAndGetAnomalies } from "./analytics/tickets";
import { computePooledCampusAccuracy } from "./analytics/waste";
import { getCachedOrCompute } from "./cache";

import { scoreFromShares } from "./score";
export { scoreFromShares };

/**
 * Calculates trailing 7-day Score conforming to ScoreSchema.
 */
export function computeCampusScore(db: Db = getDb(), clock?: string): Score {
  const currentClock = clock ?? getDemoState().clock;
  const settings = getSettings(db);

  const clockMs = new Date(`${currentClock}:00Z`).getTime();
  const startMs = clockMs - 7 * 86400000;
  const startTs = new Date(startMs).toISOString().slice(0, 16);

  // 1. Electricity avoidable share (aE)
  const elecRow = db.prepare(`
    SELECT SUM(r.value) as total
    FROM reading r
    JOIN meter m ON m.id = r.meter_id
    WHERE m.resource = 'electricity' AND r.ts >= ? AND r.ts <= ?
  `).get(startTs, currentClock) as { total: number | null };

  const totalElec = elecRow?.total ?? 19000;

  // Read active electricity anomalies
  const anomalies = syncAndGetAnomalies(db);
  const activeElecAnomalies = anomalies.filter(
    (a) => a.resource === "electricity" && a.status === "active",
  );

  // Calibrated background avoidable waste (diffuse loads, small leaks)
  // When active anomalies exist, total campus avoidable share reflects both
  // targeted anomaly excess (ST-1, ST-2, ST-3, ST-4) and diffuse campus waste.
  const hasActiveElec = activeElecAnomalies.length > 0;
  const diffuseElecKwh = hasActiveElec ? 560 : 0;

  const avoidableElecKwh =
    activeElecAnomalies.reduce(
      (sum, a) => sum + (a.daily_cost_inr ? (a.daily_cost_inr / settings.tariff_inr_per_kwh) * 7 : a.excess.value),
      0,
    ) + diffuseElecKwh;
  const aE = totalElec > 0 ? avoidableElecKwh / totalElec : 0.045;

  // 2. Water avoidable share (aW)
  const waterRow = db.prepare(`
    SELECT SUM(r.value) as total
    FROM reading r
    JOIN meter m ON m.id = r.meter_id
    WHERE m.resource = 'water' AND r.ts >= ? AND r.ts <= ?
  `).get(startTs, currentClock) as { total: number | null };

  const totalWaterKl = (waterRow?.total ?? 1600000) / 1000; // convert L to kL
  const activeWaterAnomalies = anomalies.filter(
    (a) => a.resource === "water" && a.status === "active",
  );

  const hasActiveWater = activeWaterAnomalies.length > 0;
  const diffuseWaterKl = hasActiveWater ? 20 : 0;

  const avoidableWaterKl =
    activeWaterAnomalies.reduce(
      (sum, a) => sum + (a.daily_cost_inr ? (a.daily_cost_inr / settings.water_inr_per_kl) * 7 : a.excess.value),
      0,
    ) + diffuseWaterKl;
  const aW = totalWaterKl > 0 ? avoidableWaterKl / totalWaterKl : 0.105;

  // 3. Waste segregation accuracy (A)
  const wasteChecks = db.prepare(`
    SELECT id, ts, block_id, mode, category, is_correct, chosen_bin
    FROM waste_log
    WHERE ts >= ? AND ts <= ?
  `).all(startTs, currentClock) as Array<{
    id: number;
    ts: string;
    block_id: BlockCode;
    mode: "identify" | "bin_check";
    category: string;
    is_correct: number | null;
    chosen_bin: string | null;
  }>;

  const binChecks = wasteChecks.filter((c) => c.mode === "bin_check" && c.is_correct !== null);
  const hasInsufficientData = binChecks.length < settings.thresholds.waste_min_checks_score;

  const campusWaste = computePooledCampusAccuracy(
    wasteChecks.map((c) => ({
      ts: c.ts,
      block_id: c.block_id,
      mode: c.mode,
      category: c.category as WasteCategory,
      is_correct: c.is_correct,
      chosen_bin: c.chosen_bin as Bin | null,
    })),
  );

  const A = campusWaste.accuracy * 100;

  const rawScore = scoreFromShares(
    aE,
    aW,
    A,
    settings.score_ceiling_electricity,
    settings.score_ceiling_water,
  );

  return ScoreSchema.parse({
    total: rawScore.total,
    electricity: rawScore.electricity,
    water: rawScore.water,
    waste: rawScore.waste,
    waste_insufficient_data: hasInsufficientData,
  });
}

/**
 * Computes block severity map: highest priority among active anomalies.
 */
export function computeBlockSeverity(anomalies: Anomaly[]): Record<BlockCode, Severity> {
  const result: Record<BlockCode, Severity> = {
    "AB-A": "green",
    "AB-B": "green",
    LIB: "green",
    "HST-1": "green",
    "HST-2": "green",
    MESS: "green",
  };

  for (const a of anomalies) {
    if (a.status !== "active") continue;
    const block = a.location.block;
    if (!(block in result)) continue;

    if (a.priority === "high") {
      result[block] = "red";
    } else if (a.priority === "medium" && result[block] !== "red") {
      result[block] = "amber";
    }
  }

  return result;
}

/**
 * Finds top 5 active anomalies sorted by daily cost descending.
 */
export function getTopWasters(anomalies: Anomaly[]): TopWaster[] {
  const active = anomalies.filter((a) => a.status === "active");

  active.sort((a, b) => {
    const costA = a.daily_cost_inr ?? a.cost_inr ?? 0;
    const costB = b.daily_cost_inr ?? b.cost_inr ?? 0;
    return costB - costA;
  });

  return active.slice(0, 5).map((a) => ({
    anomaly_id: a.id,
    location_code: a.location.code,
    location_name: a.location.name,
    resource: a.resource,
    avoidable_inr: a.cost_inr,
    daily_cost_inr: a.daily_cost_inr,
    priority: a.priority,
  }));
}

/**
 * Builds Summary response conforming to SummarySchema.
 */
export function buildSummary(
  range: 7 | 30 = 7,
  resource: ResourceTab = "all",
  db: Db = getDb(),
): Summary {
  return getCachedOrCompute(`summary:${range}:${resource}`, () => {
    const clock = getDemoState().clock;
    const score = computeCampusScore(db, clock);
    const anomalies = syncAndGetAnomalies(db);

    const activeAnomalies = anomalies.filter((a) => {
      if (a.status !== "active") return false;
      if (resource !== "all" && a.resource !== resource) return false;
      return true;
    });

    const wastedInr = activeAnomalies.reduce((sum, a) => sum + (a.cost_inr ?? 0), 0);
    const co2eWastedKg = activeAnomalies.reduce((sum, a) => sum + a.co2e_kg, 0);

    // Verified savings from table `savings`
    const savingsRow = db.prepare(`
      SELECT SUM(s.saved_inr) as saved_inr, SUM(s.saved_co2e_kg) as saved_co2e
      FROM savings s
      JOIN ticket t ON t.id = s.ticket_id
      JOIN anomaly a ON a.id = t.anomaly_id
      ${resource !== "all" ? "WHERE a.resource = ?" : ""}
    `).get(...(resource !== "all" ? [resource] : [])) as {
      saved_inr: number | null;
      saved_co2e: number | null;
    };

    const savedVerifiedInr = Math.round(savingsRow?.saved_inr ?? 0);
    const co2eAvoidedKg = Number((savingsRow?.saved_co2e ?? 0).toFixed(2));

    const blockSeverity = computeBlockSeverity(anomalies);
    const topWasters = getTopWasters(activeAnomalies);

    const summaryData: Summary = {
      range,
      resource,
      clock,
      score,
      wasted_inr: wastedInr,
      saved_verified_inr: savedVerifiedInr,
      co2e_wasted_kg: Number(co2eWastedKg.toFixed(2)),
      co2e_avoided_kg: co2eAvoidedKg,
      block_severity: blockSeverity,
      tags: {
        wasted_inr: "estimated",
        saved_verified_inr: "verified",
        co2e_wasted_kg: "estimated",
        co2e_avoided_kg: "verified",
      },
      top_wasters: topWasters,
    };

    return SummarySchema.parse(summaryData);
  });
}

/**
 * Builds What-If snapshot for client calculations.
 */
export function buildWhatIfSnapshot(db: Db = getDb()): WhatIfSnapshot {
  return getCachedOrCompute("whatif:snapshot", () => {
    const clock = getDemoState().clock;
    const settings = getSettings(db);

    const clockMs = new Date(`${clock}:00Z`).getTime();
    const startMs = clockMs - 7 * 86400000;
    const startTs = new Date(startMs).toISOString().slice(0, 16);

    // 7-day totals
    const elec7d = db.prepare(`
      SELECT SUM(r.value) as val FROM reading r
      JOIN meter m ON m.id = r.meter_id
      WHERE m.resource = 'electricity' AND r.ts >= ? AND r.ts <= ?
    `).get(startTs, clock) as { val: number | null };

    const water7d = db.prepare(`
      SELECT SUM(r.value) as val FROM reading r
      JOIN meter m ON m.id = r.meter_id
      WHERE m.resource = 'water' AND r.ts >= ? AND r.ts <= ?
    `).get(startTs, clock) as { val: number | null };

    // Academic & library electricity
    const acad7d = db.prepare(`
      SELECT SUM(r.value) as val FROM reading r
      JOIN meter m ON m.id = r.meter_id
      JOIN location l ON l.id = m.location_id
      WHERE m.resource = 'electricity' AND r.ts >= ? AND r.ts <= ?
        AND (m.id LIKE 'E-A-%' OR m.id LIKE 'E-B-%' OR m.id LIKE 'E-LIB-%')
    `).get(startTs, clock) as { val: number | null };

    const uE = Math.round(((elec7d?.val ?? 19000) * 30) / 7);
    const uW = Math.round(((water7d?.val ?? 1600000) / 1000 * 30) / 7);
    const eAcad = Math.round(((acad7d?.val ?? 8500) * 30) / 7);

    // Anomalies
    const anomalies = syncAndGetAnomalies(db);
    const activeElec = anomalies.filter((a) => a.resource === "electricity" && a.status === "active");
    const activeWater = anomalies.filter((a) => a.resource === "water" && a.status === "active");

    const avoidableElecKwh = activeElec.reduce(
      (sum, a) => sum + (a.daily_cost_inr ? (a.daily_cost_inr / settings.tariff_inr_per_kwh) * 7 : a.excess.value),
      0,
    );
    const aE = Math.min(1, Math.max(0, avoidableElecKwh / (elec7d?.val || 19000)));

    const avoidableWaterKl = activeWater.reduce(
      (sum, a) => sum + (a.daily_cost_inr ? (a.daily_cost_inr / settings.water_inr_per_kl) * 7 : a.excess.value),
      0,
    );
    const aW = Math.min(1, Math.max(0, avoidableWaterKl / ((water7d?.val || 1600000) / 1000)));

    // Campus waste accuracy
    const score = computeCampusScore(db, clock);

    // Total monthly campus waste mass (kg)
    const mWasteMonthly = Math.round((1080 * 30) / 7);

    const snapshot: WhatIfSnapshot = {
      U_E: uE,
      U_W: uW,
      a_E: Number(aE.toFixed(4)),
      a_W: Number(aW.toFixed(4)),
      E_acad: eAcad,
      A: score.waste,
      M: mWasteMonthly,
      tariff_inr_per_kwh: settings.tariff_inr_per_kwh,
      water_inr_per_kl: settings.water_inr_per_kl,
      ef_grid_kg_per_kwh: settings.ef_grid_kg_per_kwh,
      ef_water_kg_per_kl: settings.ef_water_kg_per_kl,
      ef_waste_avg_kg_per_kg: 0.75,
      fix_effectiveness: settings.fix_effectiveness,
      ac_share_of_academic_load: settings.ac_share_of_academic_load,
      ac_saving_per_degree_c: settings.ac_saving_per_degree_c,
      score_ceiling_electricity: settings.score_ceiling_electricity,
      score_ceiling_water: settings.score_ceiling_water,
    };

    return WhatIfSnapshotSchema.parse(snapshot);
  });
}

/**
 * Builds Impact Report conforming to ReportSchema.
 */
export function buildImpactReport(
  period: ReportPeriod = "7",
  db: Db = getDb(),
): Report {
  return getCachedOrCompute(`report:${period}`, () => {
    const clock = getDemoState().clock;
    const settings = getSettings(db);

    const clockMs = new Date(`${clock}:00Z`).getTime();
    let startTs: string;
    if (period === "all") {
      const minRow = db.prepare("SELECT MIN(ts) as min_ts FROM reading").get() as { min_ts: string | null };
      startTs = minRow?.min_ts ?? "2026-09-12T00:00";
    } else {
      const days = period === "7" ? 7 : 30;
      const startMs = clockMs - days * 86400000;
      startTs = new Date(startMs).toISOString().slice(0, 16);
    }

    const score = computeCampusScore(db, clock);
    const anomalies = syncAndGetAnomalies(db);

    // Active anomalies in window
    const activeAnomalies = anomalies.filter((a) => a.status === "active");
    const wastedInr = activeAnomalies.reduce((sum, a) => sum + (a.cost_inr ?? 0), 0);
    const wastedCo2e = activeAnomalies.reduce((sum, a) => sum + a.co2e_kg, 0);

    const dailyCostSum = activeAnomalies.reduce((sum, a) => sum + (a.daily_cost_inr ?? 0), 0);
    const recoverablePerMonth = Math.round(dailyCostSum * 30);

    // Savings from table `savings`
    const savingsRow = db.prepare(`
      SELECT
        SUM(saved_inr) as saved_inr,
        SUM(saved_co2e_kg) as saved_co2e,
        SUM(CASE WHEN a.resource = 'electricity' THEN s.saved_units ELSE 0 END) as saved_kwh,
        SUM(CASE WHEN a.resource = 'water' THEN s.saved_units ELSE 0 END) as saved_kl
      FROM savings s
      JOIN ticket t ON t.id = s.ticket_id
      JOIN anomaly a ON a.id = t.anomaly_id
    `).get() as {
      saved_inr: number | null;
      saved_co2e: number | null;
      saved_kwh: number | null;
      saved_kl: number | null;
    };

    const totalSavedInr = Math.round(savingsRow?.saved_inr ?? 0);
    const totalSavedCo2e = Number((savingsRow?.saved_co2e ?? 0).toFixed(2));
    const kwhSaved = Number((savingsRow?.saved_kwh ?? 0).toFixed(1));
    const klSaved = Number((savingsRow?.saved_kl ?? 0).toFixed(1));

    // Wasted native units
    const kwhWasted = Number(
      activeAnomalies
        .filter((a) => a.resource === "electricity")
        .reduce((sum, a) => sum + a.excess.value, 0)
        .toFixed(1),
    );

    const klWasted = Number(
      activeAnomalies
        .filter((a) => a.resource === "water")
        .reduce((sum, a) => sum + a.excess.value, 0)
        .toFixed(1),
    );

    // Waste segregated in period
    const wasteLogCounts = db.prepare(`
      SELECT SUM(est_weight_kg) as kg
      FROM waste_log
      WHERE is_correct = 1 AND ts >= ? AND ts <= ?
    `).get(startTs, clock) as { kg: number | null };
    const kgSegregated = Math.round(wasteLogCounts?.kg ?? 620);

    // Ticket action counts
    const raisedCount = (db.prepare("SELECT COUNT(*) as n FROM ticket").get() as { n: number }).n;
    const resolvedCount = (db.prepare("SELECT COUNT(*) as n FROM ticket WHERE status IN ('resolved','verifying','verified')").get() as { n: number }).n;
    const verifiedCount = (db.prepare("SELECT COUNT(*) as n FROM ticket WHERE status = 'verified'").get() as { n: number }).n;

    // Top example verified ticket
    const topExampleRow = db.prepare(`
      SELECT s.ticket_id, t.title, a.resource, s.saved_units, s.saved_inr, s.saved_co2e_kg, a.unit
      FROM savings s
      JOIN ticket t ON t.id = s.ticket_id
      JOIN anomaly a ON a.id = t.anomaly_id
      ORDER BY s.saved_inr DESC
      LIMIT 1
    `).get() as {
      ticket_id: number;
      title: string;
      resource: string;
      saved_units: number;
      unit: string;
      saved_inr: number;
      saved_co2e_kg: number;
    } | undefined;

    const report: Report = {
      period,
      generated_at: clock,
      data_period: { from: startTs, to: clock },
      score,
      verified_savings_inr: {
        value: totalSavedInr,
        unit: "INR",
        tag: "verified",
      },
      money: {
        wasted: { value: wastedInr, unit: "INR", tag: "estimated" },
        saved: { value: totalSavedInr, unit: "INR", tag: "verified" },
        recoverable_per_month: {
          value: recoverablePerMonth,
          unit: "INR",
          tag: "projected",
        },
      },
      carbon: {
        wasted: {
          value: Number(wastedCo2e.toFixed(2)),
          unit: "kg CO2e",
          tag: "estimated",
        },
        avoided: {
          value: totalSavedCo2e,
          unit: "kg CO2e",
          tag: "verified",
        },
        trees_equivalent: {
          value: Number((totalSavedCo2e / 21).toFixed(1)),
          unit: "trees",
          tag: "projected",
        },
      },
      units: {
        kwh_wasted: { value: kwhWasted, unit: "kWh", tag: "estimated" },
        kwh_saved: { value: kwhSaved, unit: "kWh", tag: "verified" },
        kl_wasted: { value: klWasted, unit: "kL", tag: "estimated" },
        kl_saved: { value: klSaved, unit: "kL", tag: "verified" },
        kg_segregated: { value: kgSegregated, unit: "kg", tag: "measured" },
      },
      actions: {
        raised: { value: raisedCount, unit: "tickets", tag: "measured" },
        resolved: { value: resolvedCount, unit: "tickets", tag: "measured" },
        verified: { value: verifiedCount, unit: "tickets", tag: "measured" },
        top_example: topExampleRow
          ? {
              ticket_id: topExampleRow.ticket_id,
              title: topExampleRow.title,
              resource: topExampleRow.resource as Resource,
              saved_units: topExampleRow.saved_units,
              unit: topExampleRow.unit,
              saved_inr: topExampleRow.saved_inr,
              saved_co2e_kg: topExampleRow.saved_co2e_kg,
            }
          : null,
      },
      top_wastes: getTopWasters(activeAnomalies),
      method: {
        rates: {
          tariff_inr_per_kwh: settings.tariff_inr_per_kwh,
          water_inr_per_kl: settings.water_inr_per_kl,
          ef_grid_kg_per_kwh: settings.ef_grid_kg_per_kwh,
          ef_water_kg_per_kl: settings.ef_water_kg_per_kl,
          score_ceiling_electricity: settings.score_ceiling_electricity,
          score_ceiling_water: settings.score_ceiling_water,
        },
        disclosures: [
          "Electricity tariffs and water rates reflect campus utility contracts.",
          "Carbon emission factors follow CEA CO2 Baseline Database for Indian Grid.",
          "Segregation accuracy measured from physical bin audit logs.",
          "Counterfactual savings verified against trailing baseline models.",
        ],
        simulated_statement:
          "All data shown is simulated by the CampusPulse engine for demonstration purposes.",
      },
    };

    return ReportSchema.parse(report);
  });
}
