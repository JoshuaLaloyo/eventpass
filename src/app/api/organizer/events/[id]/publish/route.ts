import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { jsonError, handleRouteError } from "@/lib/utils";

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireRole("ORGANIZER");
    const event = await prisma.event.findUnique({ where: { id: params.id }, include: { ticketTypes: true } });
    if (!event) return jsonError(404, "NOT_FOUND", "Event not found");
    if (event.organizerId !== user.id) return jsonError(403, "NOT_OWNER", "This is not your event");
    if (event.ticketTypes.length === 0) return jsonError(409, "NO_TICKET_TYPES", "Add at least one ticket type before publishing");

    const updated = await prisma.event.update({ where: { id: event.id }, data: { status: "PUBLISHED" } });
    return NextResponse.json({ event: updated });
  } catch (e) {
    return handleRouteError(e);
  }
}
