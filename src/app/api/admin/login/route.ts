import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tenants } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { hashPassword, ADMIN_COOKIE } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { token, password } = await req.json();
    if (!token || !password) {
      return NextResponse.json({ error: "token and password required" }, { status: 400 });
    }

    const tenant = await db.query.tenants.findFirst({
      where: eq(tenants.tenantToken, token),
    });

    if (!tenant || !tenant.isActive || tenant.adminPasswordHash !== hashPassword(password)) {
      return NextResponse.json({ error: "Invalid token or password" }, { status: 401 });
    }

    const response = NextResponse.json({ success: true, tenantName: tenant.name });
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
