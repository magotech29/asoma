import { NextRequest, NextResponse } from "next/server";
import { getTenantByToken } from "@/lib/tenant";
import { TENANT_TOKEN_COOKIE } from "@/lib/tenant";

export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json();
    if (!token) {
      return NextResponse.json({ error: "token required" }, { status: 400 });
    }
    const tenant = await getTenantByToken(token);
    if (!tenant || !tenant.isActive) {
      return NextResponse.json({ error: "Invalid token" }, { status: 404 });
    }
    const response = NextResponse.json({ success: true, tenantName: tenant.name });
    response.cookies.set(TENANT_TOKEN_COOKIE, token, {
      httpOnly: true,
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
    });
    return response;
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
