import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getTenantByToken, TENANT_TOKEN_COOKIE } from "@/lib/tenant";
import { SESSION_COOKIE } from "@/lib/session";
import { db } from "@/lib/db";
import { participants } from "@/lib/db/schema";
import { v4 as uuidv4 } from "uuid";

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

    const maxAgeSec = tenant.sessionMaxAgeDays * 24 * 60 * 60;

    const cookieStore = await cookies();
    const existingSession = cookieStore.get(SESSION_COOKIE)?.value;
    const sessionToken = existingSession ?? uuidv4();

    if (!existingSession) {
      await db.insert(participants).values({
        tenantId: tenant.id,
        sessionToken,
      });
    }

    const response = NextResponse.json({ success: true, tenantName: tenant.name });
    response.cookies.set(TENANT_TOKEN_COOKIE, token, {
      httpOnly: true,
      maxAge: maxAgeSec,
      path: "/",
    });
    if (!existingSession) {
      response.cookies.set(SESSION_COOKIE, sessionToken, {
        httpOnly: true,
        maxAge: maxAgeSec,
        path: "/",
      });
    }
    return response;
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
