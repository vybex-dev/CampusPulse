import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getDemoState } from "@/lib/sim/clock";
import { getSettings } from "@/lib/settings";
import { computeAfterHoursSharePerBlock } from "@/lib/analytics/electricity";
import type { DetectorLocation, DetectorMeter, DetectorReading } from "@/lib/analytics/anomalies";
import { jsonError } from "@/lib/http";
import { getCachedOrCompute } from "@/lib/cache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = getCachedOrCompute("electricity:blocks", () => {
      const db = getDb();
      const clock = getDemoState().clock;
      const settings = getSettings(db);

      const readings = db.prepare("SELECT meter_id, ts, value FROM reading").all() as DetectorReading[];
      const meters = db.prepare("SELECT id, location_id, resource, unit FROM meter").all() as DetectorMeter[];
      const locations = db.prepare("SELECT id, parent_id, kind, code, name, room_type, population FROM location").all() as DetectorLocation[];
      const timetable = db.prepare("SELECT location_id, weekday, hour, scheduled, label FROM timetable_slot").all() as {
        location_id: number;
        weekday: number;
        hour: number;
        scheduled: number;
        label: string | null;
      }[];

      return computeAfterHoursSharePerBlock({
        readings,
        meters,
        locations,
        timetable,
        clock,
        settings,
      });
    });

    return NextResponse.json(data);
  } catch (err) {
    console.error("[GET /api/electricity/blocks]", err);
    return jsonError(500, "INTERNAL_ERROR", "Failed to get electricity block breakdown");
  }
}
