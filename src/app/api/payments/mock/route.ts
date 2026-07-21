import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { jsonError, handleRouteError, paymentProvider } from "@/lib/utils";
import { fulfillOrder, failOrder } from "@/lib/fulfill";

// Simulates the payment processor in local/sandbox testing (PAYMENT_PROVIDER=mock).
export async function POST(req: NextRequest) {
  try {
    if (paymentProvider() !== "mock") return jsonError(404, "NOT_FOUND", "Mock payments are disabled");
    const user = await requireRole("CUSTOMER");
    const { orderId, outcome } = await req.json();

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) return jsonError(404, "NOT_FOUND", "Order not found");
    if (order.userId !== user.id) return jsonError(403, "NOT_OWNER", "This is not your order");

    const ref = `MOCK-${orderId}`;
    if (outcome === "success") {
      const result = await fulfillOrder(orderId, ref, "MOCK");
      if (!result.ok) return jsonError(409, result.reason, "Payment could not be completed");
      return NextResponse.json({ ok: true });
    }
    await failOrder(orderId, ref, "MOCK");
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleRouteError(e);
  }
}
