import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireRolePage } from "@/lib/guards";

export const dynamic = "force-dynamic";

export default async function OrganizerHome() {
  const user = await requireRolePage("ORGANIZER");
  const events = await prisma.event.findMany({
    where: { organizerId: user.id },
    orderBy: { createdAt: "desc" },
    include: { ticketTypes: true },
  });

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">My events</h1>
        <Link href="/organizer/events/new" className="btn-accent">New event</Link>
      </div>
      {events.length === 0 && (
        <div className="card p-8 text-center text-sm text-ink-700">
          No events yet. Create your first event to start selling tickets.
        </div>
      )}
      <div className="space-y-3">
        {events.map((e) => {
          const sold = e.ticketTypes.reduce((a, t) => a + t.quantitySold, 0);
          const cap = e.ticketTypes.reduce((a, t) => a + t.quantity, 0);
          return (
            <Link key={e.id} href={`/organizer/events/${e.id}`} className="card flex items-center justify-between p-4 hover:shadow-md">
              <div>
                <p className="font-semibold">{e.title}</p>
                <p className="text-sm text-ink-700">
                  {e.venue} · {e.date.toLocaleDateString("en-UG", { day: "numeric", month: "short", year: "numeric" })}
                </p>
              </div>
              <div className="text-right">
                <span className={`badge ${e.status === "PUBLISHED" ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}`}>
                  {e.status}
                </span>
                <p className="mt-1 text-sm text-ink-700">{sold} / {cap} sold</p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
