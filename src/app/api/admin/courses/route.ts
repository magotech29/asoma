import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { courses } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { requireAdminTenant } from "@/lib/auth";

export async function GET() {
  try {
    const tenant = await requireAdminTenant();
    const list = await db.query.courses.findMany({
      where: eq(courses.tenantId, tenant.id),
      orderBy: (c, { asc }) => asc(c.sortOrder),
      with: { spots: true },
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
    const [created] = await db.insert(courses).values({ ...body, tenantId: tenant.id }).returning();
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
    const [updated] = await db.update(courses).set(body).where(eq(courses.id, id)).returning();
    return NextResponse.json(updated);
  } catch (e: unknown) {
    if (e instanceof Error && e.message === "Unauthorized")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    console.error(e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await requireAdminTenant();
    const { id } = await req.json();
    await db.delete(courses).where(eq(courses.id, id));
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    if (e instanceof Error && e.message === "Unauthorized")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    console.error(e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
