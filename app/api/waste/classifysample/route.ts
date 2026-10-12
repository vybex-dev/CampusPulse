import { type NextRequest, NextResponse } from "next/server";
import { jsonError } from "@/lib/http";
import { classifyWithSample, SAMPLE_ITEMS } from "@/lib/ai/samples";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BodySchema = z.object({
  sample_id: z.string().min(1),
});

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError(400, "INVALID_JSON", "Expected JSON body with sample_id");
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(400, "VALIDATION_ERROR", parsed.error.message);
  }

  const matched = SAMPLE_ITEMS.find((s) => s.id === parsed.data.sample_id);
  if (!matched) {
    return jsonError(
      404,
      "SAMPLE_NOT_FOUND",
      `Sample with id '${parsed.data.sample_id}' was not found`,
    );
  }

  const res = classifyWithSample(undefined, undefined, matched.id);

  return NextResponse.json({
    classification: res.classification,
    provider: "sample",
    cached: false,
    thumb: res.sample.thumb,
    sample_id: res.sample.id,
  });
}
