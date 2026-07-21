import nodemailer from "nodemailer";
import { prisma } from "@/lib/prisma";
import { buildTicketsPdf } from "@/lib/ticketPdf";

function transporter() {
  if (!process.env.SMTP_HOST) return null;
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
  });
}

/** Emails all tickets on a paid order as a single PDF attachment. No-op if SMTP is not configured. */
export async function sendTicketEmail(orderId: string) {
  const t = transporter();
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { user: true, event: true, tickets: { include: { ticketType: true } } },
  });
  if (!order || order.tickets.length === 0) return;
  if (!t) {
    console.log(`[email skipped — SMTP not configured] would send ${order.tickets.length} ticket(s) to ${order.user.email}`);
    return;
  }

  const pdf = await buildTicketsPdf(
    order.tickets.map((tk) => ({
      eventTitle: order.event.title,
      venue: order.event.venue,
      date: order.event.date,
      ticketTypeName: tk.ticketType.name,
      price: tk.ticketType.price,
      attendeeName: order.user.name,
      qrCodeUuid: tk.qrCodeUuid,
      ticketId: tk.id,
    }))
  );

  await t.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: order.user.email,
    subject: `Your ticket${order.tickets.length > 1 ? "s" : ""} — ${order.event.title}`,
    text: `Hello ${order.user.name},\n\nYour payment was received. Your ticket${order.tickets.length > 1 ? "s are" : " is"} attached as a PDF.\nYou can also view them any time under "My tickets" on EventPass.\n\nEvent: ${order.event.title}\nVenue: ${order.event.venue}\nDate: ${order.event.date.toLocaleString("en-UG")}\n\nSee you at the gate!`,
    attachments: [{ filename: "EventPass-tickets.pdf", content: Buffer.from(pdf) }],
  });
}
