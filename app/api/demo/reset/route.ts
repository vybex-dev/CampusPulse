import { NextResponse } from "next/server";
import { getDemoState, resetClock } from "@/lib/sim/clock";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Stub: resets the clock only.
export async function POST() {
  resetClock();
  return NextResponse.json(getDemoState());
}
