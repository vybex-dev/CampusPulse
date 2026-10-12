import { NextResponse } from "next/server";
import { getDemoState } from "@/lib/sim/clock";
import { resetCampus } from "@/lib/sim/reset";
import { invalidateCache } from "@/lib/cache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  resetCampus();
  invalidateCache();
  return NextResponse.json(getDemoState());
}
