import { type NextRequest, NextResponse } from "next/server";
import { jsonError } from "@/lib/http";
import { getDb } from "@/lib/db";
import { getDemoState } from "@/lib/sim/clock";
import { getSettings } from "@/lib/settings";
import { CATEGORY_TABLE } from "@/lib/ai/classify";
import { computeScanPoints } from "@/lib/analytics/waste";
import {
  BlockCodeSchema,
  WasteCategorySchema,
  WasteModeSchema,
  WasteSourceSchema,
  ProviderSchema,
  BinSchema,
  type WasteLog,
} from "@/lib/contract";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CreateWasteLogBodySchema = z.object({
  block_id: BlockCodeSchema,
  mode: WasteModeSchema,
  category: WasteCategorySchema,
  item_name: z.string().trim().min(1).max(120),
  confidence: z.number().min(0).max(1).default(0.9),
  source: WasteSourceSchema.default("ai"),
  provider: ProviderSchema.default("groq"),
  chosen_bin: BinSchema.nullable().default(null),
  thumb: z.string().nullable().default(null),
});

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError(400, "INVALID_JSON", "Invalid JSON payload");
  }

  const parsed = CreateWasteLogBodySchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(400, "VALIDATION_ERROR", parsed.error.message);
  }

  const data = parsed.data;
  const db = getDb();
  const settings = getSettings(db);

  // Retrieve current simulated time from clock
  const clock = getDemoState().clock;

  // Category parameters from table / settings
  const categoryRule =
    settings.waste_categories?.[data.category] ?? CATEGORY_TABLE[data.category];
  const correctBin = categoryRule?.bin ?? "black";

  let isCorrect: boolean | null = null;
  if (data.mode === "bin_check") {
    isCorrect = data.chosen_bin === correctBin;
  }

  const estWeightKg = categoryRule?.weight_kg ?? 0.1;
  const efFactor = categoryRule?.ef_kg_per_kg ?? 0.5;
  const co2eAvoidedKg = isCorrect ? Number((estWeightKg * efFactor).toFixed(3)) : 0;
  const points = computeScanPoints(data.mode, isCorrect, data.category, settings);

  const isCorrectInt = isCorrect === null ? null : isCorrect ? 1 : 0;

  try {
    const insertStmt = db.prepare(`
      INSERT INTO waste_log (
        ts, block_id, mode, category, item_name, confidence,
        source, provider, chosen_bin, correct_bin, is_correct,
        est_weight_kg, co2e_avoided_kg, points, thumb
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const info = insertStmt.run(
      clock,
      data.block_id,
      data.mode,
      data.category,
      data.item_name,
      data.confidence,
      data.source,
      data.provider,
      data.chosen_bin,
      correctBin,
      isCorrectInt,
      estWeightKg,
      co2eAvoidedKg,
      points,
      data.thumb,
    );

    const created: WasteLog = {
      id: Number(info.lastInsertRowid),
      ts: clock,
      block_id: data.block_id,
      mode: data.mode,
      category: data.category,
      item_name: data.item_name,
      confidence: data.confidence,
      source: data.source,
      provider: data.provider,
      chosen_bin: data.chosen_bin,
      correct_bin: correctBin,
      is_correct: isCorrect,
      est_weight_kg: estWeightKg,
      co2e_avoided_kg: co2eAvoidedKg,
      points,
      thumb: data.thumb,
    };

    return NextResponse.json(created, { status: 201 });
  } catch (err: unknown) {
    console.error("Failed to insert waste log:", err);
    return jsonError(500, "DB_ERROR", "Failed to save waste log to database");
  }
}
