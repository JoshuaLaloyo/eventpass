"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";

export default function PaymentResult() {
  const { id } = useParams<{ id: string }>();
  const search = useSearchParams();
  const [status, setStatus] = useState<"checking" | "PAID" | "FAILED" | "PENDING">("checking");
  const [tickets, setTickets] = useState<any[]>([]);
  const attempts = useRef(0);

  useEffect(() => {
    let stopped = false;

    async function verifyRedirect() {
      // Flutterwave redirects back with transaction_id — verify server-side.
      const txId = search.get("transaction_id");
      if (txId) {
        await fetch("/api/payments/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId: id, transactionId: txId }),
        }).catch(() => {});
      }
    }

    async function poll() {
      if (stopped) return;
      attempts.current += 1;
      const res = await fetch(`/api/orders/${id}`);
      const d = await res.json();
      if (d.order) {
        if (d.order.paymentStatus === "PAID") {
          setStatus("PAID");
          setTickets(d.tickets || []);
          return;
        }
        if (d.order.paymentStatus === "FAILED") {
          setStatus("FAILED");
          return;
        }
        setStatus(attempts.current > 15 ? "PENDING" : "checking");
      }
      if (attempts.current < 20) setTimeout(poll, 2000);
      else setStatus("PENDING");
    }

    verifyRedirect().then(poll);
    return () => {
      stopped = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  return (
    <div className="mx-auto max-w-md">
      {status === "checking" && <div className="card p-8 text-center text-sm">Confirming your payment…</div>}

      {status === "PAID" && (
        <div className="card p-8 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-3xl">✓</div>
          <h1 className="text-xl font-bold text-green-700">Payment received</h1>
          <p className="mt-2 text-sm text-ink-700">
            {tickets.length} ticket{tickets.length !== 1 ? "s" : ""} issued and sent to your email.
          </p>
          <Link href="/my-tickets" className="btn-primary mt-5">View my tickets</Link>
        </div>
      )}

      {status === "FAILED" && (
        <div className="card p-8 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-3xl">✕</div>
          <h1 className="text-xl font-bold text-red-700">Payment did not complete</h1>
          <p className="mt-2 text-sm text-ink-700">No tickets were issued and no money should have left your account.</p>
          <Link href="/" className="btn-ghost mt-5">Back to events</Link>
        </div>
      )}

      {status === "PENDING" && (
        <div className="card p-8 text-center">
          <h1 className="text-xl font-bold">Still waiting for confirmation</h1>
          <p className="mt-2 text-sm text-ink-700">
            Your payment is still processing. Refresh this page in a moment — your tickets will appear under My tickets
            once the payment confirms.
          </p>
        </div>
      )}
    </div>
  );
}
