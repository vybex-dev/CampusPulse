import { NextResponse } from "next/server";
import { getDemoState } from "@/lib/sim/clock";
import { resetCampus } from "@/lib/sim/reset";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  resetCampus();
  return NextResponse.json(getDemoState());
}
