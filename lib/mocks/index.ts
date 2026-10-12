import type {
  Summary,
  Anomaly,
  BlockCode,
} from "@/lib/contract";
import type { PerCapitaBlockReport } from "@/lib/analytics/water";

export const MOCK_SUMMARY: Summary = {
  range: 7,
  resource: "all",
  clock: "2026-10-12T00:00",
  score: {
    total: 84.6,
    electricity: 88.2,
    water: 79.5,
    waste: 86.0,
    waste_insufficient_data: false,
  },
  wasted_inr: 4280,
  saved_verified_inr: 535,
  co2e_wasted_kg: 385.2,
  co2e_avoided_kg: 48.24,
  block_severity: {
    "AB-A": "red",
    "AB-B": "amber",
    LIB: "green",
    "HST-1": "red",
    "HST-2": "green",
    MESS: "amber",
  },
  tags: {
    wasted_inr: "estimated",
    saved_verified_inr: "verified",
    co2e_wasted_kg: "estimated",
    co2e_avoided_kg: "verified",
  },
  top_wasters: [
    {
      anomaly_id: 1,
      location_code: "A-204",
      location_name: "Hall A-204",
      resource: "electricity",
      avoidable_inr: 536,
      daily_cost_inr: 76.5,
      priority: "high",
    },
    {
      anomaly_id: 2,
      location_code: "HST-1",
      location_name: "Boys Hostel 1",
      resource: "water",
      avoidable_inr: 2100,
      daily_cost_inr: 300,
      priority: "high",
    },
    {
      anomaly_id: 3,
      location_code: "AB-B",
      location_name: "Academic Block B",
      resource: "water",
      avoidable_inr: 840,
      daily_cost_inr: 120,
      priority: "medium",
    },
    {
      anomaly_id: 4,
      location_code: "A-L3",
      location_name: "Lab A-L3",
      resource: "electricity",
      avoidable_inr: 804,
      daily_cost_inr: 115,
      priority: "medium",
    },
    {
      anomaly_id: 5,
      location_code: "MESS",
      location_name: "Mess and Canteen",
      resource: "waste",
      avoidable_inr: null,
      daily_cost_inr: null,
      priority: "medium",
    },
  ],
};

export const MOCK_ANOMALIES: Anomaly[] = [
  {
    id: 1,
    type: "elec_unscheduled_load",
    resource: "electricity",
    location: {
      id: 12,
      code: "A-204",
      name: "Hall A-204",
      block: "AB-A",
    },
    meter_id: "E-A-204",
    start_ts: "2026-10-09T18:00",
    end_ts: "2026-10-10T08:00",
    status: "active",
    priority: "high",
    confidence: "high",
    occurrences: 4,
    excess: { value: 67.0, unit: "kWh" },
    cost_inr: 536,
    daily_cost_inr: 76.5,
    co2e_kg: 48.24,
    explanation:
      "Hall A-204 drew 2.4 kW across 14 unscheduled evening hours. Expected standby is 0.05 kW. Projector and AC sub-circuits were left active overnight.",
    evidence: {
      standby_baseline_kw: 0.05,
      active_draw_kw: 2.4,
      consecutive_hours: 14,
    },
    ticket_id: null,
  },
  {
    id: 2,
    type: "water_night_leak",
    resource: "water",
    location: {
      id: 20,
      code: "HST-1",
      name: "Boys Hostel 1",
      block: "HST-1",
    },
    meter_id: "W-HST-1",
    start_ts: "2026-10-06T02:00",
    end_ts: "2026-10-12T04:00",
    status: "active",
    priority: "high",
    confidence: "high",
    occurrences: 6,
    excess: { value: 70.6, unit: "kL" },
    cost_inr: 2100,
    daily_cost_inr: 300,
    co2e_kg: 21.18,
    explanation:
      "Boys Hostel 1 shows a persistent 420 L/h flow during the 02:00-04:00 night window (baseline 120 L/h), indicating a flush tank or ground line breach.",
    evidence: {
      baseline_night_lph: 120,
      observed_night_lph: 420,
      consecutive_nights: 6,
    },
    ticket_id: null,
  },
  {
    id: 3,
    type: "water_overflow",
    resource: "water",
    location: {
      id: 15,
      code: "AB-B",
      name: "Academic Block B",
      block: "AB-B",
    },
    meter_id: "T-AB-B",
    start_ts: "2026-10-10T14:00",
    end_ts: "2026-10-10T17:00",
    status: "active",
    priority: "medium",
    confidence: "high",
    occurrences: 2,
    excess: { value: 4.2, unit: "kL" },
    cost_inr: 840,
    daily_cost_inr: 120,
    co2e_kg: 1.26,
    explanation:
      "Rooftop tank at Academic Block B reached 99.8% capacity with inflow exceeding baseline by 1,400 L/h due to float valve failure.",
    evidence: {
      tank_level_pct: 99.8,
      excess_inflow_lph: 1400,
    },
    ticket_id: null,
  },
  {
    id: 4,
    type: "elec_unscheduled_load",
    resource: "electricity",
    location: {
      id: 14,
      code: "A-L3",
      name: "Lab A-L3",
      block: "AB-A",
    },
    meter_id: "E-A-L3",
    start_ts: "2026-10-10T19:00",
    end_ts: "2026-10-11T07:00",
    status: "active",
    priority: "medium",
    confidence: "high",
    occurrences: 2,
    excess: { value: 43.2, unit: "kWh" },
    cost_inr: 804,
    daily_cost_inr: 115,
    co2e_kg: 31.1,
    explanation:
      "Lab A-L3 sustained 3.6 kW throughout the weekend night. 40 desktop workstations were left running idle without scheduled classes.",
    evidence: {
      workstations_active: 40,
      baseline_kw: 0.2,
      actual_kw: 3.6,
    },
    ticket_id: null,
  },
  {
    id: 5,
    type: "waste_bad_segregation",
    resource: "waste",
    location: {
      id: 30,
      code: "MESS",
      name: "Mess and Canteen",
      block: "MESS",
    },
    meter_id: null,
    start_ts: "2026-10-08T12:00",
    end_ts: "2026-10-11T20:00",
    status: "active",
    priority: "medium",
    confidence: "medium",
    occurrences: 18,
    excess: { value: 142.5, unit: "kg" },
    cost_inr: null,
    daily_cost_inr: null,
    co2e_kg: 71.25,
    explanation:
      "Mess segregation accuracy dropped to 48% over the last 35 checks. Food packaging and single-use plastic frequently cross-contaminating wet organic bins.",
    evidence: {
      accuracy_pct: 48,
      checks_total: 35,
      misrouted_kg: 142.5,
    },
    ticket_id: null,
  },
];

export interface ElectricitySeriesPoint {
  ts: string;
  hour: string;
  value: number;
  expectedMin: number;
  expectedMax: number;
  isAnomaly: boolean;
  scheduled: boolean;
}

export function generateMockElectricitySeries(
  meterId = "E-A-204",
  rangeDays = 7,
): ElectricitySeriesPoint[] {
  const points: ElectricitySeriesPoint[] = [];
  const hoursCount = rangeDays * 24;
  const baseDate = new Date("2026-10-05T00:00:00Z");

  for (let i = 0; i < hoursCount; i++) {
    const d = new Date(baseDate.getTime() + i * 3600000);
    const dayOfWeek = (d.getUTCDay() + 6) % 7; // 0=Mon..6=Sun
    const h = d.getUTCHours();
    const isWeekend = dayOfWeek >= 5;
    const isTeachingHour = !isWeekend && h >= 9 && h <= 17 && h !== 13;
    const ts = d.toISOString().slice(0, 16);
    const hourLabel = `${String(h).padStart(2, "0")}:00`;

    const expectedStandby = meterId.includes("L3") ? 0.2 : 0.05;
    const expectedOccupied = meterId.includes("L3") ? 3.6 : 2.4;

    const baseExpected = isTeachingHour ? expectedOccupied : expectedStandby;
    const expectedMin = Number((baseExpected * 0.85).toFixed(2));
    const expectedMax = Number((baseExpected * 1.15).toFixed(2));

    // Simulated anomaly in A-204 on days 4 & 5 during evening/night (18:00 - 07:00)
    const isEveningNight = h >= 18 || h < 8;
    const isAnomalyPeriod =
      meterId === "E-A-204" && i >= 96 && i <= 124 && isEveningNight;

    let value = isTeachingHour
      ? expectedOccupied + (Math.sin(i * 0.5) * 0.15)
      : expectedStandby + (Math.sin(i * 0.8) * 0.02);

    if (isAnomalyPeriod) {
      value = 2.4 + (Math.sin(i * 0.3) * 0.18);
    }

    points.push({
      ts,
      hour: hourLabel,
      value: Number(Math.max(0, value).toFixed(2)),
      expectedMin,
      expectedMax,
      isAnomaly: Boolean(isAnomalyPeriod),
      scheduled: isTeachingHour,
    });
  }

  return points;
}

export interface WaterSeriesPoint {
  ts: string;
  hour: string;
  value: number; // L/h
  baseline: number;
  isNightWindow: boolean;
  isLeak: boolean;
}

export function generateMockWaterSeries(
  block = "HST-1",
  rangeDays = 7,
): WaterSeriesPoint[] {
  const points: WaterSeriesPoint[] = [];
  const hoursCount = rangeDays * 24;
  const baseDate = new Date("2026-10-05T00:00:00Z");
  const baselineNight = block === "HST-1" ? 120 : 60;

  for (let i = 0; i < hoursCount; i++) {
    const d = new Date(baseDate.getTime() + i * 3600000);
    const h = d.getUTCHours();
    const ts = d.toISOString().slice(0, 16);
    const hourLabel = `${String(h).padStart(2, "0")}:00`;
    const isNightWindow = h >= 2 && h <= 4;

    // Normal day flow curve with morning peak (06-09) and evening peak (18-21)
    let normalFlow = baselineNight;
    if (h >= 6 && h <= 9) {
      normalFlow = 2800 + Math.sin(h) * 400;
    } else if (h >= 18 && h <= 21) {
      normalFlow = 2200 + Math.cos(h) * 300;
    } else if (h > 9 && h < 18) {
      normalFlow = 750 + Math.sin(h) * 150;
    }

    const hasLeak = block === "HST-1" && i >= 24;
    const value = hasLeak ? normalFlow + 300 + (Math.sin(i * 0.4) * 35) : normalFlow;

    points.push({
      ts,
      hour: hourLabel,
      value: Math.round(value),
      baseline: baselineNight,
      isNightWindow,
      isLeak: hasLeak && isNightWindow,
    });
  }

  return points;
}

export interface TankSeriesPoint {
  ts: string;
  hour: string;
  levelPct: number;
  inflowLph: number;
  isOverflow: boolean;
}

export function generateMockTankSeries(
  block = "AB-B",
  rangeDays = 7,
): TankSeriesPoint[] {
  const points: TankSeriesPoint[] = [];
  const hoursCount = rangeDays * 24;
  const baseDate = new Date("2026-10-05T00:00:00Z");

  for (let i = 0; i < hoursCount; i++) {
    const d = new Date(baseDate.getTime() + i * 3600000);
    const h = d.getUTCHours();
    const ts = d.toISOString().slice(0, 16);
    const hourLabel = `${String(h).padStart(2, "0")}:00`;

    // Normal tank fluctuates between 40% and 92%
    let level = 70 + Math.sin(i * 0.25) * 20;
    let inflow = 800 + Math.sin(i * 0.3) * 200;
    let isOverflow = false;

    // Overflow incident on day 5 afternoon (i between 110 and 114)
    if (block === "AB-B" && i >= 110 && i <= 114) {
      level = 99.8;
      inflow = 2200;
      isOverflow = true;
    }

    points.push({
      ts,
      hour: hourLabel,
      levelPct: Number(level.toFixed(1)),
      inflowLph: Math.round(inflow),
      isOverflow,
    });
  }

  return points;
}

export const MOCK_PER_CAPITA_WATER: PerCapitaBlockReport[] = [
  {
    block_code: "AB-A",
    population: 1800,
    target_l: 20,
    actual_l: 18,
    ratio_pct: 90,
    is_flagged: false,
  },
  {
    block_code: "AB-B",
    population: 1200,
    target_l: 20,
    actual_l: 22,
    ratio_pct: 110,
    is_flagged: false,
  },
  {
    block_code: "LIB",
    population: 500,
    target_l: 20,
    actual_l: 15,
    ratio_pct: 75,
    is_flagged: false,
  },
  {
    block_code: "HST-1",
    population: 600,
    target_l: 120,
    actual_l: 168,
    ratio_pct: 140, // Above 120% target
    is_flagged: true,
  },
  {
    block_code: "HST-2",
    population: 500,
    target_l: 120,
    actual_l: 114,
    ratio_pct: 95,
    is_flagged: false,
  },
  {
    block_code: "MESS",
    population: 3500,
    target_l: 10,
    actual_l: 9,
    ratio_pct: 90,
    is_flagged: false,
  },
];

export interface ElectricityBlockShare {
  block: BlockCode;
  totalKwh: number;
  afterHoursKwh: number;
  afterHoursPct: number;
}

export const MOCK_ELECTRICITY_BLOCKS: Record<
  BlockCode,
  { totalKwh: number; afterHoursKwh: number; afterHoursPct: number }
> = {
  "AB-A": { totalKwh: 4820, afterHoursKwh: 1240, afterHoursPct: 25.7 },
  "AB-B": { totalKwh: 3450, afterHoursKwh: 690, afterHoursPct: 20.0 },
  LIB: { totalKwh: 2180, afterHoursKwh: 320, afterHoursPct: 14.7 },
  "HST-1": { totalKwh: 4210, afterHoursKwh: 2680, afterHoursPct: 63.7 },
  "HST-2": { totalKwh: 3620, afterHoursKwh: 2280, afterHoursPct: 63.0 },
  MESS: { totalKwh: 2890, afterHoursKwh: 1150, afterHoursPct: 39.8 },
};

export interface CampusHierarchyNode {
  id: string;
  name: string;
  code: string;
  kind: "campus" | "block" | "floor" | "room";
  meterId?: string;
  hasAnomaly?: boolean;
  children?: CampusHierarchyNode[];
}

export const MOCK_HIERARCHY: CampusHierarchyNode = {
  id: "CAMPUS",
  name: "Main Campus",
  code: "CAMPUS",
  kind: "campus",
  children: [
    {
      id: "AB-A",
      name: "Academic Block A",
      code: "AB-A",
      kind: "block",
      hasAnomaly: true,
      children: [
        {
          id: "A-F1",
          name: "Floor 1",
          code: "A-F1",
          kind: "floor",
          children: [
            { id: "A-101", name: "Room A-101", code: "A-101", kind: "room", meterId: "E-A-101" },
            { id: "A-102", name: "Room A-102", code: "A-102", kind: "room", meterId: "E-A-102" },
            { id: "A-L1", name: "Lab A-L1", code: "A-L1", kind: "room", meterId: "E-A-L1" },
          ],
        },
        {
          id: "A-F2",
          name: "Floor 2",
          code: "A-F2",
          kind: "floor",
          hasAnomaly: true,
          children: [
            { id: "A-201", name: "Room A-201", code: "A-201", kind: "room", meterId: "E-A-201" },
            {
              id: "A-204",
              name: "Hall A-204",
              code: "A-204",
              kind: "room",
              meterId: "E-A-204",
              hasAnomaly: true,
            },
            {
              id: "A-L3",
              name: "Lab A-L3",
              code: "A-L3",
              kind: "room",
              meterId: "E-A-L3",
              hasAnomaly: true,
            },
          ],
        },
        {
          id: "A-F3",
          name: "Floor 3",
          code: "A-F3",
          kind: "floor",
          children: [
            { id: "A-301", name: "Room A-301", code: "A-301", kind: "room", meterId: "E-A-301" },
            { id: "A-L5", name: "Lab A-L5", code: "A-L5", kind: "room", meterId: "E-A-L5" },
          ],
        },
      ],
    },
    {
      id: "AB-B",
      name: "Academic Block B",
      code: "AB-B",
      kind: "block",
      hasAnomaly: true,
      children: [
        {
          id: "B-F1",
          name: "Floor 1",
          code: "B-F1",
          kind: "floor",
          children: [
            { id: "B-101", name: "Room B-101", code: "B-101", kind: "room", meterId: "E-B-101" },
            { id: "B-L1", name: "Lab B-L1", code: "B-L1", kind: "room", meterId: "E-B-L1" },
          ],
        },
        {
          id: "B-F2",
          name: "Floor 2",
          code: "B-F2",
          kind: "floor",
          children: [
            { id: "B-201", name: "Room B-201", code: "B-201", kind: "room", meterId: "E-B-201" },
            { id: "B-L2", name: "Lab B-L2", code: "B-L2", kind: "room", meterId: "E-B-L2" },
          ],
        },
      ],
    },
    {
      id: "LIB",
      name: "Library and Admin",
      code: "LIB",
      kind: "block",
      children: [
        {
          id: "LIB-F1",
          name: "Floor 1",
          code: "LIB-F1",
          kind: "floor",
          children: [
            { id: "LIB-101", name: "Reading Hall", code: "LIB-101", kind: "room", meterId: "E-LIB-101" },
            { id: "LIB-104", name: "Digital Library", code: "LIB-104", kind: "room", meterId: "E-LIB-104" },
          ],
        },
      ],
    },
    {
      id: "HST-1",
      name: "Boys Hostel 1",
      code: "HST-1",
      kind: "block",
      hasAnomaly: true,
      children: [
        { id: "HST1-F1", name: "Hostel Floor 1", code: "HST1-F1", kind: "floor", meterId: "E-HST1-F1" },
        { id: "HST1-F2", name: "Hostel Floor 2", code: "HST1-F2", kind: "floor", meterId: "E-HST1-F2" },
      ],
    },
    {
      id: "HST-2",
      name: "Girls Hostel",
      code: "HST-2",
      kind: "block",
      children: [
        { id: "HST2-F1", name: "Hostel Floor 1", code: "HST2-F1", kind: "floor", meterId: "E-HST2-F1" },
      ],
    },
    {
      id: "MESS",
      name: "Mess and Canteen",
      code: "MESS",
      kind: "block",
      hasAnomaly: true,
      children: [
        { id: "MESS-HALL", name: "Dining Hall", code: "MESS", kind: "room", meterId: "E-MESS" },
      ],
    },
  ],
};
