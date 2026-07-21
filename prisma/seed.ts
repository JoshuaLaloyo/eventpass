import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function upsertUser(email: string, name: string, role: Role, password: string, organizationName?: string) {
  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, name, role, passwordHash, organizationName },
  });
  console.log(`ready: ${email} (${role}) password: ${password}`);
}

async function main() {
  // The platform admin cannot self-register — it is created here.
  await upsertUser(process.env.ADMIN_EMAIL || "admin@eventpass.test", "Platform Admin", "ADMIN", process.env.ADMIN_PASSWORD || "admin12345");

  if (process.env.SEED_TEST_ACCOUNTS === "true") {
    await upsertUser("organizer@test.com", "Test Organizer", "ORGANIZER", "organizer1", "Gulu Events Ltd");
    await upsertUser("customer1@test.com", "Customer One", "CUSTOMER", "customer11");
    await upsertUser("customer2@test.com", "Customer Two", "CUSTOMER", "customer22");
    await upsertUser("gate@test.com", "Gate Staff", "GATE_STAFF", "gatestaff1");
  }
}

main().finally(() => prisma.$disconnect());
