"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";

export default function Register() {
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (form.password !== form.confirm) return setError("Passwords do not match");
    setBusy(true);
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: form.name, email: form.email, password: form.password }),
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
      <h1 className="mb-4 text-xl font-bold">Create an account</h1>
      <form onSubmit={submit} className="card space-y-4 p-5">
        <div>
          <label className="label">Full name</label>
          <input className="input" value={form.name} onChange={set("name")} required />
        </div>
        <div>
          <label className="label">Email</label>
          <input className="input" type="email" value={form.email} onChange={set("email")} required />
        </div>
        <div>
          <label className="label">Password (min 8 characters)</label>
          <input className="input" type="password" value={form.password} onChange={set("password")} required minLength={8} />
        </div>
        <div>
          <label className="label">Confirm password</label>
          <input className="input" type="password" value={form.confirm} onChange={set("confirm")} required />
        </div>
        {error && <p className="error-text">{error}</p>}
        <button className="btn-primary w-full" disabled={busy}>{busy ? "Creating…" : "Create account"}</button>
        <button type="button" className="btn-ghost w-full" onClick={() => signIn("google", { callbackUrl: "/after-login" })}>
          Continue with Google
        </button>
        <p className="text-center text-sm text-ink-700">
          Organizing events? <Link className="font-semibold underline" href="/register/organizer">Create an organizer account</Link>
        </p>
      </form>
    </div>
  );
}
