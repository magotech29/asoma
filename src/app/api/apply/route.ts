import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { participants, prizeApplications, tenants } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { SESSION_COOKIE } from "@/lib/session";

const TENANT_SLUG = process.env.NEXT_PUBLIC_TENANT_SLUG ?? "kasuga";

export async function POST(req: NextRequest) {
  const { name, contact, message } = await req.json();
  if (!name || !contact) {
    return NextResponse.json({ error: "name and contact required" }, { status: 400 });
  }

  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE)?.value;
  if (!sessionToken) {
    return NextResponse.json({ error: "No session" }, { status: 401 });
  }

  const tenant = await db.query.tenants.findFirst({
    where: eq(tenants.slug, TENANT_SLUG),
  });
  if (!tenant) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  const participant = await db.query.participants.findFirst({
    where: eq(participants.sessionToken, sessionToken),
  });
  if (!participant) {
    return NextResponse.json({ error: "Participant not found" }, { status: 404 });
  }

  const [application] = await db
    .insert(prizeApplications)
    .values({
      participantId: participant.id,
      tenantId: tenant.id,
      name,
      contact,
      message,
    })
    .returning();

  return NextResponse.json({ success: true, id: application.id });
}
