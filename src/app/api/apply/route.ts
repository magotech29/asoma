import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { participants, prizeApplications } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { SESSION_COOKIE } from "@/lib/session";
import { requireTenant } from "@/lib/tenant";

export async function POST(req: NextRequest) {
  try {
    const tenant = await requireTenant();
    const { name, contact, message } = await req.json();
    if (!name || !contact) {
      return NextResponse.json({ error: "name and contact required" }, { status: 400 });
    }

    const cookieStore = await cookies();
    const sessionToken = cookieStore.get(SESSION_COOKIE)?.value;
    if (!sessionToken) {
      return NextResponse.json({ error: "No session" }, { status: 401 });
    }

    const participant = await db.query.participants.findFirst({
      where: eq(participants.sessionToken, sessionToken),
    });
    if (!participant) {
      return NextResponse.json({ error: "Participant not found" }, { status: 404 });
    }

    const [application] = await db
      .insert(prizeApplications)
      .values({ participantId: participant.id, tenantId: tenant.id, name, contact, message })
      .returning();

    return NextResponse.json({ success: true, id: application.id });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "Tenant not found") {
      return NextResponse.json({ error: "Invalid access" }, { status: 403 });
    }
    console.error(e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
