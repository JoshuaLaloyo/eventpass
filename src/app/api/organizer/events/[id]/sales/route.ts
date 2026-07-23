import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, requireOwnedEvent } from "@/lib/auth";
import { handleRouteError } from "@/lib/utils";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireRole("ORGANIZER");
    const event = await requireOwnedEvent(user, params.id);

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
