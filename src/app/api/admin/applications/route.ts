import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { prizeApplications } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  try {
    const user = await requireAdmin();
    if (!user.tenantId) return NextResponse.json({ error: "No tenant" }, { status: 400 });
    const list = await db.query.prizeApplications.findMany({
      where: eq(prizeApplications.tenantId, user.tenantId),
      orderBy: (a, { desc }) => desc(a.createdAt),
    });
    return NextResponse.json(list);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "Unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    console.error(e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    await requireAdmin();
    const { id, status } = await req.json();
    const [updated] = await db
      .update(prizeApplications).set({ status }).where(eq(prizeApplications.id, id)).returning();
    return NextResponse.json(updated);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "Unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    console.error(e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
