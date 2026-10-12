/**
 * Shared anomaly detection framework and detector interface for CampusPulse.
 * Handles merging events on the same meter and rule within 14 days,
 * computing cost, daily cost, CO2e, active status, priority, confidence,
 * and generating plain-English explanations with evidence JSON.
 */
import type {
  AnomalyType,
  Resource,
  Priority,
  ConfidenceLabel,
  AnomalyStatus,
  Settings,
} from "../contract";
import { DEFAULT_SETTINGS } from "../settings";

export interface DetectorReading {
  meter_id: string;
  ts: string;
  value: number;
}

export interface DetectorMeter {
  id: string;
  location_id: number;
  resource: string;
  unit: string;
}

export interface DetectorLocation {
  id: number;
  parent_id: number | null;
  kind: string;
  code: string;
  name: string;
  room_type: string | null;
  population: number | null;
}

export interface TimetableSlotItem {
  location_id: number;
  weekday: number;
  hour: number;
  scheduled: number;
  label?: string | null;
}

export interface DetectorContext {
  readings: DetectorReading[];
  meters: DetectorMeter[];
  locations: DetectorLocation[];
  timetable: TimetableSlotItem[] | Map<string, boolean[]>;
  clock: string; // ISO 8601 simulated time e.g. "2026-10-12T00:00"
  settings?: Settings;
}

export interface AnomalyDraft {
  type: AnomalyType;
  resource: Resource;
  location_id: number;
  meter_id: string | null;
  start_ts: string;
  end_ts: string;
  status: AnomalyStatus;
  priority: Priority;
  confidence: ConfidenceLabel;
  occurrences: number;
  excess_value: number;
  unit: "kWh" | "kL" | "kg";
  cost_inr: number | null;
  daily_cost_inr: number | null;
  co2e_kg: number;
  explanation: string;
  evidence_json: string;
}

export interface RawEvent {
  type: AnomalyType;
  resource: Resource;
  location_id: number;
  meter_id: string | null;
  start_ts: string;
  end_ts: string;
  excess_value: number;
  unit: "kWh" | "kL" | "kg";
  flagged_hours?: { ts: string; value: number; baseline: number }[];
  evidence_data?: Record<string, unknown>;
  confidence?: ConfidenceLabel;
  custom_explanation?: string;
}

export interface Detector {
  id: string;
  resource: Resource;
  run(ctx: DetectorContext): AnomalyDraft[];
}

/**
 * Calculates priority based on daily cost in INR.
 * High: >= Rs 250/day
 * Medium: >= Rs 50/day
 * Low: < Rs 50/day
 */
export function computePriority(
  dailyCostInr: number | null,
  settings: Settings = DEFAULT_SETTINGS,
): Priority {
  if (dailyCostInr === null) return "medium";
  if (dailyCostInr >= settings.priority_high_inr_per_day) return "high";
  if (dailyCostInr >= settings.priority_medium_inr_per_day) return "medium";
  return "low";
}

/**
 * Parses simulated ISO timestamp into milliseconds.
 */
function parseTs(ts: string): number {
  return new Date(`${ts}:00Z`).getTime();
}

/**
 * Merges raw events on the same meter and rule within a merge window (default 14 days),
 * evaluates active status within active window (default 48 hours of clock),
 * and computes financial and carbon figures.
 */
export function mergeAndBuildAnomalies(
  events: RawEvent[],
  ctx: DetectorContext,
): AnomalyDraft[] {
  if (events.length === 0) return [];

  const settings = ctx.settings ?? DEFAULT_SETTINGS;
  const clockMs = parseTs(ctx.clock);
  const mergeWindowMs = settings.thresholds.merge_window_days * 86400000;
  const activeWindowMs = settings.thresholds.active_window_hours * 3600000;
  const sevenDaysMs = 7 * 86400000;

  // Group events by meter_id + type
  const groups = new Map<string, RawEvent[]>();
  for (const ev of events) {
    const key = `${ev.meter_id ?? "null"}::${ev.type}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(ev);
  }

  const drafts: AnomalyDraft[] = [];

  for (const group of groups.values()) {
    // Sort chronologically by start_ts
    group.sort((a, b) => a.start_ts.localeCompare(b.start_ts));

    // Cluster events within merge window
    const clusters: RawEvent[][] = [];
    let currentCluster: RawEvent[] = [group[0]];

    for (let i = 1; i < group.length; i++) {
      const prev = currentCluster[currentCluster.length - 1];
      const cur = group[i];

      const prevEndMs = parseTs(prev.end_ts);
      const curStartMs = parseTs(cur.start_ts);

      if (curStartMs - prevEndMs <= mergeWindowMs) {
        currentCluster.push(cur);
      } else {
        clusters.push(currentCluster);
        currentCluster = [cur];
      }
    }
    clusters.push(currentCluster);

    // Merge each cluster into a single AnomalyDraft
    for (const cluster of clusters) {
      const first = cluster[0];
      const start_ts = cluster[0].start_ts;
      const end_ts = cluster[cluster.length - 1].end_ts;
      const occurrences = cluster.length;

      let totalExcess = 0;
      let trailing7dExcess = 0;
      const allFlaggedHours: { ts: string; value: number; baseline: number }[] = [];
      const evidenceDetails: Record<string, unknown> = {};

      for (const ev of cluster) {
        totalExcess += ev.excess_value;
        if (ev.flagged_hours) {
          allFlaggedHours.push(...ev.flagged_hours);
        }
        if (ev.evidence_data) {
          Object.assign(evidenceDetails, ev.evidence_data);
        }

        // Compute overlap with trailing 7 days: [clockMs - sevenDaysMs, clockMs]
        const evStartMs = parseTs(ev.start_ts);
        const evEndMs = parseTs(ev.end_ts);
        const windowStartMs = clockMs - sevenDaysMs;
        const windowEndMs = clockMs;

        const overlapStart = Math.max(evStartMs, windowStartMs);
        const overlapEnd = Math.min(evEndMs, windowEndMs);

        if (overlapEnd > overlapStart) {
          const evDuration = Math.max(3600000, evEndMs - evStartMs);
          const overlapFraction = Math.min(1, (overlapEnd - overlapStart) / evDuration);
          trailing7dExcess += ev.excess_value * overlapFraction;
        }
      }

      // Check active status: active if latest flagged hour is within active_window_hours (48 h) of clock
      const latestFlaggedMs = parseTs(end_ts);
      const isActive = clockMs - latestFlaggedMs <= activeWindowMs;
      const status: AnomalyStatus = isActive ? "active" : "cleared";

      // Financial & carbon rates
      let costInr: number | null = null;
      let dailyCostInr: number | null = null;
      let co2eKg = 0;

      if (first.resource === "electricity") {
        costInr = Math.round(totalExcess * settings.tariff_inr_per_kwh);
        dailyCostInr = Number(((trailing7dExcess / 7) * settings.tariff_inr_per_kwh).toFixed(2));
        co2eKg = Number((totalExcess * settings.ef_grid_kg_per_kwh).toFixed(2));
      } else if (first.resource === "water") {
        // Excess is in kL
        costInr = Math.round(totalExcess * settings.water_inr_per_kl);
        // For continuous leak (water_night_leak), daily cost is loss_kl_per_day * rate if provided
        if (first.type === "water_night_leak" && evidenceDetails.loss_kl_per_day) {
          const lossPerDay = evidenceDetails.loss_kl_per_day as number;
          dailyCostInr = Number((lossPerDay * settings.water_inr_per_kl).toFixed(2));
        } else {
          dailyCostInr = Number(((trailing7dExcess / 7) * settings.water_inr_per_kl).toFixed(2));
        }
        co2eKg = Number((totalExcess * settings.ef_water_kg_per_kl).toFixed(2));
      }

      const priority = computePriority(dailyCostInr, settings);

      // Confidence
      let confidence: ConfidenceLabel = first.confidence ?? "medium";
      if (occurrences >= 3 || (dailyCostInr ?? 0) >= 150) {
        confidence = "high";
      }

      // Find location name
      const loc = ctx.locations.find((l) => l.id === first.location_id);
      const locName = loc ? loc.name : `Location ${first.location_id}`;

      // Explanation
      let explanation = first.custom_explanation;
      if (!explanation) {
        if (first.type === "elec_unscheduled_load") {
          explanation = `${locName} drew load outside scheduled timetable across ${occurrences} occurrence${occurrences > 1 ? "s" : ""}, wasting ~${totalExcess.toFixed(1)} kWh.`;
        } else if (first.type === "elec_band_excess") {
          explanation = `${locName} exceeded baseline band across ${occurrences} occurrence${occurrences > 1 ? "s" : ""}, wasting ~${totalExcess.toFixed(1)} kWh.`;
        } else if (first.type === "water_night_leak") {
          explanation = `${locName} registered elevated minimum night flow above baseline across ${occurrences} night${occurrences > 1 ? "s" : ""}, indicating an active plumbing leak (~${totalExcess.toFixed(1)} kL total).`;
        } else if (first.type === "water_overflow") {
          explanation = `${locName} rooftop tank reached 100% full while inflow continued, causing ~${totalExcess.toFixed(1)} kL overflow across ${occurrences} morning${occurrences > 1 ? "s" : ""}.`;
        } else {
          explanation = `Anomaly detected at ${locName} (${totalExcess.toFixed(1)} ${first.unit}).`;
        }
      }

      const evidenceJson = JSON.stringify({
        flagged_hours_count: allFlaggedHours.length,
        flagged_hours: allFlaggedHours.slice(0, 50),
        occurrences,
        details: evidenceDetails,
      });

      drafts.push({
        type: first.type,
        resource: first.resource,
        location_id: first.location_id,
        meter_id: first.meter_id,
        start_ts,
        end_ts,
        status,
        priority,
        confidence,
        occurrences,
        excess_value: Number(totalExcess.toFixed(2)),
        unit: first.unit,
        cost_inr: costInr,
        daily_cost_inr: dailyCostInr,
        co2e_kg: co2eKg,
        explanation,
        evidence_json: evidenceJson,
      });
    }
  }

  return drafts;
}

/**
 * Runs all provided detectors and returns the unified list of anomaly drafts.
 */
export function runAllDetectors(
  detectors: Detector[],
  ctx: DetectorContext,
): AnomalyDraft[] {
  const all: AnomalyDraft[] = [];
  for (const detector of detectors) {
    all.push(...detector.run(ctx));
  }
  return all;
}
