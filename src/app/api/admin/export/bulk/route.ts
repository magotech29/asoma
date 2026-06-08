import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { spots, courses } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { requireAdminTenant } from "@/lib/auth";

function escapeCSV(val: string | number | null | undefined): string {
  if (val === null || val === undefined) return "";
  const str = String(val);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

export async function GET() {
  try {
    const tenant = await requireAdminTenant();

    const courseList = await db.query.courses.findMany({
      where: eq(courses.tenantId, tenant.id),
      orderBy: (c, { asc }) => asc(c.sortOrder),
    });
    const courseMap = new Map(courseList.map((c) => [c.id, c.name]));

    const spotList = await db.query.spots.findMany({
      where: eq(spots.tenantId, tenant.id),
      orderBy: (s, { asc }) => [asc(s.courseId), asc(s.sortOrder)],
    });

    const header = "type,name,description,distance_km,duration_min,sort_order,address,lat,lng,instagram_url,website_url,course_name";

    const courseRows = courseList.map((c) =>
      [
        "course",
        escapeCSV(c.name),
        escapeCSV(c.description),
        escapeCSV(c.distanceKm),
        escapeCSV(c.durationMin),
        escapeCSV(c.sortOrder),
        "", "", "", "", "", "",
      ].join(",")
    );

    const spotRows = spotList.map((s) =>
      [
        "spot",
        escapeCSV(s.name),
        escapeCSV(s.description),
        "", "",
        escapeCSV(s.sortOrder),
        escapeCSV(s.address),
        escapeCSV(s.lat),
        escapeCSV(s.lng),
        escapeCSV(s.instagramUrl),
        escapeCSV(s.websiteUrl),
        escapeCSV(courseMap.get(s.courseId) ?? ""),
      ].join(",")
    );

    const csv = "\uFEFF" + [header, ...courseRows, ...spotRows].join("\n");

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="bulk-export.csv"',
      },
    });
  } catch (e: unknown) {
    if (e instanceof Error && e.message === "Unauthorized")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    console.error(e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
