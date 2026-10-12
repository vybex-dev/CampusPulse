import { NextRequest, NextResponse } from "next/server";
import { buildImpactReport } from "@/lib/impact";
import { ReportPeriodSchema } from "@/lib/contract";
import { jsonError } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const rawPeriod = sp.get("period") ?? "7";

    const parsedPeriod = ReportPeriodSchema.safeParse(rawPeriod);
    if (!parsedPeriod.success) {
      return jsonError(400, "BAD_REQUEST", "period must be 7, 30, or all");
    }

    const report = buildImpactReport(parsedPeriod.data);
    return NextResponse.json(report);
  } catch (err) {
    console.error("[GET /api/report]", err);
    return jsonError(500, "INTERNAL_ERROR", "Failed to build impact report");
  }
}
