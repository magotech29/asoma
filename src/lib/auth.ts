import { cookies } from "next/headers";
import { db } from "./db";
import { tenants } from "./db/schema";
import { eq } from "drizzle-orm";
import { createHash } from "crypto";

export const ADMIN_COOKIE = "admin_session"; // テナントIDを保存
export const SUPER_ADMIN_COOKIE = "super_admin_session";

export function hashPassword(password: string) {
  return createHash("sha256").update(password).digest("hex");
}

export async function getAdminTenantId(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(ADMIN_COOKIE)?.value ?? null;
}

export async function requireAdminTenant() {
  const tenantId = await getAdminTenantId();
  if (!tenantId) throw new Error("Unauthorized");
  const tenant = await db.query.tenants.findFirst({
    where: eq(tenants.id, tenantId),
  });
  if (!tenant) throw new Error("Unauthorized");
  return tenant;
}

export async function isSuperAdminSession() {
  const cookieStore = await cookies();
  return cookieStore.get(SUPER_ADMIN_COOKIE)?.value === "1";
}

export async function requireSuperAdmin() {
  const ok = await isSuperAdminSession();
  if (!ok) throw new Error("Unauthorized");
}
