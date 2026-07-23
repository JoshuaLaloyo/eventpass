import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, requireOwnedEvent } from "@/lib/auth";
import { jsonError, handleRouteError } from "@/lib/utils";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireRole("ORGANIZER");
    const event = await requireOwnedEvent(user, params.id);

    const body = await req.json();
    const name = String(body.name || "").trim();
    const price = Math.round(Number(body.price));
    const quantity = Math.round(Number(body.quantity));
    if (!name) return jsonError(400, "VALIDATION", "Ticket type name is required");
    if (!(price >= 0)) return jsonError(400, "VALIDATION", "Price must be 0 or more (UGX)");
    if (!(quantity > 0)) return jsonError(400, "VALIDATION", "Quantity must be at least 1");

    const ticketType = await prisma.ticketType.create({ data: { eventId: event.id, name, price, quantity } });
    return NextResponse.json({ ticketType }, { status: 201 });
  } catch (e) {
    return handleRouteError(e);
  }
}
