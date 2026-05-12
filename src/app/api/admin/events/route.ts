import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { events } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { requireAdminTenant } from "@/lib/auth";

export async function GET() {
  try {
    const tenant = await requireAdminTenant();
    const list = await db.query.events.findMany({
      where: eq(events.tenantId, tenant.id),
      orderBy: (e, { desc }) => desc(e.createdAt),
    });
    return NextResponse.json(list);
  } catch (e: unknown) {
    if (e instanceof Error && e.message === "Unauthorized")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    console.error(e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const tenant = await requireAdminTenant();
    const body = await req.json();
    const [created] = await db.insert(events).values({ ...body, tenantId: tenant.id }).returning();
    return NextResponse.json(created, { status: 201 });
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
    const { id, ...body } = await req.json();
    const [updated] = await db.update(events).set(body).where(eq(events.id, id)).returning();
    return NextResponse.json(updated);
  } catch (e: unknown) {
    if (e instanceof Error && e.message === "Unauthorized")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    console.error(e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
