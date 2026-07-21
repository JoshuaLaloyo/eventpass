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

const VERIFY_ANIMATION_MS = 5000;
const RESULT_HOLD_MS = 2000;

export default function Scanner() {
  const [events, setEvents] = useState<{ id: string; title: string }[]>([]);
  const [eventId, setEventId] = useState("");
  const [gate, setGate] = useState("Main gate");
  const [running, setRunning] = useState(false);
  const [verifying, setVerifying] = useState(false);
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
    setCurrent(null);
    setVerifying(true);

    const started = Date.now();
    let outcome: ScanOutcome;
    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qrCodeUuid: code, eventId, gate }),
      });
      const data = await res.json();
      outcome = {
        result: data.result || "ERROR",
        reason: data.reason || data.error?.message,
        attendee: data.attendee,
        ticketType: data.ticketType,
        at: new Date().toLocaleTimeString(),
      };
    } catch {
      outcome = { result: "ERROR", reason: "Network problem — try again", at: new Date().toLocaleTimeString() };
    }

    // Hold the scanning animation for a consistent 8s beat regardless of how fast the API answered
    const remaining = VERIFY_ANIMATION_MS - (Date.now() - started);
    if (remaining > 0) await new Promise((r) => setTimeout(r, remaining));

    setVerifying(false);
    setCurrent(outcome);
    setHistory((h) => [outcome, ...h].slice(0, 12));

    // Show the tick/cross for a moment, then clear the way for the next scan
    setTimeout(() => {
      setCurrent(null);
      busyRef.current = false;
    }, RESULT_HOLD_MS);
  }

  function start() {
    setError("");
    if (!eventId) return setError("Select the event first");
    // Reveal the (until-now display:none) camera container first — html5-qrcode measures
    // its width when it starts, and gets 0 if the container is still hidden at that point.
    setRunning(true);
  }

  useEffect(() => {
    if (!running) return;
    let cancelled = false;
    (async () => {
      try {
        const scanner = new Html5Qrcode("qr-viewfinder");
        scannerRef.current = scanner;
        await scanner.start(
          { facingMode: "environment" },
          { fps: 8, qrbox: { width: 220, height: 220 } },
          (decoded) => handleCode(decoded),
          () => {}
        );
      } catch {
        if (!cancelled) {
          setError("Could not open the camera. Allow camera access and use HTTPS (or localhost).");
          setRunning(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  async function stop() {
    await scannerRef.current?.stop().catch(() => {});
    setRunning(false);
    setVerifying(false);
    setCurrent(null);
    busyRef.current = false;
  }

  const accepted = current?.result === "ACCEPTED";
  const activeEvent = events.find((e) => e.id === eventId);

  return (
    <div className="mx-auto max-w-md">
      <h1 className="mb-3 text-xl font-bold">Gate scanner</h1>

      <div className="card space-y-3 p-4">
        {!running ? (
          <>
            <div>
              <label className="label">Event</label>
              <select className="input" value={eventId} onChange={(e) => setEventId(e.target.value)}>
                {events.map((e) => (
                  <option key={e.id} value={e.id}>{e.title}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Gate label</label>
              <input className="input" value={gate} onChange={(e) => setGate(e.target.value)} />
            </div>
          </>
        ) : (
          <p className="text-sm text-ink-700">
            <span className="font-semibold text-ink-900">{activeEvent?.title}</span> · {gate}
          </p>
        )}

        {!running ? (
          <button className="btn-primary w-full" onClick={start}>Start scanning</button>
        ) : (
          <button className="btn-ghost w-full" onClick={stop}>Stop</button>
        )}
        {error && <p className="error-text">{error}</p>}
      </div>

      <div className={`card mt-4 p-4 ${running ? "" : "hidden"}`}>
        <div className="relative overflow-hidden rounded-xl">
          <div id="qr-viewfinder" />

          {verifying && (
            <div className="absolute inset-0 overflow-hidden bg-ink-900/70">
              <div className="animate-scan-sweep absolute left-0 right-0 h-1 bg-accent shadow-[0_0_12px_2px_rgba(232,161,58,0.8)]" />
              <div className="absolute inset-0 flex items-center justify-center">
                <p className="text-sm font-semibold tracking-wide text-white">Verifying…</p>
              </div>
            </div>
          )}

          {current && (
            <div
              className={`absolute inset-0 flex flex-col items-center justify-center p-4 text-center text-white ${
                accepted ? "bg-green-600/95" : "bg-red-600/95"
              }`}
            >
              <span className="animate-pop-in text-5xl leading-none">{accepted ? "✓" : "✕"}</span>
              <p className="mt-2 text-lg font-extrabold tracking-wide">{accepted ? "ADMIT" : "REJECT"}</p>
              {accepted ? (
                <p className="mt-1 text-sm">{current.attendee} — {current.ticketType}</p>
              ) : (
                <p className="mt-1 text-sm">{current.reason}</p>
              )}
            </div>
          )}
        </div>

        {history.length > 0 && (
          <div className="mt-4 divide-y divide-ink-900/10 border-t border-ink-900/10">
            <p className="pt-3 text-xs font-semibold uppercase text-ink-700">Recent scans</p>
            {history.map((h, i) => (
              <div key={i} className="flex items-center justify-between py-3 text-sm">
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
    </div>
  );
}
