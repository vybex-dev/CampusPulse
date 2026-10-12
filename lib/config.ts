/**
 * Loads and validates config/campus.config.json and config/faults.json, and derives the
 * meter list. Server-only (uses node:fs); never import this from a client component.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { z } from "zod";
import {
  BinSchema,
  BlockCodeSchema,
  PrioritySchema,
  RoomTypeSchema,
  TeamSchema,
  TsSchema,
  WasteCategorySchema,
  blockRecord,
  categoryRecord,
  type BlockCode,
  type MeterResource,
  type MeterUnit,
} from "./contract";

// ── Campus config ───────────────────────────────────────────────────────

const HourBound = z.number().int().min(0).max(24);
/** Half-open hour range [start, end): hours start..end-1. */
const HourRange = z.tuple([HourBound, HourBound]);
const Probability = z.number().min(0).max(1);

const RoomTypeParamsSchema = z.object({
  occupied_kw: z.number().positive(),
  standby_kw: z.number().min(0),
  schedule: z.discriminatedUnion("mode", [
    z.object({
      mode: z.literal("random"),
      weekday_prob: Probability,
      saturday_prob: Probability,
    }),
    z.object({
      mode: z.literal("fixed"),
      start: HourBound,
      end: HourBound,
      days: z.array(z.number().int().min(0).max(6)),
    }),
  ]),
});

const CategoryMixSchema = categoryRecord(Probability).refine(
  (mix) => Math.abs(Object.values(mix).reduce((a, b) => a + b, 0) - 1) < 1e-6,
  { message: "Category mix must sum to 1" },
);

const FloorSchema = z.object({
  level: z.number().int().min(1),
  code: z.string().min(1),
  room_type: RoomTypeSchema.optional(),
  /** true = this floor has its own electricity meter (hostel floors). */
  meter: z.boolean().default(false),
});

const RoomSchema = z.object({
  code: z.string().min(1),
  name: z.string().optional(),
  floor: z.number().int().min(1),
  type: RoomTypeSchema,
  occupied_kw: z.number().positive().optional(),
  pcs: z.number().int().positive().optional(),
});

const BlockConfigSchema = z.object({
  code: BlockCodeSchema,
  name: z.string().min(1),
  type: z.enum(["academic", "library_admin", "hostel", "mess"]),
  population: z.object({
    count: z.number().int().positive(),
    unit: z.enum(["daily_users", "residents", "meals"]),
  }),
  per_capita_target_l: z.number().positive(),
  weekly_bin_mass_kg: z.number().positive(),
  bin_checks_per_week: z.number().int().positive(),
  water: z.object({ baseline_night_lph: z.number().positive() }),
  tank: z
    .object({
      capacity_kl: z.number().positive(),
      kind: z.enum(["rooftop", "overhead"]),
    })
    .nullable(),
  floors: z.array(FloorSchema).min(1),
  rooms: z.array(RoomSchema),
});

export const CampusConfigSchema = z.object({
  notes: z.array(z.string()).default([]),
  model: z.object({
    history_start: TsSchema,
    history_days: z.number().int().positive(),
    clock_start: TsSchema,
    noise_sd: z.number().min(0),
    temperature_amplitude: z.number().min(0),
  }),
  campus: z.object({
    code: z.string(),
    name: z.string(),
    students_daily: z.number().int().positive(),
    staff: z.number().int().nonnegative(),
    hostel_residents: z.number().int().nonnegative(),
  }),
  teaching_week: z.object({
    weekday: z.object({
      start: HourBound,
      end: HourBound,
      lunch_start: HourBound,
      lunch_end: HourBound,
    }),
    saturday: z.object({ start: HourBound, end: HourBound }),
    sunday_closed: z.boolean(),
  }),
  room_types: z.object({
    classroom: RoomTypeParamsSchema,
    lab: RoomTypeParamsSchema,
    library_room: RoomTypeParamsSchema,
    office: RoomTypeParamsSchema,
  }),
  curves: z.object({
    hostel_floor: z.object({
      baseline_kw: z.number(),
      peak_kw: z.number(),
      peak_hours: z.array(HourRange),
    }),
    mess: z.object({
      base_kw: z.number(),
      peak_kw: z.number(),
      peak_hours: z.array(HourRange),
    }),
  }),
  water: z.object({
    hostel: z.object({
      litres_per_resident_per_day: z.number(),
      peak_hours: z.array(HourRange),
    }),
    academic: z.object({
      litres_per_user_per_day: z.number(),
      use_hours: HourRange,
    }),
    mess: z.object({
      litres_per_meal: z.number(),
      peak_hours: z.array(HourRange),
    }),
  }),
  waste: z.object({
    peer_p_correct: Probability,
    category_mix: CategoryMixSchema,
    category_mix_overrides: blockRecord(CategoryMixSchema).partial(),
  }),
  blocks: z.array(BlockConfigSchema).length(6),
});
export type CampusConfig = z.infer<typeof CampusConfigSchema>;
export type BlockConfig = z.infer<typeof BlockConfigSchema>;

// ── Fault script ────────────────────────────────────────────────────────

const DateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const HourSchema = z.number().int().min(0).max(23);
const ExpectedSchema = z
  .record(z.string(), z.union([z.number(), z.string()]))
  .default({});

const PreseedSchema = z.object({
  ticket: z.object({
    title: z.string(),
    team: TeamSchema,
    priority: PrioritySchema,
    created_at: TsSchema,
    resolved_at: TsSchema,
    verified_at: TsSchema,
    resolve_note: z.string(),
  }),
  savings: z.object({
    window_start: TsSchema,
    window_end: TsSchema,
    expected_units: z.number(),
    actual_units: z.number(),
    saved_units: z.number(),
    saved_inr: z.number(),
    saved_co2e_kg: z.number(),
  }),
});

const faultBase = z.object({
  story_code: z.string(),
  meter_id: z.string().nullable(),
  start_ts: TsSchema,
  active: z.boolean(),
  fixed_at: TsSchema.nullable(),
  /** Golden values from the PRD story table, used by later tests. */
  expected: ExpectedSchema,
  preseed: PreseedSchema.optional(),
});

export const FaultSpecSchema = z.discriminatedUnion("kind", [
  faultBase.extend({
    kind: z.literal("elec_hold"),
    params: z.object({
      dates: z.array(DateSchema).min(1),
      hours: z.array(HourSchema).min(1),
      level_kw: z.number().positive(),
    }),
  }),
  faultBase.extend({
    kind: z.literal("elec_afterhours_excess"),
    params: z.object({
      block: BlockCodeSchema,
      meter_ids: z.array(z.string()).min(1),
      extra_kw_total: z.number().positive(),
      hours: z.array(HourSchema).min(1),
    }),
  }),
  faultBase.extend({
    kind: z.literal("water_const_leak"),
    params: z.object({ extra_lph: z.number().positive() }),
  }),
  faultBase.extend({
    kind: z.literal("water_tank_overflow"),
    params: z.object({
      inflow_meter_id: z.string(),
      dates: z.array(DateSchema).min(1),
      hours: z.array(HourSchema).min(1),
      extra_lph: z.number().positive(),
    }),
  }),
  faultBase.extend({
    kind: z.literal("waste_bad_segregation"),
    params: z.object({
      block: BlockCodeSchema,
      end_ts: TsSchema,
      checks: z.number().int().positive(),
      p_correct: Probability,
      p_correct_after_fix: Probability,
      commonest_mistake: z.object({
        category: WasteCategorySchema,
        chosen_bin: BinSchema,
      }),
    }),
  }),
]);
export type FaultSpec = z.infer<typeof FaultSpecSchema>;

export const DiffuseSpecSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("diffuse_elec"),
    blocks: z.array(BlockCodeSchema).min(1),
    rate_per_meter_night: Probability,
    kw_range: z.tuple([z.number().positive(), z.number().positive()]),
    hours_range: z.tuple([z.number().int().min(1), z.number().int().max(24)]),
    calibrated: z.boolean(),
    note: z.string().optional(),
  }),
  z.object({
    kind: z.literal("diffuse_leak"),
    meter_id: z.string(),
    extra_lph: z.number().positive(),
    start_ts: TsSchema,
    calibrated: z.boolean(),
    note: z.string().optional(),
  }),
]);
export type DiffuseSpec = z.infer<typeof DiffuseSpecSchema>;

export const FaultScriptSchema = z.object({
  notes: z.array(z.string()).default([]),
  faults: z.array(FaultSpecSchema),
  diffuse: z.array(DiffuseSpecSchema),
});
export type FaultScript = z.infer<typeof FaultScriptSchema>;

// ── Loaders ─────────────────────────────────────────────────────────────

function readJson(file: string): unknown {
  return JSON.parse(
    readFileSync(path.join(process.cwd(), "config", file), "utf8"),
  );
}

export function loadCampusConfig(): CampusConfig {
  return CampusConfigSchema.parse(readJson("campus.config.json"));
}

export function loadFaultScript(): FaultScript {
  return FaultScriptSchema.parse(readJson("faults.json"));
}

// ── Meter derivation ────────────────────────────────────────────────────

export interface MeterDef {
  id: string;
  resource: MeterResource;
  unit: MeterUnit;
  /** Code of the location the meter sits on (room, floor or block). */
  location_code: string;
  block: BlockCode;
}

/**
 * Naming rules: E-<room or floor code>, W-<block code>, T-<block code>.
 * Electricity meters = every room + every floor flagged `meter`.
 * Order: electricity (block order), then water, then tank sensors.
 */
export function deriveMeters(cfg: CampusConfig): MeterDef[] {
  const electricity: MeterDef[] = [];
  const water: MeterDef[] = [];
  const tanks: MeterDef[] = [];

  for (const block of cfg.blocks) {
    for (const floor of block.floors) {
      if (floor.meter) {
        electricity.push({
          id: `E-${floor.code}`,
          resource: "electricity",
          unit: "kW",
          location_code: floor.code,
          block: block.code,
        });
      }
    }
    for (const room of block.rooms) {
      electricity.push({
        id: `E-${room.code}`,
        resource: "electricity",
        unit: "kW",
        location_code: room.code,
        block: block.code,
      });
    }
    water.push({
      id: `W-${block.code}`,
      resource: "water",
      unit: "L/h",
      location_code: block.code,
      block: block.code,
    });
    if (block.tank) {
      tanks.push({
        id: `T-${block.code}`,
        resource: "tank_level",
        unit: "percent",
        location_code: block.code,
        block: block.code,
      });
    }
  }
  return [...electricity, ...water, ...tanks];
}
