import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { spots, stampLogs, participants } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { SESSION_COOKIE } from "@/lib/session";
import { requireTenant } from "@/lib/tenant";

export async function POST(req: NextRequest) {
  try {
    const tenant = await requireTenant();
    const { qrToken } = await req.json();
    if (!qrToken) {
      return NextResponse.json({ error: "qrToken required" }, { status: 400 });
    }

    const spot = await db.query.spots.findFirst({
      where: and(eq(spots.qrToken, qrToken), eq(spots.tenantId, tenant.id)),
    });
    if (!spot) {
      return NextResponse.json({ error: "Invalid QR code" }, { status: 404 });
    }

    const cookieStore = await cookies();
    const existingToken = cookieStore.get(SESSION_COOKIE)?.value;
    let sessionToken: string = existingToken ?? uuidv4();

    let participant = existingToken
      ? await db.query.participants.findFirst({
          where: eq(participants.sessionToken, existingToken),
        })
      : null;

    if (!participant) {
      const [created] = await db
        .insert(participants)
        .values({ tenantId: tenant.id, sessionToken })
        .returning();
      participant = created;
    }

    const existing = await db.query.stampLogs.findFirst({
      where: and(
        eq(stampLogs.participantId, participant.id),
        eq(stampLogs.spotId, spot.id)
      ),
    });
    if (existing) {
      return NextResponse.json({ alreadyStamped: true, spotName: spot.name });
    }

    await db.insert(stampLogs).values({
      participantId: participant.id,
      spotId: spot.id,
      tenantId: tenant.id,
    });

    const response = NextResponse.json({ success: true, spotName: spot.name, sessionToken });
    if (!existingToken) {
      response.cookies.set(SESSION_COOKIE, sessionToken, {
        httpOnly: true,
        maxAge: 60 * 60 * 24 * 30,
        path: "/",
      });
    }
    return response;
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "Tenant not found") {
      return NextResponse.json({ error: "Invalid access" }, { status: 403 });
    }
    console.error(e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
