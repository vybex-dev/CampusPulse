import { type NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import type { WasteLog } from "@/lib/contract";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const blockId = searchParams.get("block_id");
  const mode = searchParams.get("mode");
  const limitParam = parseInt(searchParams.get("limit") ?? "50", 10);
  const offsetParam = parseInt(searchParams.get("offset") ?? "0", 10);

  const limit = Math.min(200, Math.max(1, isNaN(limitParam) ? 50 : limitParam));
  const offset = Math.max(0, isNaN(offsetParam) ? 0 : offsetParam);

  const db = getDb();

  const conditions: string[] = [];
  const params: unknown[] = [];

  if (blockId) {
    conditions.push("block_id = ?");
    params.push(blockId);
  }

  if (mode) {
    conditions.push("mode = ?");
    params.push(mode);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const countRow = db
    .prepare(`SELECT COUNT(*) as count FROM waste_log ${whereClause}`)
    .get(...params) as { count: number };

  const rows = db
    .prepare(
      `SELECT
        id, ts, block_id, mode, category, item_name, confidence,
        source, provider, chosen_bin, correct_bin, is_correct,
        est_weight_kg, co2e_avoided_kg, points, thumb
       FROM waste_log
       ${whereClause}
       ORDER BY ts DESC, id DESC
       LIMIT ? OFFSET ?`,
    )
    .all(...params, limit, offset) as Array<{
    id: number;
    ts: string;
    block_id: string;
    mode: string;
    category: string;
    item_name: string;
    confidence: number;
    source: string;
    provider: string;
    chosen_bin: string | null;
    correct_bin: string | null;
    is_correct: number | null;
    est_weight_kg: number;
    co2e_avoided_kg: number;
    points: number;
    thumb: string | null;
  }>;

  const logs: WasteLog[] = rows.map((r) => ({
    id: r.id,
    ts: r.ts,
    block_id: r.block_id as WasteLog["block_id"],
    mode: r.mode as WasteLog["mode"],
    category: r.category as WasteLog["category"],
    item_name: r.item_name,
    confidence: r.confidence,
    source: r.source as WasteLog["source"],
    provider: r.provider as WasteLog["provider"],
    chosen_bin: (r.chosen_bin as WasteLog["chosen_bin"]) ?? null,
    correct_bin: (r.correct_bin as WasteLog["correct_bin"]) ?? null,
    is_correct: r.is_correct === null ? null : r.is_correct === 1,
    est_weight_kg: r.est_weight_kg,
    co2e_avoided_kg: r.co2e_avoided_kg,
    points: r.points,
    thumb: r.thumb,
  }));

  return NextResponse.json({
    logs,
    total: countRow.count,
    limit,
    offset,
  });
}
