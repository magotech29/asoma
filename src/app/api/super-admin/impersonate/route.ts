import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin, ADMIN_COOKIE } from "@/lib/auth";
import { db } from "@/lib/db";
import { tenants } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    await requireSuperAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { tenantId } = await req.json();
    if (!tenantId) {
      return NextResponse.json({ error: "tenantId required" }, { status: 400 });
    }
    const tenant = await db.query.tenants.findFirst({
      where: eq(tenants.id, tenantId),
    });
    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }
    // admin_session にテナントIDをセット（コミュニティ管理者ログインと同じ状態）
    const response = NextResponse.json({ success: true });
    response.cookies.set(ADMIN_COOKIE, tenant.id, {
      httpOnly: true,
      maxAge: 60 * 60 * 8,
      path: "/",
    });
    return response;
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
