/**
 * Weekly recurring timetable schedule generator for academic rooms.
 * Schedule rules:
 * - Mon-Fri (weekdays 0-4): 09:00 - 17:00, lunch 13:00 - 14:00 (closed)
 *   Teaching hours: 9, 10, 11, 12, 14, 15, 16.
 * - Saturday (weekday 5): 09:00 - 13:00 (hours 9, 10, 11, 12)
 * - Sunday (weekday 6): closed
 * - Classrooms: ~70% scheduled on weekday slots, ~50% on Saturday slots
 * - Labs: ~50% scheduled on weekday and Saturday slots
 * - Library & Office: fixed Mon-Sat 09:00 - 19:00 (hours 9 to 18)
 */
import type { CampusConfig } from "../config";
import { mulberry32, hashSeed } from "./rng";

export interface TimetableSlotRow {
  location_id: number;
  weekday: number; // 0 = Mon ... 6 = Sun
  hour: number;    // 0 ... 23
  scheduled: number; // 0 or 1
  label: string | null;
}

/**
 * Generates a 168-element boolean array (7 days * 24 hours) for a room.
 * Index = weekday * 24 + hour.
 */
export function generateRoomWeeklySchedule(
  roomCode: string,
  roomType: string,
  seed: number,
): { scheduled: boolean[]; labels: (string | null)[] } {
  const scheduled = new Array<boolean>(168).fill(false);
  const labels = new Array<string | null>(168).fill(null);

  const rng = mulberry32(hashSeed(seed, roomCode, "timetable"));

  for (let weekday = 0; weekday < 7; weekday++) {
    for (let hour = 0; hour < 24; hour++) {
      const idx = weekday * 24 + hour;

      if (weekday === 6) {
        // Sunday: closed
        scheduled[idx] = false;
        labels[idx] = null;
        continue;
      }

      if (roomType === "classroom") {
        if (weekday < 5 && ((hour >= 9 && hour < 13) || (hour >= 14 && hour < 17))) {
          if (rng() < 0.70) {
            scheduled[idx] = true;
            labels[idx] = "Lecture";
          }
        } else if (weekday === 5 && hour >= 9 && hour < 13) {
          if (rng() < 0.50) {
            scheduled[idx] = true;
            labels[idx] = "Class";
          }
        }
      } else if (roomType === "lab") {
        if (weekday < 5 && ((hour >= 9 && hour < 13) || (hour >= 14 && hour < 17))) {
          if (rng() < 0.50) {
            scheduled[idx] = true;
            labels[idx] = "Lab Practical";
          }
        } else if (weekday === 5 && hour >= 9 && hour < 13) {
          if (rng() < 0.50) {
            scheduled[idx] = true;
            labels[idx] = "Lab Practical";
          }
        }
      } else if (roomType === "library_room") {
        if (weekday <= 5 && hour >= 9 && hour < 19) {
          scheduled[idx] = true;
          labels[idx] = "Reading Hours";
        }
      } else if (roomType === "office") {
        if (weekday <= 5 && hour >= 9 && hour < 19) {
          scheduled[idx] = true;
          labels[idx] = "Office Hours";
        }
      }
    }
  }

  return { scheduled, labels };
}

/**
 * Builds all rows to insert into `timetable_slot` table.
 */
export function generateAllTimetableSlots(
  cfg: CampusConfig,
  locationMap: Map<string, number>,
  seed: number,
): TimetableSlotRow[] {
  const rows: TimetableSlotRow[] = [];

  for (const block of cfg.blocks) {
    for (const room of block.rooms) {
      const locId = locationMap.get(room.code);
      if (locId === undefined) continue;

      const { scheduled, labels } = generateRoomWeeklySchedule(
        room.code,
        room.type,
        seed,
      );

      for (let weekday = 0; weekday < 7; weekday++) {
        for (let hour = 0; hour < 24; hour++) {
          const idx = weekday * 24 + hour;
          rows.push({
            location_id: locId,
            weekday,
            hour,
            scheduled: scheduled[idx] ? 1 : 0,
            label: labels[idx],
          });
        }
      }
    }
  }

  return rows;
}
