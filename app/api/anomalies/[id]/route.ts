import { NextRequest, NextResponse } from "next/server";
import { syncAndGetAnomalies } from "@/lib/analytics/tickets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const anomalyId = parseInt(id, 10);
  if (isNaN(anomalyId)) {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "id must be an integer" } },
      { status: 400 },
    );
  }

  try {
    const anomalies = syncAndGetAnomalies();
    const anomaly = anomalies.find((a) => a.id === anomalyId);
    if (!anomaly) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: `Anomaly ${anomalyId} not found` } },
        { status: 404 },
      );
    }
    return NextResponse.json(anomaly);
  } catch (err) {
    console.error("[GET /api/anomalies/[id]]", err);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to load anomaly" } },
      { status: 500 },
    );
  }
}
