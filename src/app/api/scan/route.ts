import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { jsonError, handleRouteError } from "@/lib/utils";
import type { ScanResult } from "@prisma/client";

// Server-side verification of a scanned QR (the QR contains ONLY the ticket UUID).
// Checks, in order: exists → order paid → correct event → not already used.
// The "used" check is an atomic conditional update, so two simultaneous scans
// of the same ticket can never both be accepted.
export async function POST(req: NextRequest) {
  try {
    const user = await requireRole("GATE_STAFF", "ORGANIZER", "ADMIN");
    const body = await req.json();
    const qrCodeUuid = String(body.qrCodeUuid || "").trim();
    const eventId = String(body.eventId || "");
    const gate = String(body.gate || "Main gate").slice(0, 60);
    if (!qrCodeUuid || !eventId) return jsonError(400, "VALIDATION", "qrCodeUuid and eventId are required");

    const log = (ticketId: string | null, result: ScanResult) =>
      prisma.scan.create({ data: { ticketId, scannedBy: user.id, gate, result } });

    const ticket = await prisma.ticket.findUnique({
      where: { qrCodeUuid },
      include: { order: { include: { user: true } }, ticketType: { include: { event: true } } },
    });

    if (!ticket) {
      await log(null, "REJECTED_NOT_FOUND");
      return NextResponse.json({ result: "REJECTED_NOT_FOUND", reason: "Ticket not found" });
    }
    if (ticket.order.paymentStatus !== "PAID") {
      await log(ticket.id, "REJECTED_UNPAID");
      return NextResponse.json({ result: "REJECTED_UNPAID", reason: "Ticket is not paid" });
    }
    if (ticket.ticketType.eventId !== eventId) {
      await log(ticket.id, "REJECTED_WRONG_EVENT");
      return NextResponse.json({ result: "REJECTED_WRONG_EVENT", reason: `Ticket is for: ${ticket.ticketType.event.title}` });
    }

    // Atomic: only one scan can flip VALID → USED
    const updated = await prisma.ticket.updateMany({
      where: { id: ticket.id, status: "VALID" },
      data: { status: "USED", scannedAt: new Date() },
    });
    if (updated.count === 0) {
      await log(ticket.id, "REJECTED_USED");
      return NextResponse.json({ result: "REJECTED_USED", reason: "Ticket already used" });
    }

    await log(ticket.id, "ACCEPTED");
    return NextResponse.json({
      result: "ACCEPTED",
      attendee: ticket.order.user.name,
      ticketType: ticket.ticketType.name,
    });
  } catch (e) {
    return handleRouteError(e);
  }
}
