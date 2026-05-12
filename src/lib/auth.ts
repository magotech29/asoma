import { cookies } from "next/headers";
import { db } from "./db";
import { users } from "./db/schema";
import { eq } from "drizzle-orm";
import { createHash } from "crypto";

export const ADMIN_COOKIE = "admin_session";
export const SUPER_ADMIN_COOKIE = "super_admin_session";

export function hashPassword(password: string) {
  return createHash("sha256").update(password).digest("hex");
}

export async function getAdminUser() {
  const cookieStore = await cookies();
  const userId = cookieStore.get(ADMIN_COOKIE)?.value;
  if (!userId) return null;
  return db.query.users.findFirst({ where: eq(users.id, userId) });
}

export async function requireAdmin() {
  const user = await getAdminUser();
  if (!user) throw new Error("Unauthorized");
  return user;
}

export async function isSuperAdminSession() {
  const cookieStore = await cookies();
  return cookieStore.get(SUPER_ADMIN_COOKIE)?.value === "1";
}

export async function requireSuperAdmin() {
  const ok = await isSuperAdminSession();
  if (!ok) throw new Error("Unauthorized");
}
