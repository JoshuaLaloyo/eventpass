import { prisma } from "@/lib/prisma";
import { splitAmounts } from "@/lib/utils";
import { sendTicketEmail } from "@/lib/email";
import type { PaymentMethod } from "@prisma/client";

/**
 * Idempotently fulfill a paid order:
 *  - guard inventory (quantitySold can never exceed quantity)
 *  - record the Payment with commission split (plan §5.3)
 *  - mark the Order PAID and issue Tickets with fresh QR UUIDs
 *  - email the PDF ticket(s), best-effort
 *
 * Called by the payment webhook, the redirect verifier, and mock payments.
 */
export async function fulfillOrder(orderId: string, processorRef: string, method: PaymentMethod) {
  const result = await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: orderId }, include: { ticketType: true } });
    if (!order) return { ok: false as const, reason: "ORDER_NOT_FOUND" };
    if (order.paymentStatus === "PAID") return { ok: true as const, already: true }; // idempotent

    // Duplicate webhook with a different ref while a payment row exists
    const existing = await tx.payment.findUnique({ where: { orderId } });
    if (existing?.status === "SUCCESSFUL") return { ok: true as const, already: true };

    // Inventory guard — atomic, race-safe
    const updated: number = await tx.$executeRaw`
      UPDATE "TicketType"
      SET "quantitySold" = "quantitySold" + ${order.quantity}
      WHERE id = ${order.ticketTypeId}
        AND "quantitySold" + ${order.quantity} <= quantity
    `;
    if (updated === 0) {
      await tx.order.update({ where: { id: orderId }, data: { paymentStatus: "FAILED" } });
      return { ok: false as const, reason: "SOLD_OUT_AT_PAYMENT" };
    }

    const { commissionAmount, organizerPayoutAmount } = splitAmounts(order.totalAmount);
    await tx.payment.upsert({
      where: { orderId },
      update: { status: "SUCCESSFUL", processorRef, method },
      create: {
        orderId,
        amount: order.totalAmount,
        processorRef,
        method,
        commissionAmount,
        organizerPayoutAmount,
        status: "SUCCESSFUL",
      },
    });

    await tx.order.update({ where: { id: orderId }, data: { paymentStatus: "PAID" } });

    await tx.ticket.createMany({
      data: Array.from({ length: order.quantity }, () => ({
        orderId,
        ticketTypeId: order.ticketTypeId,
      })),
    });

    return { ok: true as const, already: false };
  });

  if (result.ok && !("already" in result && result.already)) {
    sendTicketEmail(orderId).catch((e) => console.error("ticket email failed:", e));
  }
  return result;
}

export async function failOrder(orderId: string, processorRef: string, method: PaymentMethod) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order || order.paymentStatus === "PAID") return;
  await prisma.order.update({ where: { id: orderId }, data: { paymentStatus: "FAILED" } });
  await prisma.payment.upsert({
    where: { orderId },
    update: { status: "FAILED" },
    create: {
      orderId,
      amount: order.totalAmount,
      processorRef,
      method,
      commissionAmount: 0,
      organizerPayoutAmount: 0,
      status: "FAILED",
    },
  });
}
