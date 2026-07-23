"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ugx } from "@/lib/utils";

type Sales = {
  total: { sold: number; revenue: number };
  byTicketType: { id: string; name: string; price: number; sold: number; remaining: number }[];
};

export default function ManageEvent() {
  const { id } = useParams<{ id: string }>();
  const [event, setEvent] = useState<any>(null);
  const [sales, setSales] = useState<Sales | null>(null);
  const [tt, setTt] = useState({ name: "", price: "", quantity: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    // Organizer's own list gives status; sales endpoint gives ticket type detail
    const [listRes, salesRes] = await Promise.all([
      fetch("/api/organizer/events").then((r) => r.json()),
      fetch(`/api/organizer/events/${id}/sales`).then((r) => r.json()),
    ]);
    const ev = (listRes.events || []).find((e: any) => e.id === id);
    setEvent(ev || null);
    if (!salesRes.error) setSales(salesRes);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function addTicketType(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch(`/api/organizer/events/${id}/ticket-types`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: tt.name, price: Number(tt.price), quantity: Number(tt.quantity) }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) return setError(data.error?.message || "Could not add the ticket type");
    setTt({ name: "", price: "", quantity: "" });
    load();
  }

  async function publish() {
    setBusy(true);
    setError("");
    const res = await fetch(`/api/organizer/events/${id}/publish`, { method: "POST" });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) return setError(data.error?.message || "Could not publish");
    load();
  }

  if (!event) return <div className="card p-6 text-sm">Loading event…</div>;

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">{event.title}</h1>
          <p className="text-sm text-ink-700">
            {event.venue} · {new Date(event.date).toLocaleString("en-UG", { dateStyle: "medium", timeStyle: "short" })}
          </p>
        </div>
        <span className={`badge ${event.status === "PUBLISHED" ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}`}>
          {event.status}
        </span>
      </div>

      {sales && (
        <div className="mb-4 grid grid-cols-2 gap-3">
          <div className="card p-4">
            <p className="text-xs font-semibold uppercase text-ink-700">Tickets sold</p>
            <p className="text-2xl font-bold">{sales.total.sold}</p>
          </div>
          <div className="card p-4">
            <p className="text-xs font-semibold uppercase text-ink-700">Gross revenue</p>
            <p className="text-2xl font-bold">{ugx(sales.total.revenue)}</p>
          </div>
        </div>
      )}

      <div className="card p-5">
        <h2 className="mb-3 font-semibold">Ticket types</h2>
        {sales && sales.byTicketType.length > 0 ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ink-900/10 text-left text-xs uppercase text-ink-700">
                <th className="pb-2">Name</th>
                <th className="pb-2">Price</th>
                <th className="pb-2">Sold</th>
                <th className="pb-2">Remaining</th>
              </tr>
            </thead>
            <tbody>
              {sales.byTicketType.map((t) => (
                <tr key={t.id} className="border-b border-ink-900/5">
                  <td className="py-2 font-medium">{t.name}</td>
                  <td className="py-2">{ugx(t.price)}</td>
                  <td className="py-2">{t.sold}</td>
                  <td className="py-2">{t.remaining}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-sm text-ink-700">No ticket types yet — add at least one before publishing.</p>
        )}

        <form onSubmit={addTicketType} className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_120px_100px_auto]">
          <input className="input" placeholder="Name (e.g. Ordinary)" value={tt.name} onChange={(e) => setTt({ ...tt, name: e.target.value })} required />
          <input className="input" placeholder="Price UGX" type="number" min={0} value={tt.price} onChange={(e) => setTt({ ...tt, price: e.target.value })} required />
          <input className="input" placeholder="Qty" type="number" min={1} value={tt.quantity} onChange={(e) => setTt({ ...tt, quantity: e.target.value })} required />
          <button className="btn-ghost" disabled={busy}>Add</button>
        </form>
      </div>

      {event.status !== "PUBLISHED" && (
        <button className="btn-accent mt-4 w-full" onClick={publish} disabled={busy}>
          Publish event
        </button>
      )}
      {error && <p className="error-text mt-3">{error}</p>}
    </div>
  );
}
