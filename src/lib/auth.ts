import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import type { Role } from "@prisma/client";

const providers: any[] = [
  Credentials({
    name: "Email & password",
    credentials: { email: {}, password: {} },
    async authorize(credentials) {
      const email = String(credentials?.email || "").toLowerCase().trim();
      const password = String(credentials?.password || "");
      if (!email || !password) return null;
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user?.passwordHash) return null;
      const ok = await bcrypt.compare(password, user.passwordHash);
      if (!ok) return null;
      return { id: user.id, name: user.name, email: user.email, role: user.role } as any;
    },
  }),
];

export const googleEnabled = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
if (googleEnabled) {
  providers.push(Google({ clientId: process.env.GOOGLE_CLIENT_ID!, clientSecret: process.env.GOOGLE_CLIENT_SECRET! }));
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers,
  callbacks: {
    async signIn({ user, account }) {
      // Google sign-in: make sure a DB user exists (role CUSTOMER by default)
      if (account?.provider === "google" && user.email) {
        const dbUser = await prisma.user.upsert({
          where: { email: user.email.toLowerCase() },
          update: {},
          create: { email: user.email.toLowerCase(), name: user.name || user.email, role: "CUSTOMER" },
        });
        (user as any).id = dbUser.id;
        (user as any).role = dbUser.role;
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.uid = (user as any).id;
        token.role = (user as any).role;
      }
      // Refresh role from DB when missing (e.g. first Google login edge cases)
      if (!token.role && token.email) {
        const dbUser = await prisma.user.findUnique({ where: { email: String(token.email).toLowerCase() } });
        if (dbUser) {
          token.uid = dbUser.id;
          token.role = dbUser.role;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.uid as string;
        (session.user as any).role = token.role as Role;
      }
      return session;
    },
  },
});

export type SessionUser = { id: string; name?: string | null; email?: string | null; role: Role };

/** Returns the session user or null. */
export async function currentUser(): Promise<SessionUser | null> {
  const session = await auth();
  const u = session?.user as any;
  if (!u?.id) return null;
  return { id: u.id, name: u.name, email: u.email, role: u.role };
}

/** Throws a Response-friendly error object when role does not match. */
export async function requireRole(...roles: Role[]): Promise<SessionUser> {
  const user = await currentUser();
  if (!user) throw { status: 401, code: "UNAUTHENTICATED", message: "Sign in required" };
  if (roles.length && !roles.includes(user.role)) throw { status: 403, code: "FORBIDDEN", message: "You do not have access to this action" };
  return user;
}
