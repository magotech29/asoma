import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tenants, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { requireSuperAdmin } from "@/lib/auth";
import { hashPassword } from "@/lib/auth";
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
      with: { users: true },
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
    const { name, slug, adminEmail, adminPassword } = await req.json();
    if (!name || !slug || !adminEmail || !adminPassword) {
      return NextResponse.json({ error: "All fields required" }, { status: 400 });
    }

    const tenantToken = generateToken();
    const [tenant] = await db.insert(tenants)
      .values({ name, slug, tenantToken })
      .returning();

    await db.insert(users).values({
      tenantId: tenant.id,
      email: adminEmail,
      passwordHash: hashPassword(adminPassword),
      role: "community_admin",
    });

    return NextResponse.json({ ...tenant }, { status: 201 });
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
