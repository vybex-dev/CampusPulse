/**
 * Waste analytics and anomaly detection for CampusPulse.
 *
 * Rules and metrics:
 * - Block accuracy: (correct bin checks / all checks, trailing 7 days).
 * - Pooled campus accuracy: (total correct / total checks, trailing 7 days).
 * - Peer accuracy: median of the other blocks.
 * - Insufficient data: fewer than 10 checks marks block accuracy as insufficient data.
 * - Rule WS1: flags a block below 60% with at least 20 checks.
 * - Commonest mistake: most frequent (category, bin chosen) pair among wrong checks.
 * - Misrouted mass: (peer - block accuracy) * weekly bin mass (Tagged: Estimated).
 * - Ticket verification: verifies after at least 20 post-fix checks at 60% or more.
 * - Points: identify scan = 5 pts; correct bin check = category points; wrong = 0 pts.
 * - Leaderboard: ranked by accuracy (descending), then points (descending).
 */
import {
  type BlockCode,
  BLOCK_CODES,
  BLOCK_NAMES,
  type Bin,
  type WasteCategory,
  type WasteMode,
  type Settings,
} from "../contract";
import { DEFAULT_SETTINGS } from "../settings";
import { median } from "../stats";
import { CATEGORY_TABLE } from "../ai/classify";
import type { Detector, DetectorContext, DetectorLocation, AnomalyDraft } from "./anomalies";

export interface WasteCheckRecord {
  id?: number;
  ts: string;
  block_id: BlockCode;
  mode: WasteMode;
  category: WasteCategory;
  item_name?: string;
  is_correct: boolean | number | null;
  chosen_bin: Bin | null;
  correct_bin?: Bin | null;
  points?: number;
}

export interface BlockAccuracyResult {
  block_code: BlockCode;
  total_checks: number;
  correct_checks: number;
  accuracy: number | null; // 0..1 or null if insufficient data
  accuracy_pct: number | null; // 0..100 or null if insufficient data
  insufficient_data: boolean;
}

export interface CommonestMistake {
  category: WasteCategory;
  chosen_bin: Bin;
  count: number;
}

export interface LeaderboardEntry {
  rank: number;
  block_code: BlockCode;
  block_name: string;
  accuracy_pct: number | null;
  total_checks: number;
  points: number;
  insufficient_data: boolean;
}

export interface WasteDetectorContext {
  wasteLogs: WasteCheckRecord[];
  locations: DetectorLocation[];
  clock: string; // ISO string e.g. "2026-10-12T00:00"
  settings?: Settings;
  weeklyBinMassByBlock?: Record<string, number>;
}

/** Default weekly bin mass (kg) from campus config if not supplied in context. */
export const DEFAULT_WEEKLY_BIN_MASS: Record<BlockCode, number> = {
  "AB-A": 160,
  "AB-B": 170,
  LIB: 140,
  "HST-1": 210,
  "HST-2": 210,
  MESS: 190,
};

/**
 * Filter checks within trailing 7 days of the simulated clock.
 */
export function filterTrailing7Days(
  logs: WasteCheckRecord[],
  clock: string,
): WasteCheckRecord[] {
  const clockMs = new Date(`${clock}:00Z`).getTime();
  const startMs = clockMs - 7 * 86400000;

  return logs.filter((log) => {
    const logMs = new Date(`${log.ts.slice(0, 16)}:00Z`).getTime();
    return logMs >= startMs && logMs <= clockMs;
  });
}

/**
 * Calculates block accuracy over bin checks.
 * Returns insufficient_data = true if total bin checks < 10.
 */
export function computeBlockAccuracy(
  checks: WasteCheckRecord[],
  minChecks = 10,
): {
  total: number;
  correct: number;
  accuracy: number | null;
  insufficient_data: boolean;
} {
  const binChecks = checks.filter((c) => c.mode === "bin_check" && c.is_correct !== null);
  const total = binChecks.length;

  if (total < minChecks) {
    return {
      total,
      correct: binChecks.filter((c) => c.is_correct === 1 || c.is_correct === true).length,
      accuracy: null,
      insufficient_data: true,
    };
  }

  const correct = binChecks.filter((c) => c.is_correct === 1 || c.is_correct === true).length;
  const accuracy = correct / total;

  return {
    total,
    correct,
    accuracy,
    insufficient_data: false,
  };
}

/**
 * Computes pooled campus accuracy over all trailing bin checks.
 */
export function computePooledCampusAccuracy(
  checks: WasteCheckRecord[],
): {
  total: number;
  correct: number;
  accuracy: number;
} {
  const binChecks = checks.filter((c) => c.mode === "bin_check" && c.is_correct !== null);
  const total = binChecks.length;
  if (total === 0) {
    return { total: 0, correct: 0, accuracy: 0.72 }; // fallback default 72%
  }
  const correct = binChecks.filter((c) => c.is_correct === 1 || c.is_correct === true).length;
  return {
    total,
    correct,
    accuracy: correct / total,
  };
}

/**
 * Computes peer accuracy as the median accuracy of the other blocks.
 */
export function computePeerAccuracy(
  blockCode: BlockCode,
  accuracies: Record<string, number | null>,
  defaultFallback = 0.78,
): number {
  const otherAccuracies: number[] = [];

  for (const code of BLOCK_CODES) {
    if (code !== blockCode) {
      const acc = accuracies[code];
      if (typeof acc === "number" && !isNaN(acc)) {
        otherAccuracies.push(acc);
      }
    }
  }

  if (otherAccuracies.length === 0) {
    return defaultFallback;
  }

  return median(otherAccuracies);
}

/**
 * Finds the most frequent (category, bin chosen) pair among wrong checks.
 */
export function findCommonestMistake(
  wrongChecks: WasteCheckRecord[],
): CommonestMistake | null {
  if (wrongChecks.length === 0) return null;

  const counts = new Map<string, { category: WasteCategory; chosen_bin: Bin; count: number }>();

  for (const c of wrongChecks) {
    if (!c.chosen_bin) continue;
    const key = `${c.category}::${c.chosen_bin}`;
    const entry = counts.get(key) ?? {
      category: c.category,
      chosen_bin: c.chosen_bin,
      count: 0,
    };
    entry.count++;
    counts.set(key, entry);
  }

  let best: CommonestMistake | null = null;
  for (const entry of counts.values()) {
    if (!best || entry.count > best.count) {
      best = entry;
    }
  }

  return best;
}

/**
 * Computes misrouted mass: (peer - block accuracy) * weekly bin mass (Estimated).
 */
export function computeMisroutedMass(
  blockAccuracy: number,
  peerAccuracy: number,
  weeklyBinMassKg: number,
): number {
  const delta = Math.max(0, peerAccuracy - blockAccuracy);
  return Number((delta * weeklyBinMassKg).toFixed(1));
}

/**
 * Calculates scan points:
 * - Identify scan = 5 points
 * - Correct bin check = category points from settings/table
 * - Incorrect bin check = 0 points
 */
export function computeScanPoints(
  mode: WasteMode,
  isCorrect: boolean | null,
  category: WasteCategory,
  settings: Settings = DEFAULT_SETTINGS,
): number {
  if (mode === "identify") {
    return 5;
  }
  if (isCorrect === true) {
    return (
      settings.waste_categories?.[category]?.points ??
      CATEGORY_TABLE[category]?.points ??
      10
    );
  }
  return 0;
}

/**
 * Checks if a waste ticket can be verified after fix:
 * "ticket verifies after at least 20 post-fix checks at 60% or more"
 */
export function canVerifyWasteTicket(
  postFixChecks: WasteCheckRecord[],
  minChecks = 20,
  minAccuracy = 0.6,
): boolean {
  const binChecks = postFixChecks.filter((c) => c.mode === "bin_check" && c.is_correct !== null);
  if (binChecks.length < minChecks) return false;

  const correct = binChecks.filter((c) => c.is_correct === 1 || c.is_correct === true).length;
  const accuracy = correct / binChecks.length;
  return accuracy >= minAccuracy;
}

/**
 * Builds block leaderboard ranked by accuracy (descending), then points (descending).
 */
export function computeLeaderboard(
  logs: WasteCheckRecord[],
  settings: Settings = DEFAULT_SETTINGS,
): LeaderboardEntry[] {
  const entries: Array<{
    block_code: BlockCode;
    block_name: string;
    accuracy_pct: number | null;
    total_checks: number;
    points: number;
    insufficient_data: boolean;
  }> = [];

  for (const code of BLOCK_CODES) {
    const blockLogs = logs.filter((l) => l.block_id === code);
    const acc = computeBlockAccuracy(blockLogs, settings.thresholds.waste_min_checks_score);

    // Sum points across all checks (identify + bin checks) in logs
    let totalPoints = 0;
    for (const l of blockLogs) {
      if (typeof l.points === "number") {
        totalPoints += l.points;
      } else {
        totalPoints += computeScanPoints(
          l.mode,
          l.is_correct === 1 || l.is_correct === true,
          l.category,
          settings,
        );
      }
    }

    entries.push({
      block_code: code,
      block_name: BLOCK_NAMES[code],
      accuracy_pct: acc.accuracy !== null ? Math.round(acc.accuracy * 100) : null,
      total_checks: acc.total,
      points: totalPoints,
      insufficient_data: acc.insufficient_data,
    });
  }

  // Sort by accuracy descending (sufficient data first), tiebreak by points descending
  entries.sort((a, b) => {
    if (a.insufficient_data && !b.insufficient_data) return 1;
    if (!a.insufficient_data && b.insufficient_data) return -1;
    if (a.accuracy_pct !== null && b.accuracy_pct !== null && a.accuracy_pct !== b.accuracy_pct) {
      return b.accuracy_pct - a.accuracy_pct;
    }
    return b.points - a.points;
  });

  return entries.map((e, idx) => ({
    rank: idx + 1,
    ...e,
  }));
}

/**
 * Rule WS1: flags a block below 60% with at least 20 checks.
 * Generates an AnomalyDraft for each flagged block.
 */
export function detectWasteAnomalies(ctx: WasteDetectorContext): AnomalyDraft[] {
  const settings = ctx.settings ?? DEFAULT_SETTINGS;
  const trailingLogs = filterTrailing7Days(ctx.wasteLogs, ctx.clock);
  const drafts: AnomalyDraft[] = [];

  // Precompute accuracies for all blocks to establish peer medians
  const blockAccuracies: Record<string, number | null> = {};
  for (const code of BLOCK_CODES) {
    const blockLogs = trailingLogs.filter((l) => l.block_id === code);
    const accRes = computeBlockAccuracy(blockLogs, settings.thresholds.waste_min_checks_score);
    blockAccuracies[code] = accRes.accuracy;
  }

  const clockMs = new Date(`${ctx.clock}:00Z`).getTime();
  const startTs = new Date(clockMs - 7 * 86400000).toISOString().slice(0, 16);
  const endTs = ctx.clock;

  for (const blockCode of BLOCK_CODES) {
    const blockLogs = trailingLogs.filter((l) => l.block_id === blockCode);
    const binChecks = blockLogs.filter((l) => l.mode === "bin_check" && l.is_correct !== null);
    const totalChecks = binChecks.length;

    // Check thresholds: at least 20 checks, accuracy below 60%
    if (totalChecks < settings.thresholds.waste_min_checks_flag) {
      continue;
    }

    const correctCount = binChecks.filter(
      (c) => c.is_correct === 1 || c.is_correct === true,
    ).length;
    const accuracy = correctCount / totalChecks;

    if (accuracy >= settings.thresholds.waste_flag_accuracy) {
      continue;
    }

    // Flagged by Rule WS1!
    const peerAccuracy = computePeerAccuracy(blockCode, blockAccuracies);
    const weeklyBinMass =
      ctx.weeklyBinMassByBlock?.[blockCode] ??
      DEFAULT_WEEKLY_BIN_MASS[blockCode] ??
      190;

    const misroutedKg = computeMisroutedMass(accuracy, peerAccuracy, weeklyBinMass);

    const wrongChecks = binChecks.filter(
      (c) => c.is_correct === 0 || c.is_correct === false,
    );
    const commonestMistake = findCommonestMistake(wrongChecks);

    // Find block location ID
    const loc = ctx.locations.find((l) => l.code === blockCode);
    const locationId = loc ? loc.id : 1;
    const blockName = loc ? loc.name : BLOCK_NAMES[blockCode];

    // Priority: high if below 50% (thresholds.waste_high_below_accuracy: 0.5), else medium
    const priority = accuracy < settings.thresholds.waste_high_below_accuracy ? "high" : "medium";

    // Carbon estimation based on misrouted biodegradable/general waste (avg 0.5 - 0.75 kg CO2e / kg)
    const co2eFactor =
      commonestMistake && CATEGORY_TABLE[commonestMistake.category]?.ef_kg_per_kg > 0
        ? CATEGORY_TABLE[commonestMistake.category].ef_kg_per_kg
        : 0.5;
    const co2eKg = Number((misroutedKg * co2eFactor).toFixed(2));

    const mistakeDesc = commonestMistake
      ? `${commonestMistake.category.replace(/_/g, " ")} placed in ${commonestMistake.chosen_bin} bin`
      : "cross-bin contamination";

    const explanation = `${blockName} segregation accuracy is ${Math.round(
      accuracy * 100,
    )}% (peer target ${Math.round(peerAccuracy * 100)}%) across ${totalChecks} checks, misrouting ~${Math.round(
      misroutedKg,
    )} kg/week. Commonest mistake: ${mistakeDesc}.`;

    const evidenceJson = JSON.stringify({
      rule: "WS1",
      block: blockCode,
      total_checks: totalChecks,
      wrong_checks: wrongChecks.length,
      accuracy_pct: Math.round(accuracy * 100),
      peer_accuracy_pct: Math.round(peerAccuracy * 100),
      weekly_bin_mass_kg: weeklyBinMass,
      misrouted_kg_per_week: misroutedKg,
      commonest_mistake: commonestMistake,
    });

    drafts.push({
      type: "waste_bad_segregation",
      resource: "waste",
      location_id: locationId,
      meter_id: null,
      start_ts: startTs,
      end_ts: endTs,
      status: "active",
      priority,
      confidence: "high",
      occurrences: wrongChecks.length,
      excess_value: misroutedKg,
      unit: "kg",
      cost_inr: null, // Waste anomalies carry no rupee value
      daily_cost_inr: null,
      co2e_kg: co2eKg,
      explanation,
      evidence_json: evidenceJson,
    });
  }

  return drafts;
}

export const wasteAnomalyDetector: Detector = {
  id: "WS1",
  resource: "waste",
  run(ctx: DetectorContext): AnomalyDraft[] {
    if (!ctx.wasteLogs || ctx.wasteLogs.length === 0) return [];
    return detectWasteAnomalies({
      wasteLogs: ctx.wasteLogs as WasteCheckRecord[],
      locations: ctx.locations,
      clock: ctx.clock,
      settings: ctx.settings,
    });
  },
};

