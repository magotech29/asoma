import { cookies } from "next/headers";
import { v4 as uuidv4 } from "uuid";
import { db } from "./db";
import { participants } from "./db/schema";
import { eq } from "drizzle-orm";

export const SESSION_COOKIE = "stamp_session";

export async function getOrCreateParticipant(tenantId: string) {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value ?? uuidv4();

  let participant = await db.query.participants.findFirst({
    where: eq(participants.sessionToken, token),
  });

  if (!participant) {
    const [created] = await db
      .insert(participants)
      .values({ tenantId, sessionToken: token })
      .returning();
    participant = created;
  }

  return { participant, token };
}

export async function getParticipant() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return db.query.participants.findFirst({
    where: eq(participants.sessionToken, token),
  });
}
