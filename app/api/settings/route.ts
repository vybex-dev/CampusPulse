import { NextRequest, NextResponse } from "next/server";
import { getSettings, updateSettings, resetSettings } from "@/lib/settings";
import { invalidateCache } from "@/lib/cache";
import { jsonError } from "@/lib/http";
import { ZodError } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const settings = getSettings();
    return NextResponse.json(settings);
  } catch (err) {
    console.error("[GET /api/settings]", err);
    return jsonError(500, "INTERNAL_ERROR", "Failed to get settings");
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return jsonError(400, "BAD_REQUEST", "Body must be a valid JSON object");
    }

    if (body.reset === true) {
      const reset = resetSettings();
      invalidateCache();
      return NextResponse.json(reset);
    }

    const updated = updateSettings(body);
    invalidateCache();
    return NextResponse.json(updated);
  } catch (err) {
    if (err instanceof ZodError) {
      return jsonError(400, "VALIDATION_ERROR", err.issues[0]?.message ?? "Invalid settings");
    }
    console.error("[PUT /api/settings]", err);
    return jsonError(500, "INTERNAL_ERROR", "Failed to update settings");
  }
}

export async function DELETE() {
  try {
    const reset = resetSettings();
    invalidateCache();
    return NextResponse.json(reset);
  } catch (err) {
    console.error("[DELETE /api/settings]", err);
    return jsonError(500, "INTERNAL_ERROR", "Failed to reset settings");
  }
}
