import { NextRequest, NextResponse } from "next/server";
import { buildSummary } from "@/lib/impact";
import { RangeSchema, ResourceTabSchema } from "@/lib/contract";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const rawRange = sp.get("range") ?? "7";
    const rawResource = sp.get("resource") ?? "all";

    const rangeResult = RangeSchema.safeParse(parseInt(rawRange, 10));
    if (!rangeResult.success) {
      return NextResponse.json(
        { error: { code: "BAD_REQUEST", message: "range must be 7 or 30" } },
        { status: 400 },
      );
    }
    const resourceResult = ResourceTabSchema.safeParse(rawResource);
    if (!resourceResult.success) {
      return NextResponse.json(
        { error: { code: "BAD_REQUEST", message: "resource must be all | electricity | water | waste" } },
        { status: 400 },
      );
    }

    const summary = buildSummary(rangeResult.data, resourceResult.data);
    return NextResponse.json(summary);
  } catch (err) {
    console.error("[GET /api/summary]", err);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to build summary" } },
      { status: 500 },
    );
  }
}
