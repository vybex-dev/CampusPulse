import { NextRequest, NextResponse } from "next/server";
import {
  getTicketDetail,
  updateTicket,
  TicketValidationError,
  TicketStateError,
} from "@/lib/analytics/tickets";
import { PatchTicketBodySchema, RoleSchema } from "@/lib/contract";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const ticketId = parseInt(id, 10);
  if (isNaN(ticketId)) {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "id must be an integer" } },
      { status: 400 },
    );
  }

  try {
    const detail = getTicketDetail(ticketId);
    if (!detail) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: `Ticket ${ticketId} not found` } },
        { status: 404 },
      );
    }
    return NextResponse.json(detail);
  } catch (err) {
    console.error("[GET /api/tickets/[id]]", err);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to load ticket" } },
      { status: 500 },
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const ticketId = parseInt(id, 10);
  if (isNaN(ticketId)) {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "id must be an integer" } },
      { status: 400 },
    );
  }

  try {
    const body = await req.json().catch(() => null);
    const parsed = PatchTicketBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "BAD_REQUEST", message: parsed.error.issues[0]?.message ?? "Invalid body" } },
        { status: 400 },
      );
    }

    const rawRole = req.headers.get("x-role") ?? "staff";
    const roleResult = RoleSchema.safeParse(rawRole);
    const actorRole = roleResult.success ? roleResult.data : "staff";

    const updated = updateTicket(ticketId, parsed.data, actorRole);
    return NextResponse.json(updated);
  } catch (err) {
    if (err instanceof TicketStateError) {
      return NextResponse.json(
        { error: { code: "INVALID_TRANSITION", message: err.message } },
        { status: 409 },
      );
    }
    if (err instanceof TicketValidationError) {
      const isNotFound = err.message.includes("not found");
      return NextResponse.json(
        { error: { code: isNotFound ? "NOT_FOUND" : "VALIDATION_ERROR", message: err.message } },
        { status: isNotFound ? 404 : 400 },
      );
    }
    console.error("[PATCH /api/tickets/[id]]", err);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to update ticket" } },
      { status: 500 },
    );
  }
}
