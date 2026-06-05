import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { prizeApplications } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { requireAdminTenant } from "@/lib/auth";

export async function GET() {
  try {
    const tenant = await requireAdminTenant();
    const list = await db.query.prizeApplications.findMany({
      where: eq(prizeApplications.tenantId, tenant.id),
      orderBy: (a, { desc }) => desc(a.createdAt),
    });
    return NextResponse.json(list);
  } catch (e: unknown) {
    if (e instanceof Error && e.message === "Unauthorized")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    console.error(e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    await requireAdminTenant();
    const { id, status } = await req.json();
    const [updated] = await db.update(prizeApplications).set({ status }).where(eq(prizeApplications.id, id)).returning();
    return NextResponse.json(updated);
  } catch (e: unknown) {
    if (e instanceof Error && e.message === "Unauthorized")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    console.error(e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
