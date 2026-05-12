import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tenants } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { requireSuperAdmin, hashPassword } from "@/lib/auth";
import { v4 as uuidv4 } from "uuid";

function generateToken(): string {
  return uuidv4().replace(/-/g, "").slice(0, 8);
}

export async function GET() {
  try {
    await requireSuperAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const list = await db.query.tenants.findMany({
      orderBy: (t, { desc }) => desc(t.createdAt),
    });
    return NextResponse.json(list);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireSuperAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { name, slug, adminPassword } = await req.json();
    if (!name || !slug || !adminPassword) {
      return NextResponse.json({ error: "name, slug, adminPassword required" }, { status: 400 });
    }

    const tenantToken = generateToken();
    const [tenant] = await db.insert(tenants)
      .values({ name, slug, tenantToken, adminPasswordHash: hashPassword(adminPassword) })
      .returning();

    return NextResponse.json(tenant, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    await requireSuperAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { id, adminPassword, ...rest } = await req.json();
    const updateData = {
      ...rest,
      ...(adminPassword ? { adminPasswordHash: hashPassword(adminPassword) } : {}),
    };
    const [updated] = await db.update(tenants).set(updateData).where(eq(tenants.id, id)).returning();
    return NextResponse.json(updated);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await requireSuperAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { id } = await req.json();
    await db.delete(tenants).where(eq(tenants.id, id));
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
