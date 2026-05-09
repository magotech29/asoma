import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { prizeApplications, tenants } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth";

const TENANT_SLUG = process.env.NEXT_PUBLIC_TENANT_SLUG ?? "kasuga";

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const tenant = await db.query.tenants.findFirst({ where: eq(tenants.slug, TENANT_SLUG) });
    if (!tenant) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

    const list = await db.query.prizeApplications.findMany({
      where: eq(prizeApplications.tenantId, tenant.id),
      orderBy: (a, { desc }) => desc(a.createdAt),
    });
    return NextResponse.json(list);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { id, status } = await req.json();
    const [updated] = await db
      .update(prizeApplications)
      .set({ status })
      .where(eq(prizeApplications.id, id))
      .returning();
    return NextResponse.json(updated);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
