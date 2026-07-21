import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { jsonError, handleRouteError, paymentProvider } from "@/lib/utils";
import { verifyFlutterwaveTransaction } from "@/lib/flutterwave";
import { fulfillOrder } from "@/lib/fulfill";

// Fallback used by the payment-result page when Flutterwave redirects back with
// a transaction_id, in case the webhook has not arrived yet. Same server-side
// verification, same idempotent fulfillment.
export async function POST(req: NextRequest) {
  try {
    if (paymentProvider() !== "flutterwave") return jsonError(404, "NOT_FOUND", "Not applicable in mock mode");
    const user = await requireRole("CUSTOMER");
    const { orderId, transactionId } = await req.json();

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) return jsonError(404, "NOT_FOUND", "Order not found");
    if (order.userId !== user.id) return jsonError(403, "NOT_OWNER", "This is not your order");
    if (order.paymentStatus === "PAID") return NextResponse.json({ ok: true });

    const verified = await verifyFlutterwaveTransaction(String(transactionId), { orderId: order.id, amount: order.totalAmount });
    if (!verified) return jsonError(409, "NOT_VERIFIED", "Payment is not confirmed yet");
    const result = await fulfillOrder(order.id, verified.processorRef, verified.method);
    if (!result.ok) return jsonError(409, result.reason, "Payment could not be completed");
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleRouteError(e);
  }
}
