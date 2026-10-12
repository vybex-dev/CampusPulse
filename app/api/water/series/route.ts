import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getDemoState } from "@/lib/sim/clock";
import { jsonError } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const meterId = sp.get("meter_id");
    const blockCode = sp.get("block");
    const range = parseInt(sp.get("range") ?? "7", 10);
    const days = isNaN(range) || range <= 7 ? 7 : 30;

    const clock = getDemoState().clock;
    const clockMs = new Date(`${clock}:00Z`).getTime();
    const startMs = clockMs - days * 86400000;
    const startTs = new Date(startMs).toISOString().slice(0, 16);

    const db = getDb();

    if (meterId) {
      // Query specific water or tank level meter
      const meterRow = db.prepare("SELECT unit, resource FROM meter WHERE id = ?").get(meterId) as {
        unit: string;
        resource: string;
      } | undefined;

      const rows = db.prepare(`
        SELECT r.ts, r.value
        FROM reading r
        WHERE r.meter_id = ? AND r.ts >= ? AND r.ts <= ?
        ORDER BY r.ts ASC
      `).all(meterId, startTs, clock) as { ts: string; value: number }[];

      return NextResponse.json({
        meter_id: meterId,
        resource: meterRow?.resource ?? "water",
        unit: meterRow?.unit ?? "L/h",
        from: startTs,
        to: clock,
        series: rows,
      });
    }

    if (blockCode) {
      // Query hourly aggregate for a specific block's flow meters (resource = 'water')
      const rows = db.prepare(`
        SELECT r.ts, ROUND(SUM(r.value), 1) as value
        FROM reading r
        JOIN meter m ON m.id = r.meter_id
        JOIN location l ON l.id = m.location_id
        WHERE m.resource = 'water'
          AND (l.code = ? OR l.code LIKE (? || '%') OR l.parent_id IN (SELECT id FROM location WHERE code = ?))
          AND r.ts >= ? AND r.ts <= ?
        GROUP BY r.ts
        ORDER BY r.ts ASC
      `).all(blockCode, blockCode, blockCode, startTs, clock) as { ts: string; value: number }[];

      return NextResponse.json({
        block: blockCode,
        resource: "water",
        unit: "L/h",
        from: startTs,
        to: clock,
        series: rows,
      });
    }

    // Campus-wide water flow aggregate
    const rows = db.prepare(`
      SELECT r.ts, ROUND(SUM(r.value), 1) as value
      FROM reading r
      JOIN meter m ON m.id = r.meter_id
      WHERE m.resource = 'water' AND r.ts >= ? AND r.ts <= ?
      GROUP BY r.ts
      ORDER BY r.ts ASC
    `).all(startTs, clock) as { ts: string; value: number }[];

    return NextResponse.json({
      resource: "water",
      unit: "L/h",
      from: startTs,
      to: clock,
      series: rows,
    });
  } catch (err) {
    console.error("[GET /api/water/series]", err);
    return jsonError(500, "INTERNAL_ERROR", "Failed to get water series");
  }
}
