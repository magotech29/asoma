import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { spots, tenants } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth";
import { v4 as uuidv4 } from "uuid";

const TENANT_SLUG = process.env.NEXT_PUBLIC_TENANT_SLUG ?? "kasuga";

async function getTenant() {
  return db.query.tenants.findFirst({ where: eq(tenants.slug, TENANT_SLUG) });
}

export async function GET() {
  try { await requireAdmin(); } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const tenant = await getTenant();
  if (!tenant) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

  const list = await db.query.spots.findMany({
    where: eq(spots.tenantId, tenant.id),
    orderBy: (s, { asc }) => [asc(s.courseId), asc(s.sortOrder)],
  });
  return NextResponse.json(list);
}

export async function POST(req: NextRequest) {
  try { await requireAdmin(); } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const tenant = await getTenant();
  if (!tenant) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

  const body = await req.json();
  const [created] = await db
    .insert(spots)
    .values({ ...body, tenantId: tenant.id, qrToken: uuidv4() })
    .returning();
  return NextResponse.json(created, { status: 201 });
}

export async function PUT(req: NextRequest) {
  try { await requireAdmin(); } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id, ...body } = await req.json();
  const [updated] = await db
    .update(spots).set(body).where(eq(spots.id, id)).returning();
  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest) {
  try { await requireAdmin(); } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await req.json();
  await db.delete(spots).where(eq(spots.id, id));
  return NextResponse.json({ success: true });
}
