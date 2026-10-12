import { NextResponse } from "next/server";
import { computeCampusScore, computeBlockSeverity, getTopWasters } from "@/lib/impact";
import { syncAndGetAnomalies } from "@/lib/analytics/tickets";
import { getDemoState } from "@/lib/sim/clock";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const clock = getDemoState().clock;
    const anomalies = syncAndGetAnomalies();
    const score = computeCampusScore();
    const blockSeverity = computeBlockSeverity(anomalies);
    const topWasters = getTopWasters(anomalies);

    return NextResponse.json({
      clock,
      score,
      block_severity: blockSeverity,
      top_wasters: topWasters,
      active_anomaly_count: anomalies.filter((a) => a.status === "active").length,
      simulated: true,
    });
  } catch (err) {
    console.error("[GET /api/campus]", err);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to build campus overview" } },
      { status: 500 },
    );
  }
}
