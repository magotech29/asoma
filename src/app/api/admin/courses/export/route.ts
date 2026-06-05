import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { courses } from "@/lib/db/schema";
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

    const header = "name,description,distance_km,duration_min,sort_order";
    const rows = courseList.map((c) =>
      [
        escapeCSV(c.name),
        escapeCSV(c.description),
        escapeCSV(c.distanceKm),
        escapeCSV(c.durationMin),
        escapeCSV(c.sortOrder),
      ].join(",")
    );

    const csv = "\uFEFF" + [header, ...rows].join("\n");

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="courses.csv"',
      },
    });
  } catch (e: unknown) {
    if (e instanceof Error && e.message === "Unauthorized")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    console.error(e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
