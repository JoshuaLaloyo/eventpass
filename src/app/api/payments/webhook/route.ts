import { NextRequest, NextResponse } from "next/server";
import { jsonError } from "@/lib/utils";
import { verifyFlutterwaveTransaction } from "@/lib/flutterwave";
import { prisma } from "@/lib/prisma";
import { fulfillOrder } from "@/lib/fulfill";

// Flutterwave webhook. Source of truth for payment success.
// Idempotent: fulfillOrder is a no-op when the order is already PAID.
export async function POST(req: NextRequest) {
  const signature = req.headers.get("verif-hash");
  if (!process.env.FLW_SECRET_HASH || signature !== process.env.FLW_SECRET_HASH) {
    return jsonError(401, "BAD_SIGNATURE", "Invalid webhook signature");
  }

  const payload = await req.json().catch(() => null);
  const txId = payload?.data?.id;
  const txRef = payload?.data?.tx_ref;
  if (!txId || !txRef) return NextResponse.json({ received: true });

  const order = await prisma.order.findUnique({ where: { id: String(txRef) } });
  if (!order) return NextResponse.json({ received: true });

  // Never trust the webhook body alone — re-verify with Flutterwave.
  const verified = await verifyFlutterwaveTransaction(String(txId), { orderId: order.id, amount: order.totalAmount });
  if (verified) {
    await fulfillOrder(order.id, verified.processorRef, verified.method);
  }
  return NextResponse.json({ received: true });
}
