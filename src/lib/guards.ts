import { redirect } from "next/navigation";
import { currentUser, type SessionUser } from "@/lib/auth";
import type { Role } from "@prisma/client";

/** Page-level guard: redirects to /login when signed out, to home when wrong role. */
export async function requireRolePage(...roles: Role[]): Promise<SessionUser> {
  const user = await currentUser();
  if (!user) redirect("/login");
  if (roles.length && !roles.includes(user.role)) redirect("/");
  return user;
}

export function homeFor(role: Role): string {
  switch (role) {
    case "ORGANIZER":
      return "/organizer";
    case "GATE_STAFF":
      return "/scan";
    case "ADMIN":
      return "/admin";
    default:
      return "/";
  }
}
