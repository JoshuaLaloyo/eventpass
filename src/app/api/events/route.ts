import { NextRequest, NextResponse } from "next/server";
import { getPublishedEvents } from "@/lib/events";
import { handleRouteError } from "@/lib/utils";

export async function GET(req: NextRequest) {
  try {
    const search = req.nextUrl.searchParams.get("search")?.trim();
    const events = await getPublishedEvents(search);
    return NextResponse.json({
      events: events.map((e) => ({
        id: e.id,
        title: e.title,
        venue: e.venue,
        date: e.date,
        posterUrl: e.posterUrl,
        minPrice: e.ticketTypes.length ? Math.min(...e.ticketTypes.map((t) => t.price)) : null,
      })),
    });
  } catch (e) {
    return handleRouteError(e);
  }
}
