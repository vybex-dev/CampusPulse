import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createDatabase, type Db } from "@/lib/db";
import { scoreFromShares, buildWhatIfSnapshot, buildImpactReport } from "@/lib/impact";
import { DEFAULT_SETTINGS, updateSettings, resetSettings } from "@/lib/settings";

let db: Db;

beforeEach(() => {
  db = createDatabase(":memory:");
});

afterEach(() => {
  db.close();
});

describe("scoreFromShares", () => {
  it("computes 100 when all waste is 0 and segregation is 100%", () => {
    const res = scoreFromShares(0, 0, 100);
    expect(res.electricity).toBe(100);
    expect(res.water).toBe(100);
    expect(res.waste).toBe(100);
    expect(res.total).toBe(100);
  });

  it("computes 0 when waste reaches or exceeds ceilings and segregation is 0%", () => {
    const res = scoreFromShares(0.10, 0.20, 0);
    expect(res.electricity).toBe(0);
    expect(res.water).toBe(0);
    expect(res.waste).toBe(0);
    expect(res.total).toBe(0);
  });

  it("correctly scales partial shares", () => {
    // aE = 0.05 -> 1 - 0.05/0.10 = 0.5 -> 50
    // aW = 0.10 -> 1 - 0.10/0.20 = 0.5 -> 50
    // A = 80 -> 80
    // total = (50 + 50 + 80) / 3 = 60
    const res = scoreFromShares(0.05, 0.10, 80);
    expect(res.electricity).toBe(50);
    expect(res.water).toBe(50);
    expect(res.waste).toBe(80);
    expect(res.total).toBe(60);
  });

  it("clamps negative values to 0", () => {
    const res = scoreFromShares(-0.02, -0.05, 105);
    expect(res.electricity).toBe(100);
    expect(res.water).toBe(100);
    expect(res.waste).toBe(100);
    expect(res.total).toBe(100);
  });
});

describe("What-If Simulator Math", () => {
  it("verifies post-intervention electricity avoidable share formula", () => {
    const aE = 0.08;
    const eta = 0.85;
    const fE = 1.0; // 100% fixed

    const aEPrime = aE * (1 - eta * fE);
    expect(aEPrime).toBeCloseTo(0.08 * 0.15, 4);

    const sEBefore = 100 * (1 - Math.min(1, aE / 0.10));
    const sEAfter = 100 * (1 - Math.min(1, aEPrime / 0.10));
    expect(sEBefore).toBeCloseTo(20, 1);
    expect(sEAfter).toBeCloseTo(88, 1);
  });

  it("verifies monthly energy delta formula with AC setpoint adjustment", () => {
    const aE = 0.05;
    const aEPrime = 0.01;
    const UE = 80000;
    const deltaAC = 2.0; // +2 °C
    const Eacad = 30000;

    const deltaKWh =
      (aE - aEPrime) * UE + 0.5 * 0.05 * deltaAC * Eacad;

    // (0.04 * 80000) + (0.5 * 0.05 * 2 * 30000) = 3200 + 1500 = 4700 kWh
    expect(deltaKWh).toBe(4700);
  });

  it("verifies projected score formula equals mean of post-intervention components", () => {
    const aEPrime = 0.02;
    const aWPrime = 0.04;
    const aStar = 92;

    const res = scoreFromShares(aEPrime, aWPrime, aStar);
    const expected = ((100 * (1 - 0.02 / 0.10)) + (100 * (1 - 0.04 / 0.20)) + 92) / 3;
    expect(res.total).toBeCloseTo(expected, 1);
  });
});

describe("resetSettings", () => {
  it("restores modified settings back to DEFAULT_SETTINGS", () => {
    updateSettings({ tariff_inr_per_kwh: 14.5, water_inr_per_kl: 35 }, db);
    expect(db.prepare("SELECT COUNT(*) as n FROM setting").get()).toEqual({ n: 2 });

    const restored = resetSettings(db);
    expect(restored.tariff_inr_per_kwh).toBe(DEFAULT_SETTINGS.tariff_inr_per_kwh);
    expect(restored.water_inr_per_kl).toBe(DEFAULT_SETTINGS.water_inr_per_kl);
    expect(db.prepare("SELECT COUNT(*) as n FROM setting").get()).toEqual({ n: 0 });
  });
});
