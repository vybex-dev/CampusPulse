import { NextResponse } from "next/server";
import { syncAndGetAnomalies } from "@/lib/analytics/tickets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const anomalies = syncAndGetAnomalies();
    return NextResponse.json(anomalies);
  } catch (err) {
    console.error("[GET /api/anomalies]", err);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to load anomalies" } },
      { status: 500 },
    );
  }
}
