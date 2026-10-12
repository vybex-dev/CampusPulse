import { NextResponse } from "next/server";
import { buildWhatIfSnapshot } from "@/lib/impact";
import { jsonError } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const snapshot = buildWhatIfSnapshot();
    return NextResponse.json(snapshot);
  } catch (err) {
    console.error("[GET /api/whatif/snapshot]", err);
    return jsonError(500, "INTERNAL_ERROR", "Failed to build What-If snapshot");
  }
}
