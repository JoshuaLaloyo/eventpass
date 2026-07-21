import type { Metadata } from "next";
import "./globals.css";
import Nav from "@/components/Nav";

export const metadata: Metadata = {
  title: "EventPass — tickets for events in Uganda",
  description: "Create events, sell tickets, verify attendees at the gate.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Nav />
        <main className="page">{children}</main>
        <footer className="mx-auto max-w-5xl px-4 py-8 text-xs text-ink-700/70">
          EventPass — ticketing infrastructure. Organizers own their events; EventPass never holds ticket funds.
        </footer>
      </body>
    </html>
  );
}
