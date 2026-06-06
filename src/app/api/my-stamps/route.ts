import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { participants, stampLogs } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { SESSION_COOKIE } from "@/lib/session";
import { requireTenant } from "@/lib/tenant";

export async function GET() {
  try {
    const tenant = await requireTenant();
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE)?.value;
    if (!token) return NextResponse.json([]);

    const participant = await db.query.participants.findFirst({
      where: eq(participants.sessionToken, token),
    });
    if (!participant) return NextResponse.json([]);

    const logs = await db.query.stampLogs.findMany({
      where: and(
        eq(stampLogs.participantId, participant.id),
        eq(stampLogs.tenantId, tenant.id)
      ),
    });
    return NextResponse.json(logs.map((l) => l.spotId));
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "Tenant not found") {
      return NextResponse.json({ error: "Invalid access" }, { status: 403 });
    }
    console.error(e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
