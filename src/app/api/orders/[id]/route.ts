import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { jsonError, handleRouteError } from "@/lib/utils";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireRole("CUSTOMER", "ADMIN");
    const order = await prisma.order.findUnique({
      where: { id: params.id },
      include: { event: true, ticketType: true, tickets: true },
    });
    if (!order) return jsonError(404, "NOT_FOUND", "Order not found");
    if (order.userId !== user.id && user.role !== "ADMIN") return jsonError(403, "NOT_OWNER", "This is not your order");

    return NextResponse.json({
      order: {
        id: order.id,
        paymentStatus: order.paymentStatus,
        totalAmount: order.totalAmount,
        quantity: order.quantity,
        eventTitle: order.event.title,
        ticketTypeName: order.ticketType.name,
      },
      tickets: order.tickets.map((t) => ({ id: t.id, status: t.status, qrCodeUuid: t.qrCodeUuid })),
    });
  } catch (e) {
    return handleRouteError(e);
  }
}
