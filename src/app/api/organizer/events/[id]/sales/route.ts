import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { jsonError, handleRouteError } from "@/lib/utils";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireRole("ORGANIZER");
    const event = await prisma.event.findUnique({ where: { id: params.id }, include: { ticketTypes: true } });
    if (!event) return jsonError(404, "NOT_FOUND", "Event not found");
    if (event.organizerId !== user.id) return jsonError(403, "NOT_OWNER", "This is not your event");

    const payments = await prisma.payment.aggregate({
      where: { status: "SUCCESSFUL", order: { eventId: event.id } },
      _sum: { amount: true },
    });

    return NextResponse.json({
      total: {
        sold: event.ticketTypes.reduce((a, t) => a + t.quantitySold, 0),
        revenue: payments._sum.amount || 0,
      },
      byTicketType: event.ticketTypes.map((t) => ({
        id: t.id,
        name: t.name,
        price: t.price,
        sold: t.quantitySold,
        remaining: t.quantity - t.quantitySold,
      })),
    });
  } catch (e) {
    return handleRouteError(e);
  }
}
