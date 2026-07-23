import Link from "next/link";
import { getPublishedEvents } from "@/lib/events";
import { ugx } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function Browse({ searchParams }: { searchParams: { search?: string } }) {
  const search = searchParams.search?.trim();
  const events = await getPublishedEvents(search);

  return (
    <div>
      <div className="mb-6 rounded-2xl bg-ink-900 px-6 py-8 text-white">
        <h1 className="text-2xl font-bold sm:text-3xl">Find your next event</h1>
        <p className="mt-1 text-sm text-white/70">Buy with Mobile Money. Enter with a QR code.</p>
        <form className="mt-4 flex max-w-md gap-2" action="/">
          <input name="search" defaultValue={search} placeholder="Search by title or venue" className="input" />
          <button className="btn-accent">Search</button>
        </form>
      </div>

      {events.length === 0 && (
        <div className="card p-8 text-center text-sm text-ink-700">
          {search ? `No published events match "${search}".` : "No events published yet. Check back soon."}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {events.map((e) => {
          const minPrice = e.ticketTypes.length ? Math.min(...e.ticketTypes.map((t) => t.price)) : null;
          return (
            <Link key={e.id} href={`/events/${e.id}`} className="card overflow-hidden transition-shadow hover:shadow-md">
              <div className="h-36 bg-ink-800">
                {e.posterUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={e.posterUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-3xl font-bold text-white/20">EP</div>
                )}
              </div>
              <div className="p-4">
                <h2 className="font-semibold leading-tight">{e.title}</h2>
                <p className="mt-1 text-sm text-ink-700">
                  {e.venue} · {e.date.toLocaleDateString("en-UG", { day: "numeric", month: "short", year: "numeric" })}
                </p>
                {minPrice !== null && <p className="mt-2 text-sm font-semibold text-accent-dark">From {ugx(minPrice)}</p>}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
