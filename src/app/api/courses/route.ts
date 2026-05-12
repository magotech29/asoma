import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";

export async function GET() {
  try {
    const tenant = await requireTenant();
    const courseList = await db.query.courses.findMany({
      where: (c, { eq }) => eq(c.tenantId, tenant.id),
      orderBy: (c, { asc }) => asc(c.sortOrder),
      with: { spots: true },
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
