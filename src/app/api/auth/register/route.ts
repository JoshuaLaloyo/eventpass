import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { jsonError, handleRouteError } from "@/lib/utils";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const name = String(body.name || "").trim();
    const email = String(body.email || "").toLowerCase().trim();
    const password = String(body.password || "");
    const role = body.role === "ORGANIZER" ? "ORGANIZER" : "CUSTOMER";
    const organizationName = role === "ORGANIZER" ? String(body.organizationName || "").trim() : undefined;

    if (!name || !email.includes("@")) return jsonError(400, "VALIDATION", "Name and a valid email are required");
    if (password.length < 8) return jsonError(400, "VALIDATION", "Password must be at least 8 characters");
    if (role === "ORGANIZER" && !organizationName) return jsonError(400, "VALIDATION", "Organization name is required");

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return jsonError(409, "EMAIL_TAKEN", "An account with this email already exists");

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({ data: { name, email, passwordHash, role, organizationName } });
    return NextResponse.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role } }, { status: 201 });
  } catch (e) {
    return handleRouteError(e);
  }
}
