import { prisma } from "@/lib/prisma";
import { requireRolePage } from "@/lib/guards";
import { ugx } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  await requireRolePage("ADMIN");

  const [payments, totalTicketsSold, events] = await Promise.all([
    prisma.payment.aggregate({ where: { status: "SUCCESSFUL" }, _sum: { amount: true, commissionAmount: true } }),
    prisma.ticket.count({ where: { order: { paymentStatus: "PAID" } } }),
    prisma.event.findMany({
      include: { ticketTypes: true, orders: { include: { payment: true } }, organizer: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <div>
      <h1 className="mb-4 text-xl font-bold">Platform dashboard</h1>
      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <div className="card p-4">
          <p className="text-xs font-semibold uppercase text-ink-700">Tickets sold</p>
          <p className="text-2xl font-bold">{totalTicketsSold}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-semibold uppercase text-ink-700">Gross ticket revenue</p>
          <p className="text-2xl font-bold">{ugx(payments._sum.amount || 0)}</p>
        </div>
        <div className="card border-accent bg-accent/10 p-4">
          <p className="text-xs font-semibold uppercase text-ink-700">Commission earned</p>
          <p className="text-2xl font-bold">{ugx(payments._sum.commissionAmount || 0)}</p>
        </div>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-ink-900/10 text-left text-xs uppercase text-ink-700">
              <th className="p-3">Event</th>
              <th className="p-3">Organizer</th>
              <th className="p-3">Status</th>
              <th className="p-3">Sold</th>
              <th className="p-3">Commission</th>
            </tr>
          </thead>
          <tbody>
            {events.map((e) => (
              <tr key={e.id} className="border-b border-ink-900/5">
                <td className="p-3 font-medium">{e.title}</td>
                <td className="p-3 text-ink-700">{e.organizer.organizationName || e.organizer.name}</td>
                <td className="p-3">{e.status}</td>
                <td className="p-3">{e.ticketTypes.reduce((a, t) => a + t.quantitySold, 0)}</td>
                <td className="p-3">
                  {ugx(e.orders.reduce((a, o) => a + (o.payment?.status === "SUCCESSFUL" ? o.payment.commissionAmount : 0), 0))}
                </td>
              </tr>
            ))}
            {events.length === 0 && (
              <tr>
                <td className="p-4 text-ink-700" colSpan={5}>No events yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
