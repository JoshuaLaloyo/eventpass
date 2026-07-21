import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonError, handleRouteError, REFUND_POLICY_TEXT } from "@/lib/utils";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const event = await prisma.event.findUnique({ where: { id: params.id }, include: { ticketTypes: true } });
    if (!event || event.status !== "PUBLISHED") return jsonError(404, "NOT_FOUND", "Event not found");
    return NextResponse.json({
      event: {
        id: event.id,
        title: event.title,
        venue: event.venue,
        date: event.date,
        description: event.description,
        posterUrl: event.posterUrl,
        refundPolicyText: REFUND_POLICY_TEXT[event.refundPolicy],
        ticketTypes: event.ticketTypes.map((t) => ({
          id: t.id,
          name: t.name,
          price: t.price,
          remaining: t.quantity - t.quantitySold,
        })),
      },
    });
  } catch (e) {
    return handleRouteError(e);
  }
}
