import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { jsonError, handleRouteError } from "@/lib/utils";

// Minimal MVP staff creation. Full staff management (event scoping, removal) is Phase 2.
export async function POST(req: NextRequest) {
  try {
    await requireRole("ORGANIZER");
    const body = await req.json();
    const name = String(body.name || "").trim();
    const email = String(body.email || "").toLowerCase().trim();
    const password = String(body.password || "");
    if (!name || !email.includes("@")) return jsonError(400, "VALIDATION", "Name and a valid email are required");
    if (password.length < 8) return jsonError(400, "VALIDATION", "Password must be at least 8 characters");

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return jsonError(409, "EMAIL_TAKEN", "An account with this email already exists");

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({ data: { name, email, passwordHash, role: "GATE_STAFF" } });
    return NextResponse.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role } }, { status: 201 });
  } catch (e) {
    return handleRouteError(e);
  }
}

export async function GET() {
  try {
    await requireRole("ORGANIZER");
    const staff = await prisma.user.findMany({ where: { role: "GATE_STAFF" }, orderBy: { createdAt: "desc" } });
    return NextResponse.json({ staff: staff.map((s) => ({ id: s.id, name: s.name, email: s.email })) });
  } catch (e) {
    return handleRouteError(e);
  }
}
