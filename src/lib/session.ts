import { cookies } from "next/headers";
import { v4 as uuidv4 } from "uuid";
import { db } from "./db";
import { participants } from "./db/schema";
import { eq } from "drizzle-orm";

const SESSION_COOKIE = "stamp_session";
const TENANT_SLUG = process.env.NEXT_PUBLIC_TENANT_SLUG ?? "kasuga";

export async function getOrCreateParticipant() {
  const cookieStore = await cookies();
  let token = cookieStore.get(SESSION_COOKIE)?.value;

  if (!token) {
    token = uuidv4();
  }

  const tenant = await db.query.tenants.findFirst({
    where: (t, { eq }) => eq(t.slug, TENANT_SLUG),
  });
  if (!tenant) throw new Error("Tenant not found");

  let participant = await db.query.participants.findFirst({
    where: eq(participants.sessionToken, token),
  });

  if (!participant) {
    const [created] = await db
      .insert(participants)
      .values({ tenantId: tenant.id, sessionToken: token })
      .returning();
    participant = created;
  }

  return { participant, token, tenantId: tenant.id };
}

export async function getParticipant() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  return db.query.participants.findFirst({
    where: eq(participants.sessionToken, token),
  });
}

export { SESSION_COOKIE };
