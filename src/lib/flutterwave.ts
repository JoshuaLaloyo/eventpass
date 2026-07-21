import { appUrl } from "@/lib/utils";

const FLW_BASE = "https://api.flutterwave.com/v3";

function secretKey() {
  const key = process.env.FLW_SECRET_KEY;
  if (!key) throw { status: 500, code: "PAYMENTS_NOT_CONFIGURED", message: "FLW_SECRET_KEY is not set" };
  return key;
}

/** Create a hosted Flutterwave payment page for an order. Returns the checkout link. */
export async function createFlutterwavePayment(order: {
  id: string;
  totalAmount: number;
  phone?: string | null;
  customerEmail: string;
  customerName: string;
  eventTitle: string;
}): Promise<string> {
  const res = await fetch(`${FLW_BASE}/payments`, {
    method: "POST",
    headers: { Authorization: `Bearer ${secretKey()}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      tx_ref: order.id, // order id is the transaction reference
      amount: order.totalAmount,
      currency: "UGX",
      redirect_url: `${appUrl()}/orders/${order.id}/result`,
      payment_options: "mobilemoneyuganda,card",
      customer: { email: order.customerEmail, name: order.customerName, phonenumber: order.phone || undefined },
      customizations: { title: "EventPass", description: `Tickets — ${order.eventTitle}` },
    }),
  });
  const data = await res.json();
  if (!res.ok || data.status !== "success" || !data.data?.link) {
    console.error("Flutterwave payment creation failed:", data);
    throw { status: 502, code: "PROCESSOR_ERROR", message: "Could not start the payment. Try again." };
  }
  return data.data.link as string;
}

/**
 * Verify a transaction with Flutterwave. Returns the verified charge when it is
 * successful AND matches the expected order (tx_ref, amount, currency).
 */
export async function verifyFlutterwaveTransaction(transactionId: string, expected: { orderId: string; amount: number }) {
  const res = await fetch(`${FLW_BASE}/transactions/${transactionId}/verify`, {
    headers: { Authorization: `Bearer ${secretKey()}` },
  });
  const data = await res.json();
  const d = data?.data;
  const ok =
    res.ok &&
    data.status === "success" &&
    d?.status === "successful" &&
    d?.tx_ref === expected.orderId &&
    d?.currency === "UGX" &&
    Number(d?.amount) >= expected.amount;
  if (!ok) return null;
  const paymentType = String(d.payment_type || "");
  const method = paymentType.includes("mobilemoney")
    ? (String(d.narration || "").toLowerCase().includes("airtel") ? "AIRTEL_MONEY" : "MTN_MOMO")
    : "CARD";
  return { processorRef: String(d.flw_ref || d.id), method: method as "MTN_MOMO" | "AIRTEL_MONEY" | "CARD" };
}
