import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createDatabase, type Db } from "@/lib/db";
import {
  DEFAULT_SETTINGS,
  SIM_CLOCK_KEY,
  getRawSetting,
  getSettings,
  setRawSetting,
  updateSettings,
} from "@/lib/settings";

let db: Db;
beforeEach(() => {
  db = createDatabase(":memory:");
});
afterEach(() => db.close());

describe("defaults", () => {
  it("match the PRD working defaults", () => {
    const s = getSettings(db);
    expect(s.tariff_inr_per_kwh).toBe(8);
    expect(s.water_inr_per_kl).toBe(20);
    expect(s.ef_grid_kg_per_kwh).toBe(0.72);
    expect(s.ef_water_kg_per_kl).toBe(0.3);
    expect(s.score_ceiling_electricity).toBe(0.1);
    expect(s.score_ceiling_water).toBe(0.2);
    expect(s.fix_effectiveness).toBe(0.85);
    expect(s.priority_high_inr_per_day).toBe(250);
    expect(s.priority_medium_inr_per_day).toBe(50);
    expect(s.kg_co2_per_tree_per_year).toBe(21);
    expect(s.thresholds.elec_min_excess_kw).toBe(0.4);
    expect(s.thresholds.waste_flag_accuracy).toBe(0.6);
    expect(s.waste_categories.e_waste).toEqual({
      bin: "red",
      weight_kg: 0.1,
      ef_kg_per_kg: 2,
      points: 20,
    });
    expect(s.ai_provider_order).toEqual(["groq", "gemini", "sample"]);
  });

  it("DEFAULT_SETTINGS equals an empty store", () => {
    expect(getSettings(db)).toEqual(DEFAULT_SETTINGS);
  });
});

describe("updateSettings", () => {
  it("persists a change and leaves everything else at its default", () => {
    const next = updateSettings({ tariff_inr_per_kwh: 9.5 }, db);
    expect(next.tariff_inr_per_kwh).toBe(9.5);
    expect(getSettings(db).tariff_inr_per_kwh).toBe(9.5);
    expect(getSettings(db).water_inr_per_kl).toBe(20);
    expect(db.prepare("SELECT COUNT(*) AS n FROM setting").get()).toEqual({
      n: 1,
    });
  });

  it("deep-merges nested objects", () => {
    updateSettings({ thresholds: { elec_min_excess_kw: 0.6 } }, db);
    updateSettings({ waste_categories: { plastic: { points: 15 } } }, db);
    const s = getSettings(db);
    expect(s.thresholds.elec_min_excess_kw).toBe(0.6);
    expect(s.thresholds.elec_sigma_multiplier).toBe(4);
    expect(s.waste_categories.plastic).toEqual({
      bin: "blue",
      weight_kg: 0.03,
      ef_kg_per_kg: 1.5,
      points: 15,
    });
  });

  it("rejects unknown keys, invalid values and inconsistent priorities, writing nothing", () => {
    expect(() => updateSettings({ foo: 1 } as never, db)).toThrow();
    expect(() => updateSettings({ tariff_inr_per_kwh: -1 }, db)).toThrow();
    expect(() =>
      updateSettings({ priority_medium_inr_per_day: 300 }, db),
    ).toThrow();
    expect(db.prepare("SELECT COUNT(*) AS n FROM setting").get()).toEqual({
      n: 0,
    });
  });

  it("falls back to defaults when a stored value is corrupt", () => {
    db.prepare(
      `INSERT INTO setting (key, value) VALUES ('tariff_inr_per_kwh', '-5')`,
    ).run();
    expect(getSettings(db)).toEqual(DEFAULT_SETTINGS);
  });
});

describe("raw settings", () => {
  it("stores simulator keys outside the schema without affecting getSettings", () => {
    expect(getRawSetting(SIM_CLOCK_KEY, db)).toBeNull();
    setRawSetting(SIM_CLOCK_KEY, "2026-10-12T00:00", db);
    setRawSetting(SIM_CLOCK_KEY, "2026-10-19T00:00", db);
    expect(getRawSetting(SIM_CLOCK_KEY, db)).toBe("2026-10-19T00:00");
    expect(getSettings(db)).toEqual(DEFAULT_SETTINGS);
  });
});
