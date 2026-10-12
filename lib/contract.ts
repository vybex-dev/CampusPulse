import { z } from "zod";

// ════════════════════════════════════════════════════════════════════════
// Phase 0 exports (unchanged)
// ════════════════════════════════════════════════════════════════════════

export const ROLES = ["admin", "staff", "student"] as const;
export const RoleSchema = z.enum(ROLES);
export type Role = z.infer<typeof RoleSchema>;

export const BLOCK_CODES = [
  "AB-A",
  "AB-B",
  "LIB",
  "HST-1",
  "HST-2",
  "MESS",
] as const;
export const BlockCodeSchema = z.enum(BLOCK_CODES);
export type BlockCode = z.infer<typeof BlockCodeSchema>;

export const BLOCK_NAMES: Record<BlockCode, string> = {
  "AB-A": "Academic Block A",
  "AB-B": "Academic Block B",
  LIB: "Library and Admin",
  "HST-1": "Boys Hostel 1",
  "HST-2": "Girls Hostel",
  MESS: "Mess and Canteen",
};

export const RangeSchema = z.union([z.literal(7), z.literal(30)]);
export type Range = z.infer<typeof RangeSchema>;

export const ResourceTabSchema = z.enum([
  "all",
  "electricity",
  "water",
  "waste",
]);
export type ResourceTab = z.infer<typeof ResourceTabSchema>;

export const WasteModeSchema = z.enum(["identify", "bin_check"]);
export type WasteMode = z.infer<typeof WasteModeSchema>;

/** Every number in the product carries exactly one of these. Never mixed. */
export const TagSchema = z.enum([
  "verified",
  "estimated",
  "projected",
  "measured",
]);
export type Tag = z.infer<typeof TagSchema>;

export const ApiErrorSchema = z.object({
  error: z.object({ code: z.string(), message: z.string() }),
});

export const DemoStateSchema = z.object({
  clock: z.string(), // ISO 8601, simulated local time, hourly resolution
  seed: z.number(),
});
export type DemoState = z.infer<typeof DemoStateSchema>;

export const FastForwardBodySchema = z.object({
  days: z.union([z.literal(1), z.literal(7)]),
});

const ProviderStatus = z.enum(["ok", "cooling_down", "unconfigured"]);
export const HealthSchema = z.object({
  providers: z.object({
    groq: z.object({
      status: ProviderStatus,
      model: z.string(),
      retry_after_s: z.number().optional(),
    }),
    gemini: z.object({
      status: ProviderStatus,
      model: z.string(),
      retry_after_s: z.number().optional(),
    }),
  }),
  sample_mode: z.boolean(),
});
export type Health = z.infer<typeof HealthSchema>;

// ════════════════════════════════════════════════════════════════════════
// Phase 1: shared primitives
// ════════════════════════════════════════════════════════════════════════

export type ApiError = z.infer<typeof ApiErrorSchema>;

/** ISO 8601 in simulated local time, e.g. 2026-10-12T00:00 (hourly resolution). */
export const TsSchema = z
  .string()
  .regex(
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/,
    "Expected ISO 8601 simulated local time, e.g. 2026-10-12T00:00",
  );

/** An object with one entry per block. Explicit keys (Zod 3 records are not exhaustive). */
export function blockRecord<T extends z.ZodTypeAny>(value: T) {
  return z.object({
    "AB-A": value,
    "AB-B": value,
    LIB: value,
    "HST-1": value,
    "HST-2": value,
    MESS: value,
  });
}

/** An object with one entry per waste category. */
export function categoryRecord<T extends z.ZodTypeAny>(value: T) {
  return z.object({
    wet_biodegradable: value,
    paper_cardboard: value,
    plastic: value,
    metal_glass: value,
    e_waste: value,
    hazardous: value,
    other_residual: value,
  });
}

// ── Enums ───────────────────────────────────────────────────────────────

export const ResourceSchema = z.enum(["electricity", "water", "waste"]);
export type Resource = z.infer<typeof ResourceSchema>;

export const MeterResourceSchema = z.enum([
  "electricity",
  "water",
  "tank_level",
]);
export type MeterResource = z.infer<typeof MeterResourceSchema>;

export const MeterUnitSchema = z.enum(["kW", "L/h", "percent"]);
export type MeterUnit = z.infer<typeof MeterUnitSchema>;

export const LocationKindSchema = z.enum(["campus", "block", "floor", "room"]);
export type LocationKind = z.infer<typeof LocationKindSchema>;

export const RoomTypeSchema = z.enum([
  "classroom",
  "lab",
  "office",
  "library_room",
  "hostel_floor",
  "mess",
]);
export type RoomType = z.infer<typeof RoomTypeSchema>;

export const WASTE_CATEGORIES = [
  "wet_biodegradable",
  "paper_cardboard",
  "plastic",
  "metal_glass",
  "e_waste",
  "hazardous",
  "other_residual",
] as const;
export const WasteCategorySchema = z.enum(WASTE_CATEGORIES);
export type WasteCategory = z.infer<typeof WasteCategorySchema>;

/** Bin ids. Names and colours are configurable in Settings. */
export const BINS = ["green", "blue", "red", "black"] as const;
export const BinSchema = z.enum(BINS);
export type Bin = z.infer<typeof BinSchema>;

export const TICKET_STATUSES = [
  "open",
  "in_progress",
  "resolved",
  "verifying",
  "verified",
  "reopened",
] as const;
export const TicketStatusSchema = z.enum(TICKET_STATUSES);
export type TicketStatus = z.infer<typeof TicketStatusSchema>;

export const PrioritySchema = z.enum(["high", "medium", "low"]);
export type Priority = z.infer<typeof PrioritySchema>;

export const ConfidenceLabelSchema = z.enum(["high", "medium", "low"]);
export type ConfidenceLabel = z.infer<typeof ConfidenceLabelSchema>;

/** Used ONLY for severity (map colours, pills). */
export const SeveritySchema = z.enum(["green", "amber", "red"]);
export type Severity = z.infer<typeof SeveritySchema>;

export const TeamSchema = z.enum(["electrical", "plumbing", "housekeeping"]);
export type Team = z.infer<typeof TeamSchema>;

export const AnomalyTypeSchema = z.enum([
  "elec_unscheduled_load",
  "elec_band_excess",
  "water_night_leak",
  "water_overflow",
  "waste_bad_segregation",
]);
export type AnomalyType = z.infer<typeof AnomalyTypeSchema>;

export const AnomalyStatusSchema = z.enum(["active", "cleared"]);
export type AnomalyStatus = z.infer<typeof AnomalyStatusSchema>;

export const FaultKindSchema = z.enum([
  "elec_hold",
  "elec_afterhours_excess",
  "water_const_leak",
  "water_tank_overflow",
  "waste_bad_segregation",
  "diffuse_elec",
  "diffuse_leak",
]);
export type FaultKind = z.infer<typeof FaultKindSchema>;

export const ProviderSchema = z.enum(["groq", "gemini", "sample"]);
export type Provider = z.infer<typeof ProviderSchema>;

export const WasteSourceSchema = z.enum(["ai", "user_corrected", "sample"]);
export type WasteSource = z.infer<typeof WasteSourceSchema>;

// ── Hierarchy, meters, readings ─────────────────────────────────────────

export const LocationSchema = z.object({
  id: z.number().int(),
  parent_id: z.number().int().nullable(),
  kind: LocationKindSchema,
  code: z.string().min(1),
  name: z.string().min(1),
  room_type: RoomTypeSchema.nullable(),
  /** Daily users, residents, or meals per day (mess). */
  population: z.number().int().nonnegative().nullable(),
});
export type Location = z.infer<typeof LocationSchema>;

export const MeterSchema = z.object({
  id: z.string().min(1), // E-A-204, W-HST-1, T-AB-B
  location_id: z.number().int(),
  resource: MeterResourceSchema,
  unit: MeterUnitSchema,
});
export type Meter = z.infer<typeof MeterSchema>;

export const ReadingSchema = z.object({
  meter_id: z.string(),
  ts: TsSchema,
  value: z.number(),
});
export type Reading = z.infer<typeof ReadingSchema>;

// ── Anomalies, tickets, savings ─────────────────────────────────────────

export const AnomalySchema = z.object({
  id: z.number().int(),
  type: AnomalyTypeSchema,
  resource: ResourceSchema,
  location: z.object({
    id: z.number().int(),
    code: z.string(),
    name: z.string(),
    block: BlockCodeSchema,
  }),
  meter_id: z.string().nullable(),
  start_ts: TsSchema,
  end_ts: TsSchema,
  status: AnomalyStatusSchema,
  priority: PrioritySchema,
  confidence: ConfidenceLabelSchema,
  occurrences: z.number().int().min(1),
  /** kWh, kL, or kg of misrouted waste. */
  excess: z.object({ value: z.number(), unit: z.enum(["kWh", "kL", "kg"]) }),
  /** Waste anomalies have no rupee value. */
  cost_inr: z.number().nullable(),
  daily_cost_inr: z.number().nullable(),
  co2e_kg: z.number(),
  explanation: z.string(),
  /** Flagged hours, expected values, timetable state: feeds chart highlights. */
  evidence: z.record(z.string(), z.unknown()),
  ticket_id: z.number().int().nullable(),
});
export type Anomaly = z.infer<typeof AnomalySchema>;

/** Row plus three joined fields (resource, location_name, daily_cost_inr) for the board. */
export const TicketSchema = z.object({
  id: z.number().int(),
  anomaly_id: z.number().int(),
  title: z.string(),
  status: TicketStatusSchema,
  priority: PrioritySchema,
  team: TeamSchema,
  created_at: TsSchema,
  resolved_at: TsSchema.nullable(),
  verified_at: TsSchema.nullable(),
  resolve_note: z.string().nullable(),
  resource: ResourceSchema,
  location_name: z.string(),
  daily_cost_inr: z.number().nullable(),
});
export type Ticket = z.infer<typeof TicketSchema>;

export const TICKET_EVENT_KINDS = [
  "created",
  "assigned",
  "status_changed",
  "resolved",
  "verified",
  "reopened",
  "note",
] as const;
export const TicketEventKindSchema = z.enum(TICKET_EVENT_KINDS);

export const TicketEventSchema = z.object({
  id: z.number().int(),
  ticket_id: z.number().int(),
  ts: TsSchema,
  /** 'system' for automatic transitions (verifying, verified, reopened). */
  actor_role: z.enum(["admin", "staff", "student", "system"]),
  event: TicketEventKindSchema,
  note: z.string().nullable(),
});
export type TicketEvent = z.infer<typeof TicketEventSchema>;

export const SavingsSchema = z.object({
  ticket_id: z.number().int(),
  window_start: TsSchema,
  window_end: TsSchema,
  /** What the fault would have used over the window (counterfactual). kWh, kL or kg. */
  expected_units: z.number(),
  actual_units: z.number(),
  saved_units: z.number(),
  saved_inr: z.number(),
  saved_co2e_kg: z.number(),
});
export type Savings = z.infer<typeof SavingsSchema>;

export const TicketDetailSchema = TicketSchema.extend({
  anomaly: AnomalySchema,
  events: z.array(TicketEventSchema),
  savings: SavingsSchema.nullable(),
});
export type TicketDetail = z.infer<typeof TicketDetailSchema>;

export const CreateTicketBodySchema = z.object({
  anomaly_id: z.number().int().positive(),
});
export type CreateTicketBody = z.infer<typeof CreateTicketBodySchema>;

/** "Resolved requires a note" is enforced in the handler, where it can return 409/400. */
export const PatchTicketBodySchema = z
  .object({
    status: TicketStatusSchema.optional(),
    note: z.string().trim().min(1).max(500).optional(),
  })
  .refine((b) => b.status !== undefined || b.note !== undefined, {
    message: "Provide a status, a note, or both",
  });
export type PatchTicketBody = z.infer<typeof PatchTicketBodySchema>;

// ── Waste ───────────────────────────────────────────────────────────────

export const ClassificationSchema = z.object({
  is_waste_item: z.boolean(),
  item_name: z.string().trim().max(120),
  category: WasteCategorySchema,
  /** Self-reported, indicative, not calibrated. */
  confidence: z.number().min(0).max(1),
  disposal_tip: z.string().trim().max(240),
  reason: z.string().trim().max(300),
});
export type Classification = z.infer<typeof ClassificationSchema>;

export const WasteLogSchema = z.object({
  id: z.number().int(),
  ts: TsSchema,
  block_id: BlockCodeSchema,
  mode: WasteModeSchema,
  category: WasteCategorySchema,
  item_name: z.string(),
  confidence: z.number().min(0).max(1),
  source: WasteSourceSchema,
  provider: ProviderSchema,
  chosen_bin: BinSchema.nullable(),
  correct_bin: BinSchema.nullable(),
  /** null for identify scans (they never change accuracy). SQLite stores 0/1. */
  is_correct: z.boolean().nullable(),
  est_weight_kg: z.number().nonnegative(),
  co2e_avoided_kg: z.number().nonnegative(),
  points: z.number().int().nonnegative(),
  /** Data URL of a thumbnail, 160 px or smaller. Full images are never stored. */
  thumb: z.string().nullable(),
});
export type WasteLog = z.infer<typeof WasteLogSchema>;

// ── Settings (single source of defaults; DEFAULT_SETTINGS = SettingsSchema.parse({})) ──

export const WasteCategoryRuleSchema = z.object({
  bin: BinSchema,
  weight_kg: z.number().positive(),
  /** Illustrative CO2e avoided per kg correctly segregated. 0 = not credited. */
  ef_kg_per_kg: z.number().min(0),
  points: z.number().int().min(0),
});
export type WasteCategoryRule = z.infer<typeof WasteCategoryRuleSchema>;

// Defaults are parsed once up front so this behaves the same on zod 3 and zod 4
// (v4's .default() does not run its value through the schema; .prefault() is v4-only).
const ThresholdsBaseSchema = z.object({
  elec_min_excess_kw: z.number().positive().default(0.4),
  elec_sigma_multiplier: z.number().positive().default(4),
  elec_min_run_hours_r1: z.number().int().min(1).default(2),
  elec_min_run_hours_r2: z.number().int().min(1).default(3),
  elec_band_min_tolerance_pct: z.number().positive().default(0.25),
  elec_band_sigma_multiplier: z.number().positive().default(3),
  elec_gap_tolerance_hours: z.number().int().min(0).default(1),
  merge_window_days: z.number().int().min(1).default(14),
  active_window_hours: z.number().int().min(1).default(48),
  water_leak_min_excess_lph: z.number().positive().default(300),
  water_leak_sigma_multiplier: z.number().positive().default(3),
  water_leak_min_nights: z.number().int().min(1).default(2),
  water_overflow_tank_pct: z.number().min(0).max(100).default(99.5),
  water_overflow_min_excess_lph: z.number().positive().default(1000),
  water_percapita_flag_ratio: z.number().positive().default(1.2),
  waste_flag_accuracy: z.number().min(0).max(1).default(0.6),
  waste_high_below_accuracy: z.number().min(0).max(1).default(0.5),
  waste_min_checks_flag: z.number().int().min(1).default(20),
  waste_min_checks_score: z.number().int().min(1).default(10),
  waste_min_checks_verify: z.number().int().min(1).default(20),
});

export const ThresholdsSchema = ThresholdsBaseSchema.default(
  ThresholdsBaseSchema.parse({}),
);

export const SettingsObjectSchema = z
  .object({
    tariff_inr_per_kwh: z.number().positive().default(8),
    water_inr_per_kl: z.number().positive().default(20),
    ef_grid_kg_per_kwh: z.number().min(0).default(0.72),
    ef_water_kg_per_kl: z.number().min(0).default(0.3),
    waste_categories: categoryRecord(WasteCategoryRuleSchema).default({
      wet_biodegradable: {
        bin: "green",
        weight_kg: 0.15,
        ef_kg_per_kg: 0.5,
        points: 10,
      },
      paper_cardboard: {
        bin: "blue",
        weight_kg: 0.05,
        ef_kg_per_kg: 1.0,
        points: 10,
      },
      plastic: { bin: "blue", weight_kg: 0.03, ef_kg_per_kg: 1.5, points: 10 },
      metal_glass: {
        bin: "blue",
        weight_kg: 0.15,
        ef_kg_per_kg: 1.0,
        points: 10,
      },
      e_waste: { bin: "red", weight_kg: 0.1, ef_kg_per_kg: 2.0, points: 20 },
      hazardous: { bin: "red", weight_kg: 0.05, ef_kg_per_kg: 0, points: 20 },
      other_residual: {
        bin: "black",
        weight_kg: 0.02,
        ef_kg_per_kg: 0,
        points: 5,
      },
    }),
    bins: z
      .object({
        green: z.object({ name: z.string().min(1), colour: z.string() }),
        blue: z.object({ name: z.string().min(1), colour: z.string() }),
        red: z.object({ name: z.string().min(1), colour: z.string() }),
        black: z.object({ name: z.string().min(1), colour: z.string() }),
      })
      .default(() => ({
        green: { name: "Green (wet)", colour: "#2E9E5B" },
        blue: { name: "Blue (dry recyclable)", colour: "#2F6FEB" },
        red: { name: "Red (special collection)", colour: "#D64545" },
        black: { name: "Black (residual)", colour: "#2B2B2E" },
      })),
    score_ceiling_electricity: z.number().gt(0).max(1).default(0.1),
    score_ceiling_water: z.number().gt(0).max(1).default(0.2),
    fix_effectiveness: z.number().min(0).max(1).default(0.85),
    priority_high_inr_per_day: z.number().positive().default(250),
    priority_medium_inr_per_day: z.number().positive().default(50),
    kg_co2_per_tree_per_year: z.number().positive().default(21),
    ac_share_of_academic_load: z.number().min(0).max(1).default(0.5),
    ac_saving_per_degree_c: z.number().min(0).max(1).default(0.05),
    waste_kg_per_person_per_day: z.number().positive().default(0.15),
    thresholds: ThresholdsSchema,
    ai_provider_order: z
      .array(ProviderSchema)
      .min(1)
      .default(["groq", "gemini", "sample"]),
  })
  .strict();

export const SettingsSchema = SettingsObjectSchema.refine(
  (s) => s.priority_medium_inr_per_day < s.priority_high_inr_per_day,
  {
    message: "Medium priority threshold must be below the High threshold",
    path: ["priority_medium_inr_per_day"],
  },
);
export type Settings = z.infer<typeof SettingsSchema>;

/** Request body of PUT /api/settings: validated after deep-merging into current settings. */
export const SettingsPatchSchema = z.record(z.string(), z.unknown());

// ── Summary, What-If, Report ────────────────────────────────────────────

export const ScoreSchema = z.object({
  total: z.number().min(0).max(100),
  electricity: z.number().min(0).max(100),
  water: z.number().min(0).max(100),
  waste: z.number().min(0).max(100),
  /** true when fewer than 10 bin checks exist; waste then shows the last available value. */
  waste_insufficient_data: z.boolean().default(false),
});
export type Score = z.infer<typeof ScoreSchema>;

export const TopWasterSchema = z.object({
  anomaly_id: z.number().int(),
  location_code: z.string(),
  location_name: z.string(),
  resource: ResourceSchema,
  avoidable_inr: z.number().nullable(),
  daily_cost_inr: z.number().nullable(),
  priority: PrioritySchema,
});
export type TopWaster = z.infer<typeof TopWasterSchema>;

export const SummarySchema = z.object({
  range: RangeSchema,
  resource: ResourceTabSchema,
  clock: TsSchema,
  /** Always the trailing 7 days, whatever the range. */
  score: ScoreSchema,
  wasted_inr: z.number(),
  saved_verified_inr: z.number(),
  co2e_wasted_kg: z.number(),
  co2e_avoided_kg: z.number(),
  block_severity: blockRecord(SeveritySchema),
  tags: z.object({
    wasted_inr: TagSchema,
    saved_verified_inr: TagSchema,
    co2e_wasted_kg: TagSchema,
    co2e_avoided_kg: TagSchema,
  }),
  top_wasters: z.array(TopWasterSchema).max(5),
});
export type Summary = z.infer<typeof SummarySchema>;

/** Snapshot for the browser-side What-If maths. Shares are fractions (0..1); A is a percentage (0..100). */
export const WhatIfSnapshotSchema = z.object({
  U_E: z.number().nonnegative(), // monthly kWh (last 7 days x 30/7)
  U_W: z.number().nonnegative(), // monthly kL
  a_E: z.number().min(0).max(1), // avoidable electricity share, last 7 days
  a_W: z.number().min(0).max(1),
  E_acad: z.number().nonnegative(), // monthly kWh of academic + library blocks
  A: z.number().min(0).max(100), // campus segregation accuracy, %
  M: z.number().nonnegative(), // monthly waste mass, kg (assumption)
  tariff_inr_per_kwh: z.number(),
  water_inr_per_kl: z.number(),
  ef_grid_kg_per_kwh: z.number(),
  ef_water_kg_per_kl: z.number(),
  ef_waste_avg_kg_per_kg: z.number(), // about 0.75 from the assumed category mix
  fix_effectiveness: z.number(),
  ac_share_of_academic_load: z.number(),
  ac_saving_per_degree_c: z.number(),
  score_ceiling_electricity: z.number(),
  score_ceiling_water: z.number(),
});
export type WhatIfSnapshot = z.infer<typeof WhatIfSnapshotSchema>;

export const ReportPeriodSchema = z.enum(["7", "30", "all"]);
export type ReportPeriod = z.infer<typeof ReportPeriodSchema>;

/** A number with a unit and exactly one tag. No untagged number appears in the report. */
export const QuantitySchema = z.object({
  value: z.number(),
  unit: z.string(),
  tag: TagSchema,
});
export type Quantity = z.infer<typeof QuantitySchema>;

export const ReportSchema = z.object({
  period: ReportPeriodSchema,
  generated_at: TsSchema,
  data_period: z.object({ from: TsSchema, to: TsSchema }),
  score: ScoreSchema,
  verified_savings_inr: QuantitySchema,
  money: z.object({
    wasted: QuantitySchema,
    saved: QuantitySchema,
    recoverable_per_month: QuantitySchema,
  }),
  carbon: z.object({
    wasted: QuantitySchema,
    avoided: QuantitySchema,
    trees_equivalent: QuantitySchema,
  }),
  units: z.object({
    kwh_wasted: QuantitySchema,
    kwh_saved: QuantitySchema,
    kl_wasted: QuantitySchema,
    kl_saved: QuantitySchema,
    kg_segregated: QuantitySchema,
  }),
  actions: z.object({
    raised: QuantitySchema,
    resolved: QuantitySchema,
    verified: QuantitySchema,
    top_example: z
      .object({
        ticket_id: z.number().int(),
        title: z.string(),
        resource: ResourceSchema,
        saved_units: z.number(),
        unit: z.string(),
        saved_inr: z.number(),
        saved_co2e_kg: z.number(),
      })
      .nullable(),
  }),
  top_wastes: z.array(TopWasterSchema).max(5),
  method: z.object({
    rates: SettingsObjectSchema.pick({
      tariff_inr_per_kwh: true,
      water_inr_per_kl: true,
      ef_grid_kg_per_kwh: true,
      ef_water_kg_per_kl: true,
      score_ceiling_electricity: true,
      score_ceiling_water: true,
    }),
    disclosures: z.array(z.string()),
    simulated_statement: z.string(),
  }),
});
export type Report = z.infer<typeof ReportSchema>;
