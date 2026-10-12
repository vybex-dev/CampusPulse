import { getDb, tx, type Db } from "./db";
import {
  SettingsObjectSchema,
  SettingsSchema,
  type Settings,
} from "./contract";

/** Every default lives in the Zod schema in contract.ts; this is just its parsed form. */
export const DEFAULT_SETTINGS: Settings = SettingsSchema.parse({});

export type DeepPartial<T> = T extends readonly unknown[]
  ? T
  : T extends object
    ? { [K in keyof T]?: DeepPartial<T[K]> }
    : T;
export type SettingsPatch = DeepPartial<Settings>;

const KNOWN_KEYS = Object.keys(SettingsObjectSchema.shape);
const KNOWN_KEY_SET = new Set(KNOWN_KEYS);

/** Reserved raw keys (outside the Settings schema) used by the simulator. */
export const SIM_CLOCK_KEY = "sim_clock";
export const SIM_SEED_KEY = "sim_seed";

/**
 * Defaults overlaid with whatever is stored in the `setting` table.
 * Each key holds a JSON value. A corrupt store falls back to defaults with a warning,
 * so a bad row can never blank the demo.
 */
export function getSettings(db: Db = getDb()): Settings {
  const rows = db.prepare("SELECT key, value FROM setting").all() as {
    key: string;
    value: string;
  }[];
  const stored: Record<string, unknown> = {};
  for (const row of rows) {
    if (!KNOWN_KEY_SET.has(row.key)) continue; // raw keys such as sim_clock
    try {
      stored[row.key] = JSON.parse(row.value);
    } catch {
      console.warn(`settings: ignoring unparseable value for "${row.key}"`);
    }
  }
  const parsed = SettingsSchema.safeParse(stored);
  if (!parsed.success) {
    console.warn(
      "settings: stored values are invalid, using defaults",
      parsed.error.issues,
    );
    return DEFAULT_SETTINGS;
  }
  return parsed.data;
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function deepMerge(base: unknown, patch: unknown): unknown {
  if (!isPlainObject(base) || !isPlainObject(patch)) return patch;
  const out: Record<string, unknown> = { ...base };
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) continue;
    out[key] = deepMerge(base[key], value);
  }
  return out;
}

/**
 * Deep-merge `patch` into the current settings, validate the whole result, and store only
 * the top-level keys the patch touched (so untouched keys keep following code defaults).
 * Throws a ZodError for unknown keys or invalid values; nothing is written in that case.
 * The caller (PUT /api/settings) must invalidate cached analytics afterwards.
 */
export function updateSettings(
  patch: SettingsPatch,
  db: Db = getDb(),
): Settings {
  return tx((d) => {
    const merged = deepMerge(getSettings(d), patch);
    const next = SettingsSchema.parse(merged); // strict: unknown keys are rejected
    const upsert = d.prepare(
      "INSERT INTO setting (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
    );
    for (const key of Object.keys(patch)) {
      upsert.run(key, JSON.stringify(next[key as keyof Settings]));
    }
    return next;
  }, db);
}

/**
 * Restores user settings to DEFAULT_SETTINGS by removing all schema keys from `setting` table,
 * preserving internal simulator keys (sim_clock, sim_seed).
 */
export function resetSettings(db: Db = getDb()): Settings {
  return tx((d) => {
    d.prepare(
      "DELETE FROM setting WHERE key NOT IN (?, ?)",
    ).run(SIM_CLOCK_KEY, SIM_SEED_KEY);
    return DEFAULT_SETTINGS;
  }, db);
}

export function getRawSetting(key: string, db: Db = getDb()): string | null {
  const row = db.prepare("SELECT value FROM setting WHERE key = ?").get(key) as
    | { value: string }
    | undefined;
  return row?.value ?? null;
}

export function setRawSetting(
  key: string,
  value: string,
  db: Db = getDb(),
): void {
  db.prepare(
    "INSERT INTO setting (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
  ).run(key, value);
}
