import { NextResponse } from "next/server";

/** The one error shape used by every route handler. */
export function jsonError(status: number, code: string, message: string) {
  return NextResponse.json({ error: { code, message } }, { status });
}
