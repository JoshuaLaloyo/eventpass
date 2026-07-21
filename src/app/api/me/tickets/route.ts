import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { handleRouteError } from "@/lib/utils";

export async function GET() {
  try {
    const user = await requireRole("CUSTOMER");
    const tickets = await prisma.ticket.findMany({
      where: { order: { userId: user.id, paymentStatus: "PAID" } },
      orderBy: { createdAt: "desc" },
      include: { ticketType: { include: { event: true } } },
    });
    return NextResponse.json({
      tickets: tickets.map((t) => ({
        id: t.id,
        status: t.status,
        qrCodeUuid: t.qrCodeUuid,
        ticketType: t.ticketType.name,
        price: t.ticketType.price,
        event: {
          id: t.ticketType.event.id,
          title: t.ticketType.event.title,
          venue: t.ticketType.event.venue,
          date: t.ticketType.event.date,
        },
      })),
    });
  } catch (e) {
    return handleRouteError(e);
  }
}
