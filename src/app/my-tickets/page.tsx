import QRCode from "qrcode";
import { prisma } from "@/lib/prisma";
import { requireRolePage } from "@/lib/guards";
import { ugx } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function MyTickets() {
  const user = await requireRolePage("CUSTOMER");
  const tickets = await prisma.ticket.findMany({
    where: { order: { userId: user.id, paymentStatus: "PAID" } },
    orderBy: { createdAt: "desc" },
    include: { ticketType: { include: { event: true } } },
  });

  const withQr = await Promise.all(
    tickets.map(async (t) => ({ t, qr: await QRCode.toDataURL(t.qrCodeUuid, { width: 240, margin: 1 }) }))
  );

  return (
    <div>
      <h1 className="mb-4 text-xl font-bold">My tickets</h1>
      {tickets.length === 0 && (
        <div className="card p-8 text-center text-sm text-ink-700">
          No tickets yet. Buy a ticket from any published event and it will appear here.
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        {withQr.map(({ t, qr }) => (
          <div key={t.id} className="card flex overflow-hidden">
            <div className="flex-1 p-4">
              <span className={`badge ${t.status === "VALID" ? "bg-green-100 text-green-800" : "bg-ink-900/10 text-ink-700"}`}>
                {t.status}
              </span>
              <h2 className="mt-2 font-semibold leading-tight">{t.ticketType.event.title}</h2>
              <p className="mt-1 text-sm text-ink-700">
                {t.ticketType.event.venue}
                <br />
                {t.ticketType.event.date.toLocaleString("en-UG", { dateStyle: "medium", timeStyle: "short" })}
              </p>
              <p className="mt-2 text-sm font-medium">
                {t.ticketType.name} · {ugx(t.ticketType.price)}
              </p>
              <a href={`/api/tickets/${t.id}/pdf`} className="btn-ghost mt-3">Download PDF</a>
            </div>
            <div className="flex w-40 flex-col items-center justify-center border-l border-dashed border-ink-900/25 bg-[#FBFAF7] p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qr} alt="Ticket QR code" className="w-full" />
              <p className="mt-1 text-center text-[10px] text-ink-700/70">Show at the gate</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
