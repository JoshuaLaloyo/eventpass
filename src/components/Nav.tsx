import Link from "next/link";
import { currentUser, signOut } from "@/lib/auth";

export default async function Nav() {
  const user = await currentUser();
  return (
    <header className="sticky top-0 z-20 border-b border-ink-900/10 bg-ink-900 text-white">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <Link href="/" className="flex items-baseline gap-1 text-lg font-bold tracking-tight">
          Event<span className="text-accent">Pass</span>
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          {!user && (
            <>
              <Link className="rounded-md px-3 py-1.5 hover:bg-white/10" href="/login">Sign in</Link>
              <Link className="rounded-md bg-accent px-3 py-1.5 font-semibold text-ink-900 hover:bg-accent-dark" href="/register">
                Create account
              </Link>
            </>
          )}
          {user?.role === "CUSTOMER" && (
            <Link className="rounded-md px-3 py-1.5 hover:bg-white/10" href="/my-tickets">My tickets</Link>
          )}
          {user?.role === "ORGANIZER" && (
            <>
              <Link className="rounded-md px-3 py-1.5 hover:bg-white/10" href="/organizer">My events</Link>
              <Link className="rounded-md px-3 py-1.5 hover:bg-white/10" href="/organizer/staff">Gate staff</Link>
            </>
          )}
          {user?.role === "GATE_STAFF" && (
            <Link className="rounded-md px-3 py-1.5 hover:bg-white/10" href="/scan">Scanner</Link>
          )}
          {user?.role === "ADMIN" && (
            <Link className="rounded-md px-3 py-1.5 hover:bg-white/10" href="/admin">Dashboard</Link>
          )}
          {user && (
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/" });
              }}
            >
              <button className="ml-1 rounded-md border border-white/20 px-3 py-1.5 hover:bg-white/10">Sign out</button>
            </form>
          )}
        </nav>
      </div>
    </header>
  );
}
