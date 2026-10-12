/**
 * Full database reset and initial 30-day deterministic data generation.
 * Executes in one SQLite transaction for sub-5 second performance.
 */
import { resetDb, tx, type Db } from "../db";
import {
  loadCampusConfig,
  loadFaultScript,
  deriveMeters,
} from "../config";
import { generateAllTimetableSlots } from "./timetable";
import {
  generateMeterDayReadings,
  generateDayWasteLogs,
} from "./generator";
import { resetClock, SIM_START } from "./clock";

export interface ResetResult {
  clock: string;
  seed: number;
  locationsCount: number;
  metersCount: number;
  timetableSlotsCount: number;
  readingsCount: number;
  wasteLogsCount: number;
  durationMs: number;
}

/**
 * Resets the database and populates all tables with 30 days of deterministic simulated history.
 */
export function resetCampus(seed = Number(process.env.SIM_SEED ?? 42)): ResetResult {
  const startTime = Date.now();
  resetClock();

  const cfg = loadCampusConfig();
  const faultScript = loadFaultScript();
  const meters = deriveMeters(cfg);

  const db = resetDb();

  return tx((dbInstance: Db) => {
    // 1. Populate Locations
    const locMap = new Map<string, number>(); // code -> location id

    const insertLoc = dbInstance.prepare(`
      INSERT INTO location (id, parent_id, kind, code, name, room_type, population)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    let locId = 1;

    // Campus
    insertLoc.run(locId, null, "campus", cfg.campus.code, cfg.campus.name, null, cfg.campus.students_daily);
    locMap.set(cfg.campus.code, locId);
    const campusId = locId++;

    // Blocks, Floors, Rooms
    for (const block of cfg.blocks) {
      const blockId = locId++;
      insertLoc.run(blockId, campusId, "block", block.code, block.name, null, block.population.count);
      locMap.set(block.code, blockId);

      const floorMap = new Map<number, number>(); // level -> floorId
      for (const floor of block.floors) {
        const floorLocId = locId++;
        insertLoc.run(
          floorLocId,
          blockId,
          "floor",
          floor.code,
          `${block.code} Floor ${floor.level}`,
          floor.room_type ?? null,
          null,
        );
        locMap.set(floor.code, floorLocId);
        floorMap.set(floor.level, floorLocId);
      }

      for (const room of block.rooms) {
        const roomLocId = locId++;
        const parentFloorId = floorMap.get(room.floor) ?? blockId;
        const roomName =
          room.name ??
          (room.type === "classroom"
            ? `Room ${room.code}`
            : room.type === "lab"
              ? `Lab ${room.code}`
              : room.code);

        insertLoc.run(roomLocId, parentFloorId, "room", room.code, roomName, room.type, null);
        locMap.set(room.code, roomLocId);
      }
    }

    // 2. Populate Meters
    const insertMeter = dbInstance.prepare(`
      INSERT INTO meter (id, location_id, resource, unit)
      VALUES (?, ?, ?, ?)
    `);

    for (const m of meters) {
      const lId = locMap.get(m.location_code)!;
      insertMeter.run(m.id, lId, m.resource, m.unit);
    }

    // 3. Populate Timetable Slots
    const timetableRows = generateAllTimetableSlots(cfg, locMap, seed);
    const insertSlot = dbInstance.prepare(`
      INSERT INTO timetable_slot (location_id, weekday, hour, scheduled, label)
      VALUES (?, ?, ?, ?, ?)
    `);

    for (const slot of timetableRows) {
      insertSlot.run(slot.location_id, slot.weekday, slot.hour, slot.scheduled, slot.label);
    }

    // Build in-memory timetable lookup per room code: Array(168) of boolean
    const timetableLookup = new Map<string, boolean[]>();
    for (const block of cfg.blocks) {
      for (const room of block.rooms) {
        const lId = locMap.get(room.code);
        if (lId === undefined) continue;
        const slots = timetableRows.filter((s) => s.location_id === lId);
        const schedArr = new Array<boolean>(168).fill(false);
        for (const s of slots) {
          schedArr[s.weekday * 24 + s.hour] = s.scheduled === 1;
        }
        timetableLookup.set(room.code, schedArr);
      }
    }

    // 4. Populate Baselines (168 hours per meter)
    const insertBaseline = dbInstance.prepare(`
      INSERT INTO baseline (meter_id, hour_of_week, expected, tolerance, computed_at)
      VALUES (?, ?, ?, ?, ?)
    `);

    const computedAt = cfg.model.history_start;
    for (const m of meters) {
      for (let how = 0; how < 168; how++) {
        const weekday = Math.floor(how / 24);
        const hour = how % 24;

        let expected = 1.0;
        let tolerance = 0.3;

        if (m.resource === "electricity") {
          if (m.id.startsWith("E-HST")) {
            const curve = cfg.curves.hostel_floor;
            const isPeak =
              (hour >= curve.peak_hours[0][0] && hour < curve.peak_hours[0][1]) ||
              (hour >= curve.peak_hours[1][0] && hour < curve.peak_hours[1][1]);
            const isNight = hour >= 23 || hour < 6;
            expected = isPeak ? curve.peak_kw : isNight ? curve.baseline_kw : (curve.baseline_kw + curve.peak_kw) / 2;
            tolerance = expected * 0.25;
          } else if (m.id.startsWith("E-MESS")) {
            const curve = cfg.curves.mess;
            const isPeak = curve.peak_hours.some(([start, end]) => hour >= start && hour < end);
            expected = isPeak ? curve.peak_kw : curve.base_kw;
            tolerance = expected * 0.25;
          } else {
            const sched = timetableLookup.get(m.location_code);
            const isSched = sched ? sched[how] : false;
            let pOcc = 1.8;
            let pStb = 0.05;
            for (const blk of cfg.blocks) {
              const rm = blk.rooms.find((r) => r.code === m.location_code);
              if (rm) {
                const rtConfig = (cfg.room_types as Record<string, { occupied_kw: number; standby_kw: number }>)[rm.type];
                pOcc = rm.occupied_kw ?? rtConfig?.occupied_kw ?? 1.8;
                pStb = rtConfig?.standby_kw ?? 0.05;
                break;
              }
            }
            expected = isSched ? pOcc : pStb;
            tolerance = Math.max(0.15, expected * 0.25);
          }
        } else if (m.resource === "water") {
          const blk = cfg.blocks.find((b) => b.code === m.block)!;
          if (blk.type === "hostel") {
            const total = blk.population.count * blk.per_capita_target_l;
            if ((hour >= 5 && hour < 8) || (hour >= 18 && hour < 21)) {
              expected = (total * 0.60) / 6;
            } else if (hour >= 23 || hour < 5) {
              expected = blk.water.baseline_night_lph;
            } else {
              expected = (total - total * 0.60 - blk.water.baseline_night_lph * 6) / 12;
            }
          } else if (blk.type === "mess") {
            const total = blk.population.count * blk.per_capita_target_l;
            const isMeal = (hour >= 7 && hour < 9) || (hour >= 12 && hour < 14) || (hour >= 19 && hour < 21);
            expected = isMeal ? (total * 0.85) / 6 : (total * 0.15) / 18;
          } else {
            if (weekday < 5 && hour >= 9 && hour < 17) {
              expected = blk.water.baseline_night_lph + (blk.population.count * blk.per_capita_target_l) / 8;
            } else if (weekday === 5 && hour >= 9 && hour < 13) {
              expected = blk.water.baseline_night_lph + (blk.population.count * blk.per_capita_target_l * 0.5) / 4;
            } else {
              expected = blk.water.baseline_night_lph;
            }
          }
          tolerance = Math.max(50, expected * 0.25);
        } else if (m.resource === "tank_level") {
          expected = hour >= 4 && hour < 8 ? 92 : 65;
          tolerance = 15;
        }

        insertBaseline.run(
          m.id,
          how,
          Number(expected.toFixed(3)),
          Number(tolerance.toFixed(3)),
          computedAt,
        );
      }
    }

    // 5. Populate Faults
    const insertFault = dbInstance.prepare(`
      INSERT INTO fault (id, story_code, meter_id, kind, params_json, start_ts, active, fixed_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    let faultId = 1;
    for (const f of faultScript.faults) {
      insertFault.run(
        faultId++,
        f.story_code,
        f.meter_id,
        f.kind,
        JSON.stringify(f.params),
        f.start_ts,
        f.active ? 1 : 0,
        f.fixed_at,
      );
    }

    // 6. Generate 30 Days of History (Sat 12 Sep 2026 to Sun 11 Oct 2026)
    const startDate = new Date("2026-09-12T00:00:00Z");
    const historyDays = cfg.model.history_days; // 30

    const insertReading = dbInstance.prepare(`
      INSERT INTO reading (meter_id, ts, value)
      VALUES (?, ?, ?)
    `);

    const insertWasteLog = dbInstance.prepare(`
      INSERT INTO waste_log (
        ts, block_id, mode, category, item_name, confidence,
        source, provider, chosen_bin, correct_bin, is_correct,
        est_weight_kg, co2e_avoided_kg, points, thumb
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    let totalReadings = 0;
    let totalWasteLogs = 0;

    for (let dayIndex = 0; dayIndex < historyDays; dayIndex++) {
      const curDate = new Date(startDate.getTime() + dayIndex * 86400000);
      const dateStr = curDate.toISOString().slice(0, 10);
      const jsDay = curDate.getUTCDay();
      const campusWeekday = (jsDay + 6) % 7; // 0 = Mon ... 6 = Sun

      // Readings for all 59 meters
      for (const meter of meters) {
        const readings = generateMeterDayReadings(
          meter,
          dateStr,
          dayIndex,
          campusWeekday,
          seed,
          cfg,
          timetableLookup,
          faultScript,
        );

        for (let i = 0; i < 24; i++) {
          insertReading.run(readings[i].meter_id, readings[i].ts, readings[i].value);
          totalReadings++;
        }
      }

      // Waste logs
      const wasteLogs = generateDayWasteLogs(dateStr, seed, cfg, faultScript);
      for (const log of wasteLogs) {
        insertWasteLog.run(
          log.ts,
          log.block_id,
          log.mode,
          log.category,
          log.item_name,
          log.confidence,
          log.source,
          log.provider,
          log.chosen_bin,
          log.correct_bin,
          log.is_correct,
          log.est_weight_kg,
          log.co2e_avoided_kg,
          log.points,
          log.thumb,
        );
        totalWasteLogs++;
      }
    }

    // 7. Seed ST-6 Anomaly, Verified Ticket, Events & Verified Savings
    const st6Fault = faultScript.faults.find((f) => f.story_code === "ST-6");
    if (st6Fault && st6Fault.preseed) {
      const blockBLocId = locMap.get("AB-B")!;

      const insertAnomaly = dbInstance.prepare(`
        INSERT INTO anomaly (
          id, type, resource, location_id, meter_id, start_ts, end_ts,
          status, priority, confidence, occurrences, excess_value, unit,
          cost_inr, daily_cost_inr, co2e_kg, explanation, evidence_json
        ) VALUES (
          1, 'elec_band_excess', 'electricity', ?, null, '2026-09-12T00:00', '2026-09-30T00:00',
          'cleared', 'high', 'high', 14, 396, 'kWh',
          3168, 452.57, 285.12, 'Block B after-hours schedule held 4.04 kW excess across 14 meters overnight.',
          '{"meters": 14, "hours_per_day": 14}'
        )
      `);
      insertAnomaly.run(blockBLocId);

      const ticketPre = st6Fault.preseed.ticket;
      const insertTicket = dbInstance.prepare(`
        INSERT INTO ticket (
          id, anomaly_id, title, status, priority, team,
          created_at, resolved_at, verified_at, resolve_note
        ) VALUES (
          1, 1, ?, 'verified', ?, ?,
          ?, ?, ?, ?
        )
      `);
      insertTicket.run(
        ticketPre.title,
        ticketPre.priority,
        ticketPre.team,
        ticketPre.created_at,
        ticketPre.resolved_at,
        ticketPre.verified_at,
        ticketPre.resolve_note,
      );

      const insertEvent = dbInstance.prepare(`
        INSERT INTO ticket_event (ticket_id, ts, actor_role, event, note)
        VALUES (?, ?, ?, ?, ?)
      `);
      insertEvent.run(1, ticketPre.created_at, "system", "created", "Automated detector flagged excess load");
      insertEvent.run(1, ticketPre.resolved_at, "staff", "resolved", ticketPre.resolve_note);
      insertEvent.run(1, ticketPre.verified_at, "system", "verified", "Counterfactual verified 396 kWh saved");

      const sav = st6Fault.preseed.savings;
      const insertSavings = dbInstance.prepare(`
        INSERT INTO savings (
          ticket_id, window_start, window_end, expected_units,
          actual_units, saved_units, saved_inr, saved_co2e_kg
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      insertSavings.run(
        1,
        sav.window_start,
        sav.window_end,
        sav.expected_units,
        sav.actual_units,
        sav.saved_units,
        sav.saved_inr,
        sav.saved_co2e_kg,
      );
    }

    const durationMs = Date.now() - startTime;

    return {
      clock: SIM_START,
      seed,
      locationsCount: locId - 1,
      metersCount: meters.length,
      timetableSlotsCount: timetableRows.length,
      readingsCount: totalReadings,
      wasteLogsCount: totalWasteLogs,
      durationMs,
    };
  }, db);
}
