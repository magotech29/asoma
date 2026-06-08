import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { spots } from "@/lib/db/schema";
import { eq, count, sql } from "drizzle-orm";
import { requireAdminTenant } from "@/lib/auth";

function escapeCSV(val: string | number | boolean | null | undefined): string {
  if (val === null || val === undefined) return "";
  const str = String(val);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

const STATUS_LABEL: Record<string, string> = {
  pending: "未対応",
  won: "当選",
  lost: "落選",
};

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
            SELECT string_agg(s2.name, '/' ORDER BY sl2.stamped_at)
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

    const header = "参加者ID,ニックネーム,参加日時,取得スポット数,取得スポット名,完走,応募状況";
    const dataRows = (rows as Record<string, unknown>[]).map((r) => {
      const stampCount = Number(r.stampCount);
      const completed = stampCount >= totalSpots && totalSpots > 0;
      const appStatus = r.applicationStatus
        ? (STATUS_LABEL[r.applicationStatus as string] ?? String(r.applicationStatus))
        : "未応募";
      const createdAt = r.createdAt
        ? new Date(r.createdAt as string).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })
        : "";
      return [
        escapeCSV(r.id as string),
        escapeCSV(r.nickname as string | null),
        escapeCSV(createdAt),
        escapeCSV(stampCount),
        escapeCSV(r.stampedSpots as string),
        escapeCSV(completed ? "完走" : ""),
        escapeCSV(appStatus),
      ].join(",");
    });

    const csv = "\uFEFF" + [header, ...dataRows].join("\n");

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="participants.csv"',
      },
    });
  } catch (e: unknown) {
    if (e instanceof Error && e.message === "Unauthorized")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    console.error(e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
