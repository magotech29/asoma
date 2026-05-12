import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { participants, stampLogs, spots, courses } from "@/lib/db/schema";
import { eq, count, sql } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  try {
    const user = await requireAdmin();
    if (!user.tenantId) return NextResponse.json({ error: "No tenant" }, { status: 400 });
    const tid = user.tenantId;

    const [{ participantCount }] = await db
      .select({ participantCount: count() })
      .from(participants).where(eq(participants.tenantId, tid));

    const [{ stampCount }] = await db
      .select({ stampCount: count() })
      .from(stampLogs).where(eq(stampLogs.tenantId, tid));

    const [{ spotCount }] = await db
      .select({ spotCount: count() })
      .from(spots).where(eq(spots.tenantId, tid));

    const [{ courseCount }] = await db
      .select({ courseCount: count() })
      .from(courses).where(eq(courses.tenantId, tid));

    const completedResult = await db.execute(sql`
      SELECT COUNT(DISTINCT p.id) as completed_count
      FROM participants p
      WHERE p.tenant_id = ${tid}
        AND (
          SELECT COUNT(DISTINCT sl.spot_id)
          FROM stamp_logs sl
          WHERE sl.participant_id = p.id
        ) >= ${spotCount}
        AND ${spotCount} > 0
    `);
    const completedCount = Number((completedResult[0] as { completed_count: string }).completed_count);

    const spotStats = await db
      .select({ spotId: stampLogs.spotId, visitCount: count() })
      .from(stampLogs).where(eq(stampLogs.tenantId, tid))
      .groupBy(stampLogs.spotId);

    const spotDetails = await db.query.spots.findMany({ where: eq(spots.tenantId, tid) });
    const spotRanking = spotDetails
      .map((s) => ({
        name: s.name,
        count: spotStats.find((st) => st.spotId === s.id)?.visitCount ?? 0,
      }))
      .sort((a, b) => Number(b.count) - Number(a.count));

    return NextResponse.json({
      participantCount: Number(participantCount),
      stampCount: Number(stampCount),
      spotCount: Number(spotCount),
      courseCount: Number(courseCount),
      completedCount,
      completionRate: Number(participantCount) > 0
        ? Math.round((completedCount / Number(participantCount)) * 100)
        : 0,
      spotRanking,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "Unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    console.error(e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
