import { NextRequest, NextResponse } from "next/server";
import {
  getTickets,
  createTicket,
  TicketValidationError,
} from "@/lib/analytics/tickets";
import {
  CreateTicketBodySchema,
  RoleSchema,
  type TicketStatus,
  type Resource,
} from "@/lib/contract";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const status = sp.get("status") ?? undefined;
    const resource = sp.get("resource") ?? undefined;

    const tickets = getTickets({
      status: status ? (status as TicketStatus) : undefined,
      resource: resource ? (resource as Resource) : undefined,
    });
    return NextResponse.json(tickets);
  } catch (err) {
    console.error("[GET /api/tickets]", err);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to load tickets" } },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const parsed = CreateTicketBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "BAD_REQUEST", message: parsed.error.issues[0]?.message ?? "Invalid body" } },
        { status: 400 },
      );
    }

    const rawRole = req.headers.get("x-role") ?? "staff";
    const roleResult = RoleSchema.safeParse(rawRole);
    const actorRole = roleResult.success ? roleResult.data : "staff";

    const { ticket, isExisting } = createTicket(parsed.data.anomaly_id, actorRole);
    return NextResponse.json(ticket, { status: isExisting ? 200 : 201 });
  } catch (err) {
    if (err instanceof TicketValidationError) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: err.message } },
        { status: 404 },
      );
    }
    console.error("[POST /api/tickets]", err);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to create ticket" } },
      { status: 500 },
    );
  }
}
