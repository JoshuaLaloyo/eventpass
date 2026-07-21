"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewEvent() {
  const router = useRouter();
  const [form, setForm] = useState({ title: "", venue: "", date: "", description: "", posterUrl: "", refundPolicy: "NO_REFUNDS" });
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k: string) => (e: React.ChangeEvent<any>) => setForm({ ...form, [k]: e.target.value });

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const next = submitter?.value === "tickets" ? "tickets" : "dashboard";
    setBusy(true);
    setError("");
    let posterUrl = form.posterUrl.trim();

    if (file) {
      const fd = new FormData();
      fd.append("file", file);
      const up = await fetch("/api/upload", { method: "POST", body: fd });
      const upData = await up.json();
      if (up.ok) posterUrl = upData.url;
      else if (up.status !== 501) {
        setError(upData.error?.message || "Poster upload failed");
        setBusy(false);
        return;
      } // 501 = Cloudinary not configured → continue with pasted URL (or none)
    }

    const res = await fetch("/api/organizer/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, posterUrl: posterUrl || undefined }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error?.message || "Could not create the event");
      setBusy(false);
      return;
    }
    router.push(next === "tickets" ? `/organizer/events/${data.event.id}` : "/organizer");
  }

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="mb-4 text-xl font-bold">Create event</h1>
      <form onSubmit={submit} className="card space-y-4 p-5">
        <div>
          <label className="label">Title</label>
          <input className="input" value={form.title} onChange={set("title")} required />
        </div>
        <div>
          <label className="label">Venue</label>
          <input className="input" value={form.venue} onChange={set("venue")} required />
        </div>
        <div>
          <label className="label">Date & time</label>
          <input className="input" type="datetime-local" value={form.date} onChange={set("date")} required />
        </div>
        <div>
          <label className="label">Description</label>
          <textarea className="input" rows={4} value={form.description} onChange={set("description")} />
        </div>
        <div>
          <label className="label">Poster image (upload, or paste a link below)</label>
          <input className="input" type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          <input className="input mt-2" placeholder="https://… (optional poster URL)" value={form.posterUrl} onChange={set("posterUrl")} />
        </div>
        <div>
          <label className="label">Refund policy (shown to buyers at checkout)</label>
          <select className="input" value={form.refundPolicy} onChange={set("refundPolicy")}>
            <option value="NO_REFUNDS">No refunds</option>
            <option value="UP_TO_7_DAYS">Refunds up to 7 days before the event</option>
            <option value="UP_TO_24_HOURS">Refunds up to 24 hours before the event</option>
            <option value="ONLY_IF_CANCELLED">Refunds only if the event is cancelled or rescheduled</option>
          </select>
        </div>
        {error && <p className="error-text">{error}</p>}
        <div className="flex flex-col gap-2 sm:flex-row">
          <button type="submit" name="next" value="dashboard" className="btn-ghost w-full" disabled={busy}>
            {busy ? "Saving…" : "Save as draft"}
          </button>
          <button type="submit" name="next" value="tickets" className="btn-primary w-full" disabled={busy}>
            {busy ? "Saving…" : "Continue to add tickets"}
          </button>
        </div>
      </form>
    </div>
  );
}
