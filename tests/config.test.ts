import { describe, expect, it } from "vitest";
import {
  deriveMeters,
  loadCampusConfig,
  loadFaultScript,
  type FaultSpec,
} from "@/lib/config";
import { BLOCK_CODES } from "@/lib/contract";

const cfg = loadCampusConfig();
const script = loadFaultScript();
const meters = deriveMeters(cfg);
const block = (code: string) => cfg.blocks.find((b) => b.code === code)!;

function story<K extends FaultSpec["kind"]>(code: string, kind: K) {
  const fault = script.faults.find((f) => f.story_code === code);
  if (!fault || fault.kind !== kind)
    throw new Error(`${code} is missing or is not ${kind}`);
  return fault as Extract<FaultSpec, { kind: K }>;
}

describe("campus config", () => {
  it("has the six blocks with the exact codes, in order", () => {
    expect(cfg.blocks.map((b) => b.code)).toEqual([...BLOCK_CODES]);
  });

  it("derives 51 electricity meters, 6 water meters and 2 tank sensors", () => {
    expect(meters.filter((m) => m.resource === "electricity")).toHaveLength(51);
    expect(meters.filter((m) => m.resource === "water")).toHaveLength(6);
    expect(meters.filter((m) => m.resource === "tank_level")).toHaveLength(2);
  });

  it("splits electricity meters per block as specified", () => {
    const per = (b: string) =>
      meters.filter((m) => m.resource === "electricity" && m.block === b)
        .length;
    expect(per("AB-A")).toBe(20);
    expect(per("AB-B")).toBe(14);
    expect(per("LIB")).toBe(8);
    expect(per("HST-1")).toBe(4);
    expect(per("HST-2")).toBe(4);
    expect(per("MESS")).toBe(1);
  });

  it("follows the meter naming convention with unique ids", () => {
    const ids = meters.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const m of meters) {
      const prefix =
        m.resource === "electricity"
          ? "E-"
          : m.resource === "water"
            ? "W-"
            : "T-";
      expect(m.id.startsWith(prefix)).toBe(true);
    }
    expect(
      meters.filter((m) => m.resource === "tank_level").map((m) => m.id),
    ).toEqual(["T-AB-B", "T-HST-1"]);
    for (const id of [
      "E-A-204",
      "E-A-L3",
      "E-HST1-F1",
      "E-HST2-F4",
      "E-MESS1",
      "W-HST-1",
      "W-AB-A",
    ]) {
      expect(ids).toContain(id);
    }
  });

  it("has 14 classrooms and 6 labs in AB-A, 10 and 4 in AB-B", () => {
    const count = (b: string, type: string) =>
      block(b).rooms.filter((r) => r.type === type).length;
    expect(count("AB-A", "classroom")).toBe(14);
    expect(count("AB-A", "lab")).toBe(6);
    expect(count("AB-B", "classroom")).toBe(10);
    expect(count("AB-B", "lab")).toBe(4);
  });

  it("gives Hall A-204 3.4 kW and Lab A-L3 3.6 kW with 40 PCs", () => {
    const rooms = block("AB-A").rooms;
    expect(rooms.find((r) => r.code === "A-204")?.occupied_kw).toBe(3.4);
    expect(rooms.find((r) => r.code === "A-L3")).toMatchObject({
      occupied_kw: 3.6,
      pcs: 40,
    });
  });

  it("has unique location codes and every room sits on a declared floor", () => {
    const codes = [cfg.campus.code];
    for (const b of cfg.blocks) {
      codes.push(
        b.code,
        ...b.floors.map((f) => f.code),
        ...b.rooms.map((r) => r.code),
      );
      const levels = new Set(b.floors.map((f) => f.level));
      for (const r of b.rooms) expect(levels.has(r.floor)).toBe(true);
    }
    expect(new Set(codes).size).toBe(codes.length);
  });

  it("matches the campus profile", () => {
    expect(
      block("HST-1").population.count + block("HST-2").population.count,
    ).toBe(cfg.campus.hostel_residents);
    const daily = cfg.blocks
      .filter((b) => b.population.unit === "daily_users")
      .reduce((n, b) => n + b.population.count, 0);
    expect(daily).toBe(cfg.campus.students_daily);
    expect(block("MESS").population).toEqual({ count: 1600, unit: "meals" });
    expect(block("MESS").weekly_bin_mass_kg).toBe(190);
    expect(block("HST-1").per_capita_target_l).toBe(120);
    expect(block("HST-1").water.baseline_night_lph).toBe(120);
  });
});

describe("fault script", () => {
  it("holds ST-1 to ST-6 in order", () => {
    expect(script.faults.map((f) => f.story_code)).toEqual([
      "ST-1",
      "ST-2",
      "ST-3",
      "ST-4",
      "ST-5",
      "ST-6",
    ]);
  });

  it("only references meters that exist", () => {
    const ids = new Set(meters.map((m) => m.id));
    for (const f of script.faults) {
      if (f.meter_id) expect(ids.has(f.meter_id)).toBe(true);
      if (f.kind === "elec_afterhours_excess")
        for (const id of f.params.meter_ids) expect(ids.has(id)).toBe(true);
      if (f.kind === "water_tank_overflow")
        expect(ids.has(f.params.inflow_meter_id)).toBe(true);
    }
    for (const d of script.diffuse)
      if (d.kind === "diffuse_leak") expect(ids.has(d.meter_id)).toBe(true);
  });

  it("ST-1: 13.4 kWh per evening, about Rs 76 a day", () => {
    const f = story("ST-1", "elec_hold");
    const hall = block("AB-A").rooms.find((r) => r.code === "A-204")!;
    const standby = cfg.room_types.classroom.standby_kw;
    const perEvening = f.params.hours.length * (f.params.level_kw - standby);
    expect(f.params.level_kw).toBe(hall.occupied_kw);
    expect(f.params.dates).toHaveLength(5);
    expect(perEvening).toBeCloseTo(13.4, 5);
    expect(perEvening * 8).toBeCloseTo(107.2, 1);
    expect(Math.abs(((5 * perEvening) / 7) * 8 - 76)).toBeLessThan(1);
  });

  it("ST-2: about 160 kWh per weekend, about Rs 186 a day", () => {
    const f = story("ST-2", "elec_hold");
    const perWeekend = 48 * (f.params.level_kw - cfg.room_types.lab.standby_kw);
    expect(f.params.dates).toHaveLength(4);
    expect(perWeekend).toBeGreaterThan(150);
    expect(perWeekend).toBeLessThan(170);
    expect(Math.abs((perWeekend / 7) * 8 - 186)).toBeLessThan(1);
  });

  it("ST-3: 800 L/h is 19.2 kL a day, Rs 384, 152 L per resident (127% of target)", () => {
    const f = story("ST-3", "water_const_leak");
    const kl = (f.params.extra_lph * 24) / 1000;
    const hostel = block("HST-1");
    const perCapita =
      cfg.water.hostel.litres_per_resident_per_day +
      (kl * 1000) / hostel.population.count;
    expect(kl).toBeCloseTo(19.2, 5);
    expect(kl * 20).toBeCloseTo(384, 5);
    expect(perCapita).toBeCloseTo(152, 5);
    expect(perCapita / hostel.per_capita_target_l).toBeCloseTo(1.27, 2);
    expect(hostel.water.baseline_night_lph + f.params.extra_lph).toBe(920);
  });

  it("ST-4: 3 kL a morning, about Rs 43 a day", () => {
    const f = story("ST-4", "water_tank_overflow");
    const perMorning = (f.params.hours.length * f.params.extra_lph) / 1000;
    expect(perMorning).toBe(3);
    expect(f.params.dates).toHaveLength(5);
    expect(Math.abs(((5 * perMorning) / 7) * 20 - 43)).toBeLessThan(1);
  });

  it("ST-5: about 60 kg a week misrouted; pooled campus accuracy is about 72%", () => {
    const f = story("ST-5", "waste_bad_segregation");
    const peer = cfg.waste.peer_p_correct;
    const misrouted =
      (peer - f.params.p_correct) * block("MESS").weekly_bin_mass_kg;
    expect(Math.abs(misrouted - 60)).toBeLessThan(1);

    const peers = cfg.blocks.filter((b) => b.code !== "MESS");
    const checks =
      peers.reduce((n, b) => n + b.bin_checks_per_week, 0) +
      block("MESS").bin_checks_per_week;
    const correct =
      peers.reduce((n, b) => n + b.bin_checks_per_week * peer, 0) +
      f.params.checks * f.params.p_correct;
    expect(correct / checks).toBeCloseTo(0.72, 3);
  });

  it("ST-6: 396 kWh, Rs 3,168, 285 kg CO2e, 38% lower, pre-seeded as Verified", () => {
    const f = story("ST-6", "elec_afterhours_excess");
    const s = f.preseed!.savings;
    expect(f.params.hours).toHaveLength(14);
    expect(f.params.meter_ids).toHaveLength(14);
    expect(Math.abs(f.params.extra_kw_total * 14 * 7 - 396)).toBeLessThan(1);
    expect(s.expected_units - s.actual_units).toBe(s.saved_units);
    expect(s.saved_units / s.expected_units).toBeCloseTo(0.38, 2);
    expect(s.saved_inr).toBe(s.saved_units * 8);
    expect(Math.abs(s.saved_co2e_kg - 285)).toBeLessThan(1);
    expect(f.active).toBe(false);
    expect(f.fixed_at).toBe(s.window_start);
  });
});
