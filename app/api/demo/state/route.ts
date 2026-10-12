import { NextResponse } from "next/server";
import { getDemoState } from "@/lib/sim/clock";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(getDemoState());
}
