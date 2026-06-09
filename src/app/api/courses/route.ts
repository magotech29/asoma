import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { courses, events } from "@/lib/db/schema";
import { eq, and, or, isNull, lte, gte } from "drizzle-orm";
import { requireTenant } from "@/lib/tenant";

export async function GET() {
  try {
    const tenant = await requireTenant();
    const now = new Date();

    // 有効なイベントを取得（isActive=true かつ期間内）
    const activeEvent = await db.query.events.findFirst({
      where: and(
        eq(events.tenantId, tenant.id),
        eq(events.isActive, true),
        or(isNull(events.startsAt), lte(events.startsAt, now)),
        or(isNull(events.endsAt), gte(events.endsAt, now))
      ),
      orderBy: (e, { desc }) => desc(e.createdAt),
    });

    if (!activeEvent) {
      return NextResponse.json([]);
    }

    const courseList = await db.query.courses.findMany({
      where: and(
        eq(courses.tenantId, tenant.id),
        eq(courses.eventId, activeEvent.id)
      ),
      orderBy: (c, { asc }) => asc(c.sortOrder),
      with: { spots: { orderBy: (s, { asc }) => asc(s.sortOrder) } },
    });

    return NextResponse.json(courseList);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "Tenant not found") {
      return NextResponse.json({ error: "Invalid access" }, { status: 403 });
    }
    console.error(e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
