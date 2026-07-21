import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { jsonError, handleRouteError, appUrl, paymentProvider } from "@/lib/utils";
import { createFlutterwavePayment } from "@/lib/flutterwave";

export async function POST(req: NextRequest) {
  try {
    const user = await requireRole("CUSTOMER");
    const body = await req.json();
    const { eventId, ticketTypeId } = body;
    const quantity = Math.round(Number(body.quantity));
    const phone = String(body.phone || "").trim();

    if (!body.policyAccepted) return jsonError(400, "POLICY_NOT_ACCEPTED", "You must acknowledge the refund policy before paying");
    if (!(quantity >= 1 && quantity <= 10)) return jsonError(400, "VALIDATION", "Quantity must be between 1 and 10");

    const ticketType = await prisma.ticketType.findUnique({ where: { id: ticketTypeId }, include: { event: true } });
    if (!ticketType || ticketType.eventId !== eventId || ticketType.event.status !== "PUBLISHED") {
      return jsonError(404, "NOT_FOUND", "Ticket type not found for this event");
    }
    if (ticketType.quantity - ticketType.quantitySold < quantity) {
      return jsonError(409, "SOLD_OUT", "Not enough tickets remaining for this ticket type");
    }

    const order = await prisma.order.create({
      data: {
        userId: user.id,
        eventId,
        ticketTypeId,
        quantity,
        totalAmount: ticketType.price * quantity,
        phone,
        policyAcceptedAt: new Date(),
      },
    });

    let paymentUrl: string;
    if (paymentProvider() === "flutterwave") {
      paymentUrl = await createFlutterwavePayment({
        id: order.id,
        totalAmount: order.totalAmount,
        phone,
        customerEmail: user.email || "customer@eventpass.test",
        customerName: user.name || "Customer",
        eventTitle: ticketType.event.title,
      });
    } else {
      paymentUrl = `${appUrl()}/mock-payment/${order.id}`;
    }

    return NextResponse.json({ orderId: order.id, paymentUrl }, { status: 201 });
  } catch (e) {
    return handleRouteError(e);
  }
}
