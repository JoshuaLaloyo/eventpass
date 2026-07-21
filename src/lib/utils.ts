import { NextResponse } from "next/server";

export function jsonError(status: number, code: string, message: string) {
  return NextResponse.json({ error: { code, message } }, { status });
}

export function handleRouteError(e: unknown) {
  const err = e as any;
  if (err && typeof err.status === "number" && err.code) {
    return jsonError(err.status, err.code, err.message || "Error");
  }
  console.error(e);
  return jsonError(500, "INTERNAL", "Something went wrong");
}

export function ugx(amount: number) {
  return "UGX " + Math.round(amount).toLocaleString("en-US");
}

export const REFUND_POLICY_TEXT: Record<string, string> = {
  NO_REFUNDS: "No refunds after purchase.",
  UP_TO_7_DAYS: "Refunds allowed up to 7 days before the event.",
  UP_TO_24_HOURS: "Refunds allowed up to 24 hours before the event.",
  ONLY_IF_CANCELLED: "Refunds only if the event is cancelled or rescheduled.",
};

export function commissionRate(): number {
  const pct = Number(process.env.PLATFORM_COMMISSION_PERCENT || "5");
  return isNaN(pct) ? 0.05 : pct / 100;
}

export function splitAmounts(amount: number) {
  const commissionAmount = Math.round(amount * commissionRate());
  return { commissionAmount, organizerPayoutAmount: amount - commissionAmount };
}

export function appUrl() {
  return process.env.APP_URL || "http://localhost:3000";
}

export function paymentProvider(): "mock" | "flutterwave" {
  return process.env.PAYMENT_PROVIDER === "flutterwave" ? "flutterwave" : "mock";
}
