import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { handleRouteError } from "@/lib/utils";

export async function GET() {
  try {
    await requireRole("ADMIN");
    const [payments, events] = await Promise.all([
      prisma.payment.aggregate({ where: { status: "SUCCESSFUL" }, _sum: { amount: true, commissionAmount: true } }),
      prisma.event.findMany({ include: { ticketTypes: true, orders: { include: { payment: true } } }, orderBy: { createdAt: "desc" } }),
    ]);
    const totalTicketsSold = await prisma.ticket.count({ where: { order: { paymentStatus: "PAID" } } });
    return NextResponse.json({
      totalTicketsSold,
      grossRevenue: payments._sum.amount || 0,
      totalCommission: payments._sum.commissionAmount || 0,
      events: events.map((e) => ({
        id: e.id,
        title: e.title,
        status: e.status,
        sold: e.ticketTypes.reduce((a, t) => a + t.quantitySold, 0),
        commission: e.orders.reduce((a, o) => a + (o.payment?.status === "SUCCESSFUL" ? o.payment.commissionAmount : 0), 0),
      })),
    });
  } catch (e) {
    return handleRouteError(e);
  }
}
