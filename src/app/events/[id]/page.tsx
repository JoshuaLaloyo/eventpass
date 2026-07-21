import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ugx, REFUND_POLICY_TEXT } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function EventDetails({ params }: { params: { id: string } }) {
  const event = await prisma.event.findUnique({ where: { id: params.id }, include: { ticketTypes: true } });
  if (!event || event.status !== "PUBLISHED") notFound();

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div>
        <div className="card overflow-hidden">
          <div className="h-56 bg-ink-800">
            {event.posterUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={event.posterUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center text-5xl font-bold text-white/20">EP</div>
            )}
          </div>
          <div className="p-5">
            <h1 className="text-2xl font-bold">{event.title}</h1>
            <p className="mt-1 text-sm text-ink-700">
              {event.venue} · {event.date.toLocaleString("en-UG", { dateStyle: "full", timeStyle: "short" })}
            </p>
            {event.description && <p className="mt-4 whitespace-pre-line text-sm leading-relaxed">{event.description}</p>}
            <p className="mt-4 rounded-lg bg-[#F6F5F1] p-3 text-xs text-ink-700">
              <span className="font-semibold">Refund policy:</span> {REFUND_POLICY_TEXT[event.refundPolicy]}
            </p>
          </div>
        </div>
      </div>

      <aside className="card h-fit p-5">
        <h2 className="mb-3 font-semibold">Tickets</h2>
        <ul className="space-y-3">
          {event.ticketTypes.map((t) => {
            const remaining = t.quantity - t.quantitySold;
            return (
              <li key={t.id} className="flex items-center justify-between gap-2 rounded-lg border border-ink-900/10 p-3">
                <div>
                  <p className="font-medium">{t.name}</p>
                  <p className="text-sm text-ink-700">{ugx(t.price)}</p>
                  <p className="text-xs text-ink-700/70">{remaining > 0 ? `${remaining} remaining` : "Sold out"}</p>
                </div>
                {remaining > 0 ? (
                  <Link href={`/events/${event.id}/checkout?tt=${t.id}`} className="btn-accent">Buy</Link>
                ) : (
                  <span className="badge bg-ink-900/10 text-ink-700">Sold out</span>
                )}
              </li>
            );
          })}
        </ul>
      </aside>
    </div>
  );
}
