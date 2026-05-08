import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tenants } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

const TENANT_SLUG = process.env.NEXT_PUBLIC_TENANT_SLUG ?? "kasuga";

export async function GET() {
  const tenant = await db.query.tenants.findFirst({
    where: eq(tenants.slug, TENANT_SLUG),
  });
  if (!tenant) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  const courseList = await db.query.courses.findMany({
    where: (c, { eq }) => eq(c.tenantId, tenant.id),
    orderBy: (c, { asc }) => asc(c.sortOrder),
    with: {
      spots: true,
    },
  });

  return NextResponse.json(courseList);
}
