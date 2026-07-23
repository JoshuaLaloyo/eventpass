import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, requireOwnedEvent } from "@/lib/auth";
import { jsonError, handleRouteError } from "@/lib/utils";

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireRole("ORGANIZER");
    const event = await requireOwnedEvent(user, params.id);
    if (event.ticketTypes.length === 0) return jsonError(409, "NO_TICKET_TYPES", "Add at least one ticket type before publishing");

    const updated = await prisma.event.update({ where: { id: event.id }, data: { status: "PUBLISHED" } });
    return NextResponse.json({ event: updated });
  } catch (e) {
    return handleRouteError(e);
  }
}
