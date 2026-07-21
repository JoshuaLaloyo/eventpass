"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";

type EventData = {
  id: string;
  title: string;
  refundPolicyText: string;
  ticketTypes: { id: string; name: string; price: number; remaining: number }[];
};

const ugx = (n: number) => "UGX " + Math.round(n).toLocaleString("en-US");

export default function Checkout() {
  const { id } = useParams<{ id: string }>();
  const search = useSearchParams();
  const router = useRouter();
  const [event, setEvent] = useState<EventData | null>(null);
  const [ticketTypeId, setTicketTypeId] = useState(search.get("tt") || "");
  const [quantity, setQuantity] = useState(1);
  const [phone, setPhone] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState("");
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    fetch(`/api/events/${id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.event) {
          setEvent(d.event);
          if (!search.get("tt") && d.event.ticketTypes[0]) setTicketTypeId(d.event.ticketTypes[0].id);
        } else setError("Event not found");
      })
      .catch(() => setError("Could not load the event"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const tt = event?.ticketTypes.find((t) => t.id === ticketTypeId);
  const total = tt ? tt.price * quantity : 0;

  async function pay() {
    setError("");
    setPaying(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId: id, ticketTypeId, quantity, phone, policyAccepted: accepted }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401) return router.push("/login?next=" + encodeURIComponent(window.location.pathname + window.location.search));
        setError(data.error?.message || "Could not start the payment");
        setPaying(false);
        return;
      }
      window.location.href = data.paymentUrl;
    } catch {
      setError("Could not start the payment");
      setPaying(false);
    }
  }

  if (!event) return <div className="card p-6 text-sm">{error || "Loading checkout…"}</div>;

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="mb-4 text-xl font-bold">Checkout — {event.title}</h1>
      <div className="card space-y-4 p-5">
        <div>
          <label className="label">Ticket type</label>
          <select className="input" value={ticketTypeId} onChange={(e) => setTicketTypeId(e.target.value)}>
            {event.ticketTypes.map((t) => (
              <option key={t.id} value={t.id} disabled={t.remaining <= 0}>
                {t.name} — {ugx(t.price)} {t.remaining <= 0 ? "(sold out)" : ""}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">Quantity</label>
          <select className="input" value={quantity} onChange={(e) => setQuantity(Number(e.target.value))}>
            {Array.from({ length: Math.min(10, Math.max(1, tt?.remaining ?? 1)) }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">Mobile Money phone number (MTN / Airtel)</label>
          <input className="input" placeholder="07XX XXX XXX" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>

        <div className="rounded-lg bg-[#F6F5F1] p-3 text-sm">
          <p className="mb-2">
            <span className="font-semibold">Refund policy:</span> {event.refundPolicyText}
          </p>
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" className="mt-0.5" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} />
            <span>I have read and accept this refund policy.</span>
          </label>
        </div>

        <div className="flex items-center justify-between border-t border-ink-900/10 pt-4">
          <p className="text-lg font-bold">{ugx(total)}</p>
          <button className="btn-accent" disabled={!accepted || !tt || paying} onClick={pay}>
            {paying ? "Starting payment…" : "Pay"}
          </button>
        </div>
        {error && <p className="error-text">{error}</p>}
      </div>
    </div>
  );
}
