import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { spots } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { requireAdminTenant } from "@/lib/auth";
import { v4 as uuidv4 } from "uuid";

export async function GET() {
  try {
    const tenant = await requireAdminTenant();
    const list = await db.query.spots.findMany({
      where: eq(spots.tenantId, tenant.id),
      orderBy: (s, { asc }) => [asc(s.courseId), asc(s.sortOrder)],
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
    const [created] = await db.insert(spots)
      .values({
        ...body,
        lat: body.lat ? String(body.lat) : null,
        lng: body.lng ? String(body.lng) : null,
        tenantId: tenant.id,
        qrToken: uuidv4(),
      })
      .returning();
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
    const [updated] = await db.update(spots).set({
      ...body,
      lat: body.lat ? String(body.lat) : null,
      lng: body.lng ? String(body.lng) : null,
    }).where(eq(spots.id, id)).returning();
    return NextResponse.json(updated);
  } catch (e: unknown) {
    if (e instanceof Error && e.message === "Unauthorized")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    console.error(e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await requireAdminTenant();
    const { id, sortOrder } = await req.json();
    const [updated] = await db.update(spots).set({ sortOrder }).where(eq(spots.id, id)).returning();
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
    await db.delete(spots).where(eq(spots.id, id));
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    if (e instanceof Error && e.message === "Unauthorized")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    console.error(e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
