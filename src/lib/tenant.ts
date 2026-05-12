import { cookies } from "next/headers";
import { db } from "./db";
import { tenants } from "./db/schema";
import { eq } from "drizzle-orm";

export const TENANT_TOKEN_COOKIE = "tenant_token";

export async function getTenantByToken(token: string) {
  return db.query.tenants.findFirst({
    where: eq(tenants.tenantToken, token),
  });
}

export async function getTenantFromCookie() {
  const cookieStore = await cookies();
  const token = cookieStore.get(TENANT_TOKEN_COOKIE)?.value;
  if (!token) return null;
  return getTenantByToken(token);
}

export async function requireTenant() {
  const tenant = await getTenantFromCookie();
  if (!tenant || !tenant.isActive) throw new Error("Tenant not found");
  return tenant;
}
