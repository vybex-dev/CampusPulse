/**
 * Deterministic generation engine for CampusPulse.
 * Simulates electricity, water, tank level, and waste checks.
 * Uses typed arrays and deterministic mulberry32 PRNG streams per meter-day.
 */
import type { CampusConfig, MeterDef } from "../config";
import { createRng, normalRandom } from "./rng";
import {
  applyElectricityFaults,
  applyWaterFaults,
  applyTankFaults,
  getWasteFaultContext,
  type ActiveFaultContext,
} from "./faults";

export interface ReadingRow {
  meter_id: string;
  ts: string;
  value: number;
}

export interface WasteLogRow {
  ts: string;
  block_id: string;
  mode: "bin_check" | "identify";
  category: string;
  item_name: string;
  confidence: number;
  source: "ai";
  provider: "groq";
  chosen_bin: string;
  correct_bin: string;
  is_correct: number;
  est_weight_kg: number;
  co2e_avoided_kg: number;
  points: number;
  thumb: string | null;
}

/**
 * Normalized seasonal/temperature variation across day d (0-based index from start).
 * tau(d) varies smoothly between -1 and 1.
 */
export function tau(dayIndex: number): number {
  return Math.sin((2 * Math.PI * dayIndex) / 30);
}

const CATEGORY_BINS: Record<string, string> = {
  wet_biodegradable: "green",
  paper_cardboard: "blue",
  plastic: "blue",
  metal_glass: "blue",
  e_waste: "red",
  hazardous: "red",
  other_residual: "black",
};

const CATEGORY_ITEMS: Record<string, string[]> = {
  wet_biodegradable: ["Food scraps", "Banana peel", "Tea leaves", "Apple core", "Vegetable peels"],
  paper_cardboard: ["Cardboard packaging", "Notebook sheets", "Paper bag", "Newspaper"],
  plastic: ["PET bottle", "Plastic cup", "Snack wrapper", "Polythene bag"],
  metal_glass: ["Aluminium beverage can", "Glass bottle", "Tin food container"],
  e_waste: ["Broken USB cable", "AA battery", "Old phone adapter"],
  hazardous: ["Sanitary wipe", "Broken fluorescent tube", "Chemical cleaner bottle"],
  other_residual: ["Thermocol plate", "Ceramic shard", "Dust sweepings"],
};

const CATEGORY_CO2E_FACTORS: Record<string, number> = {
  wet_biodegradable: 0.5,
  paper_cardboard: 1.2,
  plastic: 1.8,
  metal_glass: 2.1,
  e_waste: 3.5,
  hazardous: 1.0,
  other_residual: 0.1,
};

/**
 * Generates 24 hourly readings for a single meter on dateStr (YYYY-MM-DD).
 */
export function generateMeterDayReadings(
  meter: MeterDef,
  dateStr: string,
  dayIndex: number,
  weekday: number, // 0 = Mon ... 6 = Sun
  baseSeed: number,
  cfg: CampusConfig,
  timetableMap: Map<string, boolean[]>,
  script: ActiveFaultContext,
): ReadingRow[] {
  const rng = createRng(baseSeed, meter.id, dateStr);
  const rows: ReadingRow[] = new Array(24);
  const values = new Float64Array(24);

  const tauVal = tau(dayIndex);
  const tempAmp = cfg.model.temperature_amplitude; // 0.15
  const noiseSd = cfg.model.noise_sd; // 0.08

  // Check diffuse elec specification for left-on events
  const diffuseElecSpec = script.diffuse.find((d) => d.kind === "diffuse_elec");
  let leftOnHours = 0;
  let leftOnKw = 0;
  if (
    diffuseElecSpec &&
    diffuseElecSpec.blocks.includes(meter.block) &&
    meter.resource === "electricity" &&
    !meter.id.includes("HST") &&
    !meter.id.includes("MESS")
  ) {
    if (rng() < diffuseElecSpec.rate_per_meter_night) {
      const minH = diffuseElecSpec.hours_range[0];
      const maxH = diffuseElecSpec.hours_range[1];
      leftOnHours = minH + Math.floor(rng() * (maxH - minH + 1));
      const minKw = diffuseElecSpec.kw_range[0];
      const maxKw = diffuseElecSpec.kw_range[1];
      leftOnKw = minKw + rng() * (maxKw - minKw);
    }
  }

  for (let hour = 0; hour < 24; hour++) {
    const hh = String(hour).padStart(2, "0");
    const ts = `${dateStr}T${hh}:00`;
    const eps = normalRandom(rng, 0, noiseSd);
    const noiseFactor = Math.max(0.1, 1 + eps);
    const tempFactor = 1 + tempAmp * tauVal;

    let val = 0;

    if (meter.resource === "electricity") {
      if (meter.id.startsWith("E-HST")) {
        // Hostel floor load
        const curve = cfg.curves.hostel_floor;
        const isPeak =
          (hour >= curve.peak_hours[0][0] && hour < curve.peak_hours[0][1]) ||
          (hour >= curve.peak_hours[1][0] && hour < curve.peak_hours[1][1]);
        const isNight = hour >= 23 || hour < 6;
        const base = isPeak ? curve.peak_kw : isNight ? curve.baseline_kw : (curve.baseline_kw + curve.peak_kw) / 2;
        val = base * tempFactor * noiseFactor;
      } else if (meter.id.startsWith("E-MESS")) {
        // Mess electricity
        const curve = cfg.curves.mess;
        const isPeak = curve.peak_hours.some(([start, end]) => hour >= start && hour < end);
        const base = isPeak ? curve.peak_kw : curve.base_kw;
        val = base * tempFactor * noiseFactor;
      } else {
        // Academic room
        const roomSchedule = timetableMap.get(meter.location_code);
        const schedIdx = weekday * 24 + hour;
        const s = roomSchedule && roomSchedule[schedIdx] ? 1 : 0;

        // Lookup room definition
        let pOccupied = 1.8;
        let pStandby = 0.05;

        for (const blk of cfg.blocks) {
          const rm = blk.rooms.find((r) => r.code === meter.location_code);
          if (rm) {
            const rtConfig = (cfg.room_types as Record<string, { occupied_kw: number; standby_kw: number }>)[rm.type];
            pOccupied = rm.occupied_kw ?? rtConfig?.occupied_kw ?? 1.8;
            pStandby = rtConfig?.standby_kw ?? 0.05;
            break;
          }
        }

        const nominal = pStandby + s * (pOccupied - pStandby);
        val = nominal * tempFactor * noiseFactor;

        // Apply diffuse left-on event if active (starts at 19:00 for leftOnHours)
        if (leftOnHours > 0 && hour >= 19 && hour < 19 + leftOnHours) {
          val += leftOnKw;
        }
      }

      // Apply planted electrical faults (ST-1, ST-2, ST-6)
      val = applyElectricityFaults(meter.id, dateStr, hour, ts, val, script);
      // Floor at zero
      val = Math.max(0.005, Number(val.toFixed(3)));
    } else if (meter.resource === "water") {
      const blk = cfg.blocks.find((b) => b.code === meter.block)!;
      const baseNightLph = blk.water.baseline_night_lph;

      if (blk.type === "hostel") {
        // 120 L/resident/day, peak hours 05-08 and 18-21
        const totalDailyL = blk.population.count * blk.per_capita_target_l;
        const peakTotalL = totalDailyL * 0.60;
        const peakLph = peakTotalL / 6; // 6 peak hours
        const nightLph = baseNightLph;
        const remainingL = totalDailyL - peakTotalL - nightLph * 6; // 6 night hours (00-05)
        const dayOffPeakLph = remainingL / 12; // 12 intermediate hours

        let baseFlow = nightLph;
        if ((hour >= 5 && hour < 8) || (hour >= 18 && hour < 21)) {
          baseFlow = peakLph;
        } else if (hour >= 8 && hour < 18 || hour >= 21 && hour < 23) {
          baseFlow = dayOffPeakLph;
        }

        val = baseFlow * noiseFactor;
      } else if (blk.type === "mess") {
        // 10 L/meal, meal hours 07-09, 12-14, 19-21
        const totalDailyL = blk.population.count * blk.per_capita_target_l;
        const mealHoursTotalL = totalDailyL * 0.85;
        const mealLph = mealHoursTotalL / 6;
        const offPeakLph = (totalDailyL - mealHoursTotalL) / 18;

        const isMeal = (hour >= 7 && hour < 9) || (hour >= 12 && hour < 14) || (hour >= 19 && hour < 21);
        const baseFlow = isMeal ? mealLph : Math.max(baseNightLph, offPeakLph);
        val = baseFlow * noiseFactor;
      } else {
        // Academic block: 20 L/user/day (Mon-Fri 09-17, Sat 09-13, Sun closed)
        const nightLph = baseNightLph;
        let baseFlow = nightLph;

        if (weekday < 5 && hour >= 9 && hour < 17) {
          const totalDailyL = blk.population.count * blk.per_capita_target_l;
          baseFlow = nightLph + (totalDailyL / 8);
        } else if (weekday === 5 && hour >= 9 && hour < 13) {
          const totalDailyL = (blk.population.count * blk.per_capita_target_l) * 0.5;
          baseFlow = nightLph + (totalDailyL / 4);
        }

        val = baseFlow * noiseFactor;
      }

      // Apply water faults (ST-3, ST-4, diffuse leaks)
      val = applyWaterFaults(meter.id, dateStr, hour, ts, val, script);
      val = Math.max(1.0, Math.round(val));
    } else if (meter.resource === "tank_level") {
      // Tank level simulation (percent: 0 to 100)
      // Normal diurnal curve: pump fills between 04:00 and 07:00 up to ~92-95%, usage draws down to ~50%
      let baseLevel = 75;
      if (hour >= 4 && hour < 7) {
        baseLevel = 88 + (hour - 4) * 3; // fills to ~94%
      } else if (hour >= 7 && hour < 11) {
        baseLevel = 90 - (hour - 7) * 4;
      } else if (hour >= 11 && hour < 18) {
        baseLevel = 74 - (hour - 11) * 2;
      } else if (hour >= 18 && hour < 22) {
        baseLevel = 60 - (hour - 18) * 2.5;
      } else {
        baseLevel = 50 + hour * 1.5;
      }

      val = baseLevel * (1 + 0.02 * eps);
      // Apply tank faults (ST-4: held at 100% during overflow)
      val = applyTankFaults(meter.id, dateStr, hour, ts, val, script);
      val = Math.min(100.0, Math.max(0.0, Number(val.toFixed(1))));
    }

    values[hour] = val;
    rows[hour] = {
      meter_id: meter.id,
      ts,
      value: val,
    };
  }

  return rows;
}

/**
 * Generates daily waste log checks for each block on dateStr.
 */
export function generateDayWasteLogs(
  dateStr: string,
  baseSeed: number,
  cfg: CampusConfig,
  script: ActiveFaultContext,
): WasteLogRow[] {
  const logs: WasteLogRow[] = [];

  for (const block of cfg.blocks) {
    const rng = createRng(baseSeed, `WASTE-${block.code}`, dateStr);
    const checksPerDay = Math.round(block.bin_checks_per_week / 7);

    const mix = cfg.waste.category_mix_overrides[block.code] ?? cfg.waste.category_mix;
    const categories = Object.keys(mix);
    const cumProb: number[] = [];
    let sum = 0;
    for (const c of categories) {
      sum += (mix as Record<string, number>)[c];
      cumProb.push(sum);
    }

    const weightPerCheck = Number((block.weekly_bin_mass_kg / block.bin_checks_per_week).toFixed(2));

    for (let i = 0; i < checksPerDay; i++) {
      // Pick hour between 08:00 and 19:00
      const hour = 8 + Math.floor(rng() * 12);
      const minute = Math.floor(rng() * 60);
      const ts = `${dateStr}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;

      // Pick category from mix
      const rCat = rng();
      let cat = categories[categories.length - 1];
      for (let j = 0; j < categories.length; j++) {
        if (rCat <= cumProb[j]) {
          cat = categories[j];
          break;
        }
      }

      const items = CATEGORY_ITEMS[cat] ?? ["Residual waste"];
      const itemName = items[Math.floor(rng() * items.length)];
      const correctBin = CATEGORY_BINS[cat] ?? "black";

      // Accuracy context
      const wasteCtx = getWasteFaultContext(block.code, ts, cfg.waste.peer_p_correct, script);
      const isCorrect = rng() < wasteCtx.pCorrect ? 1 : 0;

      let chosenBin = correctBin;
      if (!isCorrect) {
        if (wasteCtx.forcedMistake && wasteCtx.forcedMistake.category === cat) {
          chosenBin = wasteCtx.forcedMistake.chosenBin;
        } else {
          // Pick wrong bin
          const allBins = ["green", "blue", "red", "black"].filter((b) => b !== correctBin);
          chosenBin = allBins[Math.floor(rng() * allBins.length)];
        }
      }

      const points = isCorrect ? 10 : 0;
      const co2e = isCorrect ? Number((weightPerCheck * (CATEGORY_CO2E_FACTORS[cat] ?? 0.5)).toFixed(3)) : 0;

      logs.push({
        ts,
        block_id: block.code,
        mode: "bin_check",
        category: cat,
        item_name: itemName,
        confidence: Number((0.85 + rng() * 0.12).toFixed(2)),
        source: "ai",
        provider: "groq",
        chosen_bin: chosenBin,
        correct_bin: correctBin,
        is_correct: isCorrect,
        est_weight_kg: weightPerCheck,
        co2e_avoided_kg: co2e,
        points,
        thumb: null,
      });
    }
  }

  return logs;
}
