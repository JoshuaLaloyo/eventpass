"use client";

import { useEffect, useState } from "react";

export default function Staff() {
  const [staff, setStaff] = useState<{ id: string; name: string; email: string }[]>([]);
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [okMsg, setOkMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });

  const load = () => fetch("/api/organizer/staff").then((r) => r.json()).then((d) => setStaff(d.staff || []));
  useEffect(() => {
    load();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setOkMsg("");
    const res = await fetch("/api/organizer/staff", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) return setError(data.error?.message || "Could not create the account");
    setOkMsg(`Gate staff account created for ${form.email}. Share the password with them privately.`);
    setForm({ name: "", email: "", password: "" });
    load();
  }

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="mb-1 text-xl font-bold">Gate staff</h1>
      <p className="mb-4 text-sm text-ink-700">
        Gate staff sign in with these accounts and can only use the scanner. Per-event scoping arrives in Phase 2.
      </p>
      <form onSubmit={submit} className="card space-y-4 p-5">
        <div>
          <label className="label">Name</label>
          <input className="input" value={form.name} onChange={set("name")} required />
        </div>
        <div>
          <label className="label">Email</label>
          <input className="input" type="email" value={form.email} onChange={set("email")} required />
        </div>
        <div>
          <label className="label">Password (min 8 characters)</label>
          <input className="input" value={form.password} onChange={set("password")} required minLength={8} />
        </div>
        {error && <p className="error-text">{error}</p>}
        {okMsg && <p className="text-sm font-medium text-green-700">{okMsg}</p>}
        <button className="btn-primary" disabled={busy}>{busy ? "Creating…" : "Add gate staff"}</button>
      </form>

      <h2 className="mb-2 mt-6 font-semibold">Existing gate staff</h2>
      <div className="card divide-y divide-ink-900/10">
        {staff.length === 0 && <p className="p-4 text-sm text-ink-700">None yet.</p>}
        {staff.map((s) => (
          <div key={s.id} className="flex justify-between p-3 text-sm">
            <span>{s.name}</span>
            <span className="text-ink-700">{s.email}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
