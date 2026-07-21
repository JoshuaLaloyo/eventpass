import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { jsonError, handleRouteError } from "@/lib/utils";
import { buildTicketsPdf } from "@/lib/ticketPdf";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireRole("CUSTOMER", "ADMIN");
    const ticket = await prisma.ticket.findUnique({
      where: { id: params.id },
      include: { order: { include: { user: true } }, ticketType: { include: { event: true } } },
    });
    if (!ticket) return jsonError(404, "NOT_FOUND", "Ticket not found");
    if (ticket.order.userId !== user.id && user.role !== "ADMIN") return jsonError(403, "NOT_OWNER", "This is not your ticket");

    const pdf = await buildTicketsPdf([
      {
        eventTitle: ticket.ticketType.event.title,
        venue: ticket.ticketType.event.venue,
        date: ticket.ticketType.event.date,
        ticketTypeName: ticket.ticketType.name,
        price: ticket.ticketType.price,
        attendeeName: ticket.order.user.name,
        qrCodeUuid: ticket.qrCodeUuid,
        ticketId: ticket.id,
      },
    ]);
    return new Response(Buffer.from(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="EventPass-ticket-${ticket.id.slice(0, 8)}.pdf"`,
      },
    });
  } catch (e) {
    return handleRouteError(e);
  }
}
