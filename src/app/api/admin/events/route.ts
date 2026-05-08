import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { events, tenants } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth";

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

  const list = await db.query.events.findMany({
    where: eq(events.tenantId, tenant.id),
    orderBy: (e, { desc }) => desc(e.createdAt),
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
    .insert(events)
    .values({ ...body, tenantId: tenant.id })
    .returning();
  return NextResponse.json(created, { status: 201 });
}

export async function PUT(req: NextRequest) {
  try { await requireAdmin(); } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id, ...body } = await req.json();
  const [updated] = await db
    .update(events).set(body).where(eq(events.id, id)).returning();
  return NextResponse.json(updated);
}
