import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { courses, spots } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { requireAdminTenant } from "@/lib/auth";
import { v4 as uuidv4 } from "uuid";

export async function POST(req: NextRequest) {
  try {
    const tenant = await requireAdminTenant();
    const { sourceEventId, targetEventId } = await req.json();
    if (!sourceEventId || !targetEventId) {
      return NextResponse.json({ error: "sourceEventId and targetEventId required" }, { status: 400 });
    }

    // コピー元のコース一覧（スポット含む）
    const sourceCourses = await db.query.courses.findMany({
      where: eq(courses.eventId, sourceEventId),
      with: { spots: true },
    });

    let copiedCourses = 0;
    let copiedSpots = 0;

    for (const course of sourceCourses) {
      const [newCourse] = await db.insert(courses).values({
        tenantId: tenant.id,
        eventId: targetEventId,
        name: course.name,
        description: course.description,
        distanceKm: course.distanceKm,
        durationMin: course.durationMin,
        sortOrder: course.sortOrder,
      }).returning();

      for (const spot of course.spots) {
        await db.insert(spots).values({
          tenantId: tenant.id,
          courseId: newCourse.id,
          name: spot.name,
          description: spot.description,
          address: spot.address,
          lat: spot.lat,
          lng: spot.lng,
          qrToken: uuidv4(), // QRコードは必ず新規発行
          sortOrder: spot.sortOrder,
        });
        copiedSpots++;
      }
      copiedCourses++;
    }

    return NextResponse.json({ success: true, copiedCourses, copiedSpots });
  } catch (e: unknown) {
    if (e instanceof Error && e.message === "Unauthorized")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    console.error(e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
