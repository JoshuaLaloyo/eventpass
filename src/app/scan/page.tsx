"use client";

import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";

type ScanOutcome = {
  result: string;
  reason?: string;
  attendee?: string;
  ticketType?: string;
  at: string;
};

export default function Scanner() {
  const [events, setEvents] = useState<{ id: string; title: string }[]>([]);
  const [eventId, setEventId] = useState("");
  const [gate, setGate] = useState("Main gate");
  const [running, setRunning] = useState(false);
  const [current, setCurrent] = useState<ScanOutcome | null>(null);
  const [history, setHistory] = useState<ScanOutcome[]>([]);
  const [error, setError] = useState("");
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const busyRef = useRef(false);
  const lastCodeRef = useRef<{ code: string; t: number }>({ code: "", t: 0 });

  useEffect(() => {
    fetch("/api/events")
      .then((r) => r.json())
      .then((d) => {
        setEvents(d.events || []);
        if (d.events?.[0]) setEventId(d.events[0].id);
      });
    return () => {
      scannerRef.current?.stop().catch(() => {});
    };
  }, []);

  async function handleCode(code: string) {
    const now = Date.now();
    if (busyRef.current) return;
    if (lastCodeRef.current.code === code && now - lastCodeRef.current.t < 4000) return; // ignore rapid re-reads
    busyRef.current = true;
    lastCodeRef.current = { code, t: now };
    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qrCodeUuid: code, eventId, gate }),
      });
      const data = await res.json();
      const outcome: ScanOutcome = {
        result: data.result || "ERROR",
        reason: data.reason || data.error?.message,
        attendee: data.attendee,
        ticketType: data.ticketType,
        at: new Date().toLocaleTimeString(),
      };
      setCurrent(outcome);
      setHistory((h) => [outcome, ...h].slice(0, 12));
    } catch {
      setCurrent({ result: "ERROR", reason: "Network problem — try again", at: new Date().toLocaleTimeString() });
    }
    // Show the result for a moment, then be ready for the next scan
    setTimeout(() => {
      busyRef.current = false;
    }, 2500);
  }

  async function start() {
    setError("");
    if (!eventId) return setError("Select the event first");
    try {
      const scanner = new Html5Qrcode("qr-viewfinder");
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: "environment" },
        { fps: 8, qrbox: { width: 220, height: 220 } },
        (decoded) => handleCode(decoded),
        () => {}
      );
      setRunning(true);
    } catch {
      setError("Could not open the camera. Allow camera access and use HTTPS (or localhost).");
    }
  }

  async function stop() {
    await scannerRef.current?.stop().catch(() => {});
    setRunning(false);
  }

  const accepted = current?.result === "ACCEPTED";

  return (
    <div className="mx-auto max-w-md">
      <h1 className="mb-3 text-xl font-bold">Gate scanner</h1>

      <div className="card space-y-3 p-4">
        <div>
          <label className="label">Event</label>
          <select className="input" value={eventId} onChange={(e) => setEventId(e.target.value)} disabled={running}>
            {events.map((e) => (
              <option key={e.id} value={e.id}>{e.title}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Gate label</label>
          <input className="input" value={gate} onChange={(e) => setGate(e.target.value)} disabled={running} />
        </div>
        {!running ? (
          <button className="btn-primary w-full" onClick={start}>Start scanning</button>
        ) : (
          <button className="btn-ghost w-full" onClick={stop}>Stop</button>
        )}
        {error && <p className="error-text">{error}</p>}
      </div>

      <div id="qr-viewfinder" className="mt-4 overflow-hidden rounded-xl" />

      {current && (
        <div
          className={`mt-4 rounded-xl p-5 text-center text-white ${
            accepted ? "bg-green-600" : current.result === "ERROR" ? "bg-ink-700" : "bg-red-600"
          }`}
        >
          <p className="text-2xl font-extrabold tracking-wide">{accepted ? "ADMIT" : "REJECT"}</p>
          {accepted ? (
            <p className="mt-1 text-sm">
              {current.attendee} — {current.ticketType}
            </p>
          ) : (
            <p className="mt-1 text-sm">{current.reason}</p>
          )}
          <p className="mt-1 text-xs opacity-80">{current.at}</p>
        </div>
      )}

      {history.length > 0 && (
        <div className="card mt-4 divide-y divide-ink-900/10">
          <p className="p-3 text-xs font-semibold uppercase text-ink-700">Recent scans</p>
          {history.map((h, i) => (
            <div key={i} className="flex items-center justify-between p-3 text-sm">
              <span className={h.result === "ACCEPTED" ? "font-semibold text-green-700" : "font-semibold text-red-700"}>
                {h.result === "ACCEPTED" ? "Admitted" : "Rejected"}
              </span>
              <span className="text-ink-700">{h.result === "ACCEPTED" ? `${h.attendee}` : h.reason}</span>
              <span className="text-xs text-ink-700/70">{h.at}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
