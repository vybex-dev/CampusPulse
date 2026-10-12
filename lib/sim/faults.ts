/**
 * Fault application logic for deterministic simulation in CampusPulse.
 * Implements fault kinds:
 * - elec_hold (ST-1, ST-2)
 * - elec_afterhours_excess (ST-6)
 * - water_const_leak (ST-3)
 * - water_tank_overflow (ST-4)
 * - waste_bad_segregation (ST-5)
 * - diffuse (diffuse_elec, diffuse_leak)
 */
import type { FaultSpec, DiffuseSpec } from "../config";

export interface ActiveFaultContext {
  faults: FaultSpec[];
  diffuse: DiffuseSpec[];
}

/**
 * Check if a fault is active at timestamp `ts` (ISO YYYY-MM-DDTHH:MM).
 */
export function isFaultActive(
  fault: { start_ts: string; active: boolean | number; fixed_at: string | null },
  ts: string,
): boolean {
  if (!fault.active) return false;
  if (ts < fault.start_ts) return false;
  if (fault.fixed_at !== null && ts >= fault.fixed_at) return false;
  return true;
}

/**
 * Modifies an electricity reading if any electric faults apply at `(meterId, dateStr, hour, ts)`.
 * Returns the modified kW or null if no fault applies.
 */
export function applyElectricityFaults(
  meterId: string,
  dateStr: string,
  hour: number,
  ts: string,
  baseKw: number,
  script: ActiveFaultContext,
): number {
  let kw = baseKw;

  for (const f of script.faults) {
    if (!isFaultActive(f, ts)) continue;

    if (f.kind === "elec_hold") {
      if (f.meter_id === meterId) {
        if (f.params.dates.includes(dateStr) && f.params.hours.includes(hour)) {
          // elec_hold sets the target level directly
          kw = f.params.level_kw;
        }
      }
    } else if (f.kind === "elec_afterhours_excess") {
      if (f.params.meter_ids.includes(meterId) && f.params.hours.includes(hour)) {
        const extraPerMeter = f.params.extra_kw_total / f.params.meter_ids.length;
        kw += extraPerMeter;
      }
    }
  }

  return kw;
}

/**
 * Modifies water flow in L/h at `(meterId, dateStr, hour, ts)`.
 */
export function applyWaterFaults(
  meterId: string,
  dateStr: string,
  hour: number,
  ts: string,
  baseFlowLph: number,
  script: ActiveFaultContext,
): number {
  let flow = baseFlowLph;

  for (const f of script.faults) {
    if (!isFaultActive(f, ts)) continue;

    if (f.kind === "water_const_leak") {
      if (f.meter_id === meterId) {
        flow += f.params.extra_lph;
      }
    } else if (f.kind === "water_tank_overflow") {
      if (f.params.inflow_meter_id === meterId) {
        if (f.params.dates.includes(dateStr) && f.params.hours.includes(hour)) {
          flow += f.params.extra_lph;
        }
      }
    }
  }

  // Diffuse leaks
  for (const d of script.diffuse) {
    if (d.kind === "diffuse_leak" && d.meter_id === meterId) {
      if (ts >= d.start_ts) {
        flow += d.extra_lph;
      }
    }
  }

  return flow;
}

/**
 * Modifies tank level in percent (0 to 100) at `(meterId, dateStr, hour, ts)`.
 */
export function applyTankFaults(
  meterId: string,
  dateStr: string,
  hour: number,
  ts: string,
  baseLevelPct: number,
  script: ActiveFaultContext,
): number {
  let level = baseLevelPct;

  for (const f of script.faults) {
    if (!isFaultActive(f, ts)) continue;

    if (f.kind === "water_tank_overflow") {
      if (f.meter_id === meterId) {
        if (f.params.dates.includes(dateStr) && f.params.hours.includes(hour)) {
          // Tank overflows, level sits at 100%
          level = 100.0;
        }
      }
    }
  }

  return Math.min(100.0, Math.max(0.0, level));
}

/**
 * Gets the segregation accuracy probability and commonest mistake for a block at `ts`.
 */
export function getWasteFaultContext(
  blockCode: string,
  ts: string,
  defaultP: number,
  script: ActiveFaultContext,
): {
  pCorrect: number;
  forcedMistake?: { category: string; chosenBin: string };
} {
  for (const f of script.faults) {
    if (f.kind === "waste_bad_segregation" && f.params.block === blockCode) {
      if (isFaultActive(f, ts) && ts <= f.params.end_ts) {
        return {
          pCorrect: f.params.p_correct,
          forcedMistake: {
            category: f.params.commonest_mistake.category,
            chosenBin: f.params.commonest_mistake.chosen_bin,
          },
        };
      }
    }
  }

  return { pCorrect: defaultP };
}
