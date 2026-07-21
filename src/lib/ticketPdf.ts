import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import QRCode from "qrcode";
import { ugx } from "@/lib/utils";

export type TicketPdfData = {
  eventTitle: string;
  venue: string;
  date: Date;
  ticketTypeName: string;
  price: number;
  attendeeName: string;
  qrCodeUuid: string;
  ticketId: string;
};

const INK = rgb(0.075, 0.102, 0.141);
const ACCENT = rgb(0.91, 0.63, 0.23);
const GREY = rgb(0.45, 0.48, 0.52);

/** One A5 landscape page per ticket. */
export async function buildTicketsPdf(tickets: TicketPdfData[]): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const font = await doc.embedFont(StandardFonts.Helvetica);

  for (const t of tickets) {
    const page = doc.addPage([595, 320]); // A5 landscape-ish
    const { width, height } = page.getSize();

    // Header band
    page.drawRectangle({ x: 0, y: height - 64, width, height: 64, color: INK });
    page.drawText("EventPass", { x: 24, y: height - 42, size: 20, font: bold, color: rgb(1, 1, 1) });
    page.drawText("ADMIT ONE", { x: width - 118, y: height - 40, size: 12, font: bold, color: ACCENT });

    // QR block (right)
    const qrPng = await QRCode.toBuffer(t.qrCodeUuid, { width: 180, margin: 1 });
    const qrImage = await doc.embedPng(qrPng);
    page.drawImage(qrImage, { x: width - 200, y: 46, width: 170, height: 170 });
    page.drawText("Present this code at the gate", { x: width - 200, y: 30, size: 8, font, color: GREY });

    // Perforation line
    for (let y = 20; y < height - 74; y += 12) {
      page.drawLine({ start: { x: width - 218, y }, end: { x: width - 218, y: y + 6 }, thickness: 1, color: GREY });
    }

    // Details (left)
    let y = height - 100;
    page.drawText(t.eventTitle.slice(0, 48), { x: 24, y, size: 18, font: bold, color: INK });
    y -= 26;
    const row = (label: string, value: string) => {
      page.drawText(label.toUpperCase(), { x: 24, y, size: 8, font: bold, color: GREY });
      page.drawText(value.slice(0, 52), { x: 24, y: y - 13, size: 12, font, color: INK });
      y -= 36;
    };
    row("Venue", t.venue);
    row("Date", t.date.toLocaleString("en-UG", { dateStyle: "full", timeStyle: "short" }));
    row("Ticket", `${t.ticketTypeName} — ${ugx(t.price)}`);
    row("Attendee", t.attendeeName);

    page.drawText(`Ticket ID: ${t.ticketId}`, { x: 24, y: 16, size: 7, font, color: GREY });
  }

  return doc.save();
}
