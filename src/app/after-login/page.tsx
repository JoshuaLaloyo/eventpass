import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { homeFor } from "@/lib/guards";

export const dynamic = "force-dynamic";

export default async function AfterLogin() {
  const user = await currentUser();
  redirect(user ? homeFor(user.role) : "/login");
}
