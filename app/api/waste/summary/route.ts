import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getDemoState } from "@/lib/sim/clock";
import { getSettings } from "@/lib/settings";
import {
  computeBlockAccuracy,
  computePooledCampusAccuracy,
  computePeerAccuracy,
  computeMisroutedMass,
  findCommonestMistake,
  computeLeaderboard,
  DEFAULT_WEEKLY_BIN_MASS,
  type WasteCheckRecord,
} from "@/lib/analytics/waste";
import { BLOCK_CODES, BLOCK_NAMES } from "@/lib/contract";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const db = getDb();
  const settings = getSettings(db);
  const clock = getDemoState().clock;

  const clockMs = new Date(`${clock}:00Z`).getTime();
  const startMs = clockMs - 7 * 86400000;
  const startTs = new Date(startMs).toISOString().slice(0, 16);

  // Query trailing 7-day logs from SQLite
  const rows = db
    .prepare(
      `SELECT id, ts, block_id, mode, category, item_name, is_correct, chosen_bin, correct_bin, points
       FROM waste_log
       WHERE ts >= ? AND ts <= ?
       ORDER BY ts DESC`,
    )
    .all(startTs, clock) as WasteCheckRecord[];

  // 1. Accuracies per block
  const blockAccuracies: Record<string, number | null> = {};
  const blockReports: Record<string, unknown> = {};

  for (const code of BLOCK_CODES) {
    const blockLogs = rows.filter((r) => r.block_id === code);
    const acc = computeBlockAccuracy(blockLogs, settings.thresholds.waste_min_checks_score);
    blockAccuracies[code] = acc.accuracy;
  }

  // 2. Peer accuracies, commonest mistakes, misrouted mass
  for (const code of BLOCK_CODES) {
    const blockLogs = rows.filter((r) => r.block_id === code);
    const acc = computeBlockAccuracy(blockLogs, settings.thresholds.waste_min_checks_score);
    const peerAccuracy = computePeerAccuracy(code, blockAccuracies);
    const weeklyMass = DEFAULT_WEEKLY_BIN_MASS[code] ?? 180;
    const misroutedKg =
      acc.accuracy !== null ? computeMisroutedMass(acc.accuracy, peerAccuracy, weeklyMass) : 0;

    const wrongLogs = blockLogs.filter(
      (r) => r.mode === "bin_check" && (r.is_correct === 0 || r.is_correct === false),
    );
    const commonMistake = findCommonestMistake(wrongLogs);

    blockReports[code] = {
      code,
      name: BLOCK_NAMES[code],
      accuracy: acc.accuracy,
      accuracy_pct: acc.accuracy !== null ? Math.round(acc.accuracy * 100) : null,
      peer_accuracy: peerAccuracy,
      peer_accuracy_pct: Math.round(peerAccuracy * 100),
      total_checks: acc.total,
      correct_checks: acc.correct,
      insufficient_data: acc.insufficient_data,
      misrouted_kg_estimated: misroutedKg,
      commonest_mistake: commonMistake,
    };
  }

  // 3. Pooled campus accuracy
  const campus = computePooledCampusAccuracy(rows);

  // 4. Leaderboard
  const leaderboard = computeLeaderboard(rows, settings);

  // 5. Total counts
  const totalScans = rows.length;
  const binChecks = rows.filter((r) => r.mode === "bin_check").length;
  const identifyScans = rows.filter((r) => r.mode === "identify").length;

  return NextResponse.json({
    clock,
    data_period: { from: startTs, to: clock },
    campus_accuracy: campus.accuracy,
    campus_accuracy_pct: Math.round(campus.accuracy * 100),
    total_scans: totalScans,
    bin_checks: binChecks,
    identify_scans: identifyScans,
    blocks: blockReports,
    leaderboard,
  });
}
