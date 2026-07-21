"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";

export default function RegisterOrganizer() {
  const [form, setForm] = useState({ name: "", organizationName: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, role: "ORGANIZER" }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error?.message || "Could not create the account");
      setBusy(false);
      return;
    }
    await signIn("credentials", { email: form.email, password: form.password, redirect: false });
    window.location.href = "/after-login";
  }

  return (
    <div className="mx-auto max-w-sm">
      <h1 className="mb-1 text-xl font-bold">Organizer account</h1>
      <p className="mb-4 text-sm text-ink-700">
        Identity verification (KYC) will be required before payouts — that step arrives in Phase 2.
      </p>
      <form onSubmit={submit} className="card space-y-4 p-5">
        <div>
          <label className="label">Your name</label>
          <input className="input" value={form.name} onChange={set("name")} required />
        </div>
        <div>
          <label className="label">Organization / business name</label>
          <input className="input" value={form.organizationName} onChange={set("organizationName")} required />
        </div>
        <div>
          <label className="label">Email</label>
          <input className="input" type="email" value={form.email} onChange={set("email")} required />
        </div>
        <div>
          <label className="label">Password (min 8 characters)</label>
          <input className="input" type="password" value={form.password} onChange={set("password")} required minLength={8} />
        </div>
        {error && <p className="error-text">{error}</p>}
        <button className="btn-primary w-full" disabled={busy}>{busy ? "Creating…" : "Create organizer account"}</button>
      </form>
    </div>
  );
}
