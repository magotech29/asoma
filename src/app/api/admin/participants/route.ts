import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { spots } from "@/lib/db/schema";
import { eq, count, sql } from "drizzle-orm";
import { requireAdminTenant } from "@/lib/auth";

export async function GET() {
  try {
    const tenant = await requireAdminTenant();
    const tid = tenant.id;

    const spotCountResult = await db
      .select({ count: count() })
      .from(spots)
      .where(eq(spots.tenantId, tid));
    const totalSpots = Number(spotCountResult[0].count);

    const rows = await db.execute(sql`
      SELECT
        p.id,
        p.nickname,
        p.created_at AS "createdAt",
        COUNT(DISTINCT sl.spot_id)::int AS "stampCount",
        COALESCE(
          (
            SELECT string_agg(s2.name, ', ' ORDER BY sl2.stamped_at)
            FROM stamp_logs sl2
            JOIN spots s2 ON s2.id = sl2.spot_id
            WHERE sl2.participant_id = p.id
          ),
          ''
        ) AS "stampedSpots",
        latest_app.status AS "applicationStatus"
      FROM participants p
      LEFT JOIN stamp_logs sl ON sl.participant_id = p.id
      LEFT JOIN LATERAL (
        SELECT status
        FROM prize_applications pa
        WHERE pa.participant_id = p.id
          AND pa.tenant_id = ${tid}
        ORDER BY pa.created_at DESC
        LIMIT 1
      ) latest_app ON true
      WHERE p.tenant_id = ${tid}
      GROUP BY p.id, p.nickname, p.created_at, latest_app.status
      ORDER BY p.created_at DESC
    `);

    const result = (rows as Record<string, unknown>[]).map((r) => ({
      id: r.id,
      nickname: r.nickname ?? null,
      createdAt: r.createdAt,
      stampCount: Number(r.stampCount),
      stampedSpots: r.stampedSpots,
      applicationStatus: r.applicationStatus ?? null,
      completed: Number(r.stampCount) >= totalSpots && totalSpots > 0,
    }));

    return NextResponse.json({ participants: result, totalSpots });
  } catch (e: unknown) {
    if (e instanceof Error && e.message === "Unauthorized")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    console.error(e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
