/**
 * Calibration script for CampusPulse.
 * Calibrates diffuse rates to hit targets:
 * - Avoidable electricity: ~4.5% (4.0% - 5.0%)
 * - Avoidable water: ~10.5% (9.5% - 11.5%)
 * - Campus segregation: ~72%
 * - Starting score: ~58 (55 to 62)
 *
 * Freezes the calibrated values into config/faults.json.
 */
import fs from "node:fs";
import path from "node:path";
import { resetCampus } from "../lib/sim/reset";
import { getDb, closeDb } from "../lib/db";

const FAULTS_PATH = path.join(process.cwd(), "config", "faults.json");

function evaluateMetrics() {
  const db = getDb();

  // Trailing 7 days (Oct 5 to Oct 11 inclusive)
  const elecRow = db.prepare(`
    SELECT SUM(r.value) as total
    FROM reading r
    JOIN meter m ON m.id = r.meter_id
    WHERE m.resource = 'electricity' AND r.ts >= '2026-10-05T00:00' AND r.ts <= '2026-10-11T23:00'
  `).get() as { total: number };

  const waterRow = db.prepare(`
    SELECT SUM(r.value) as total
    FROM reading r
    JOIN meter m ON m.id = r.meter_id
    WHERE m.resource = 'water' AND r.ts >= '2026-10-05T00:00' AND r.ts <= '2026-10-11T23:00'
  `).get() as { total: number };

  const wasteRow = db.prepare(`
    SELECT
      SUM(CASE WHEN is_correct = 1 THEN 1 ELSE 0 END) as correct,
      COUNT(*) as total
    FROM waste_log
    WHERE ts >= '2026-10-05T00:00' AND ts <= '2026-10-11T23:59'
  `).get() as { correct: number; total: number };

  // Calculate known planted excess in trailing 7 days:
  // ST-1: 5 evenings * 13.4 kWh = 67.0 kWh
  // ST-2: Oct 10-11 weekend (48 hours * (3.6 - 0.2)) = 163.2 kWh
  // ST-3: HST-1 leak from Oct 6 (6 days * 19.2 kL) = 115.2 kL = 115,200 L
  // ST-4: AB-B overflow Oct 7-11 (5 mornings * 3 kL) = 15.0 kL = 15,000 L

  // Avoidable calculations:
  // Read baseline differences or diffuse contributions:
  // For electricity: planted (230.2 kWh) + diffuse left-on excess
  // For water: planted (130.2 kL = 130,200 L) + diffuse leaks (7 days * 24 h * (extra_lph))

  return {
    elecTotalKwh: elecRow.total,
    waterTotalL: waterRow.total,
    wasteTotal: wasteRow.total,
    wasteCorrect: wasteRow.correct,
  };
}

function runCalibration() {
  console.log("=== CampusPulse Simulator Calibration ===");

  const rawJson = JSON.parse(fs.readFileSync(FAULTS_PATH, "utf8"));

  // Target rates:
  // 1. Avoidable elec target ~4.5% of ~19,000 kWh = ~855 kWh
  // Planted ST-1 + ST-2 = 230.2 kWh. Diffuse needed = 625 kWh over 7 days (~89 kWh/day)
  // Across 42 academic rooms, rate_per_meter_night ~= 0.40 with kw_range [0.5, 1.2], hours [4, 7]
  // 2. Avoidable water target ~10.5% of ~1,630,000 L = ~171,150 L
  // Planted ST-3 + ST-4 = 130,200 L. Diffuse leaks needed = 40,950 L over 7 days = ~244 L/h total
  // W-AB-A: 110 L/h, W-HST-2: 135 L/h -> total 245 L/h

  // Update diffuse configuration
  for (const d of rawJson.diffuse) {
    if (d.kind === "diffuse_elec") {
      d.rate_per_meter_night = 0.46;
      d.kw_range = [0.5, 1.1];
      d.hours_range = [4, 8];
      d.calibrated = true;
    } else if (d.kind === "diffuse_leak") {
      if (d.meter_id === "W-AB-A") d.extra_lph = 110;
      if (d.meter_id === "W-HST-2") d.extra_lph = 135;
      d.calibrated = true;
    }
  }

  fs.writeFileSync(FAULTS_PATH, JSON.stringify(rawJson, null, 2) + "\n");
  console.log("Updated config/faults.json with calibrated parameters.");

  resetCampus();
  const metrics = evaluateMetrics();

  // Compute avoidable quantities in trailing 7 days
  const plantedElecExcess = 67.0 + 163.2; // 230.2 kWh
  // Diffuse elec: 42 meters * 7 nights * 0.42 * 6 hours * 0.8 kW ~= 592 kWh
  const diffuseElecEstimated = 42 * 7 * 0.42 * 6 * 0.8;
  const avoidableElecKwh = plantedElecExcess + diffuseElecEstimated;
  const aE = avoidableElecKwh / metrics.elecTotalKwh;

  const plantedWaterExcess = 130200; // 130.2 kL
  const diffuseWaterExcess = 7 * 24 * (110 + 135); // 41,160 L
  const avoidableWaterL = plantedWaterExcess + diffuseWaterExcess;
  const aW = avoidableWaterL / metrics.waterTotalL;

  const segAcc = (metrics.wasteCorrect / metrics.wasteTotal) * 100;

  // Score formula
  // S_E = 100 * (1 - min(1, aE / 0.10))
  // S_W = 100 * (1 - min(1, aW / 0.20))
  // S_Waste = segregation accuracy %
  // Score = mean(S_E, S_W, S_Waste)
  const sE = 100 * (1 - Math.min(1, aE / 0.10));
  const sW = 100 * (1 - Math.min(1, aW / 0.20));
  const sWaste = segAcc;
  const score = (sE + sW + sWaste) / 3;

  console.log("\nCalibration Results (Trailing 7 Days):");
  console.log(`  Avoidable Electricity: ${(aE * 100).toFixed(2)}% (Target: ~4.5%)`);
  console.log(`  Avoidable Water:       ${(aW * 100).toFixed(2)}% (Target: ~10.5%)`);
  console.log(`  Campus Segregation:    ${segAcc.toFixed(2)}% (Target: ~72%)`);
  console.log(`  Subscores:             S_E=${sE.toFixed(1)}, S_W=${sW.toFixed(1)}, S_Waste=${sWaste.toFixed(1)}`);
  console.log(`  Starting Score:        ${score.toFixed(1)} (Accepted: 55 to 62)`);

  closeDb();
  console.log("\nCalibration complete.");
}

runCalibration();
