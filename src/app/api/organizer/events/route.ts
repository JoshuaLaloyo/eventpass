import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { jsonError, handleRouteError } from "@/lib/utils";

export async function POST(req: NextRequest) {
  try {
    const user = await requireRole("ORGANIZER");
    const body = await req.json();
    const title = String(body.title || "").trim();
    const venue = String(body.venue || "").trim();
    const date = new Date(body.date);
    const description = String(body.description || "");
    const posterUrl = body.posterUrl ? String(body.posterUrl) : null;
    const refundPolicy = ["NO_REFUNDS", "UP_TO_7_DAYS", "UP_TO_24_HOURS", "ONLY_IF_CANCELLED"].includes(body.refundPolicy)
      ? body.refundPolicy
      : "NO_REFUNDS";

    if (!title || !venue) return jsonError(400, "VALIDATION", "Title and venue are required");
    if (isNaN(date.getTime()) || date.getTime() <= Date.now()) return jsonError(400, "VALIDATION", "Event date must be in the future");

    const event = await prisma.event.create({
      data: { organizerId: user.id, title, venue, date, description, posterUrl, refundPolicy },
    });
    return NextResponse.json({ event }, { status: 201 });
  } catch (e) {
    return handleRouteError(e);
  }
}

export async function GET() {
  try {
    const user = await requireRole("ORGANIZER");
    const events = await prisma.event.findMany({
      where: { organizerId: user.id },
      orderBy: { createdAt: "desc" },
      include: { ticketTypes: true },
    });
    return NextResponse.json({
      events: events.map((e) => ({
        id: e.id,
        title: e.title,
        venue: e.venue,
        date: e.date,
        status: e.status,
        sold: e.ticketTypes.reduce((a, t) => a + t.quantitySold, 0),
        capacity: e.ticketTypes.reduce((a, t) => a + t.quantity, 0),
      })),
    });
  } catch (e) {
    return handleRouteError(e);
  }
}
