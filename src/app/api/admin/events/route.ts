import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { events } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { requireAdminTenant } from "@/lib/auth";

function toDate(val: string | null | undefined): Date | null {
  if (!val) return null;
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
}

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
    const { name, description, startsAt, endsAt, isActive } = await req.json();
    const [created] = await db.insert(events).values({
      tenantId: tenant.id,
      name,
      description: description ?? null,
      startsAt: toDate(startsAt),
      endsAt: toDate(endsAt),
      isActive: isActive ?? true,
    }).returning();
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
    const { id, name, description, startsAt, endsAt, isActive, imageUrl } = await req.json();
    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description ?? null;
    if (startsAt !== undefined) updateData.startsAt = toDate(startsAt);
    if (endsAt !== undefined) updateData.endsAt = toDate(endsAt);
    if (isActive !== undefined) updateData.isActive = isActive;
    if (imageUrl !== undefined) updateData.imageUrl = imageUrl ?? null;

    const [updated] = await db.update(events).set(updateData).where(eq(events.id, id)).returning();
    return NextResponse.json(updated);
  } catch (e: unknown) {
    if (e instanceof Error && e.message === "Unauthorized")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    console.error(e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
