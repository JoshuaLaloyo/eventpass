import { NextRequest, NextResponse } from "next/server";
import { getPublishedEvent } from "@/lib/events";
import { jsonError, handleRouteError, REFUND_POLICY_TEXT } from "@/lib/utils";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const event = await getPublishedEvent(params.id);
    if (!event) return jsonError(404, "NOT_FOUND", "Event not found");
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
