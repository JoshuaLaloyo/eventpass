"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

const ugx = (n: number) => "UGX " + Math.round(n).toLocaleString("en-US");

export default function MockPayment() {
  const { orderId } = useParams<{ orderId: string }>();
  const router = useRouter();
  const [order, setOrder] = useState<any>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch(`/api/orders/${orderId}`)
      .then((r) => r.json())
      .then((d) => (d.order ? setOrder(d.order) : setError(d.error?.message || "Order not found")));
  }, [orderId]);

  async function simulate(outcome: "success" | "fail") {
    setBusy(true);
    setError("");
    const res = await fetch("/api/payments/mock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId, outcome }),
    });
    if (!res.ok) {
      const d = await res.json();
      setError(d.error?.message || "Simulation failed");
      setBusy(false);
      return;
    }
    router.push(`/orders/${orderId}/result`);
  }

  return (
    <div className="mx-auto max-w-md">
      <div className="card p-6">
        <p className="badge mb-3 bg-amber-100 text-amber-800">Sandbox — simulated payment</p>
        <h1 className="text-xl font-bold">Mobile Money payment</h1>
        {order ? (
          <p className="mt-2 text-sm text-ink-700">
            {order.quantity} × {order.ticketTypeName} for <span className="font-semibold">{order.eventTitle}</span>
            <br />
            Total: <span className="font-semibold">{ugx(order.totalAmount)}</span>
          </p>
        ) : (
          <p className="mt-2 text-sm">{error || "Loading order…"}</p>
        )}
        <p className="mt-4 text-xs text-ink-700/80">
          This screen stands in for the MTN/Airtel payment prompt while the app runs in mock mode. In Flutterwave mode,
          the real hosted payment page appears here instead.
        </p>
        <div className="mt-5 flex gap-3">
          <button className="btn-primary flex-1" disabled={busy || !order} onClick={() => simulate("success")}>
            Simulate successful payment
          </button>
          <button className="btn-ghost flex-1" disabled={busy || !order} onClick={() => simulate("fail")}>
            Simulate failure
          </button>
        </div>
        {error && <p className="error-text mt-3">{error}</p>}
      </div>
    </div>
  );
}
