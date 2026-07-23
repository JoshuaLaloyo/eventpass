import { prisma } from "@/lib/prisma";

/** Published events, optionally filtered by title/venue — used by the home page and the /api/events listing. */
export function getPublishedEvents(search?: string) {
  return prisma.event.findMany({
    where: {
      status: "PUBLISHED",
      ...(search
        ? { OR: [{ title: { contains: search, mode: "insensitive" } }, { venue: { contains: search, mode: "insensitive" } }] }
        : {}),
    },
    orderBy: { date: "asc" },
    include: { ticketTypes: true },
  });
}

/** A single published event with its ticket types, or null if missing/not published — used by the event detail page and its API route. */
export async function getPublishedEvent(id: string) {
  const event = await prisma.event.findUnique({ where: { id }, include: { ticketTypes: true } });
  if (!event || event.status !== "PUBLISHED") return null;
  return event;
}
