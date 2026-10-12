import { NextResponse } from "next/server";
import { FastForwardBodySchema } from "@/lib/contract";
import { jsonError } from "@/lib/http";
import { advanceDays, getDemoState } from "@/lib/sim/clock";
import { invalidateCache } from "@/lib/cache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const parsed = FastForwardBodySchema.safeParse(
    await req.json().catch(() => null),
  );
  if (!parsed.success) {
    return jsonError(400, "validation", "days must be 1 or 7");
  }
  advanceDays(parsed.data.days);
  invalidateCache();
  return NextResponse.json(getDemoState());
}
