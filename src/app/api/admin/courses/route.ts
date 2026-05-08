import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { courses, tenants } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth";

const TENANT_SLUG = process.env.NEXT_PUBLIC_TENANT_SLUG ?? "kasuga";

async function getTenant() {
  return db.query.tenants.findFirst({ where: eq(tenants.slug, TENANT_SLUG) });
}

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const tenant = await getTenant();
  if (!tenant) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

  const list = await db.query.courses.findMany({
    where: eq(courses.tenantId, tenant.id),
    orderBy: (c, { asc }) => asc(c.sortOrder),
    with: { spots: true },
  });
  return NextResponse.json(list);
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const tenant = await getTenant();
  if (!tenant) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

  const body = await req.json();
  const [created] = await db
    .insert(courses)
    .values({ ...body, tenantId: tenant.id })
    .returning();
  return NextResponse.json(created, { status: 201 });
}

export async function PUT(req: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id, ...body } = await req.json();
  const [updated] = await db
    .update(courses)
    .set(body)
    .where(eq(courses.id, id))
    .returning();
  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await req.json();
  await db.delete(courses).where(eq(courses.id, id));
  return NextResponse.json({ success: true });
}
