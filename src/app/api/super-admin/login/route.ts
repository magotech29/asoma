import { NextRequest, NextResponse } from "next/server";
import { verifySuperAdmin } from "@/lib/super-auth";
import { SUPER_ADMIN_COOKIE } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: "email and password required" }, { status: 400 });
    }
    if (!verifySuperAdmin(email, password)) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }
    const response = NextResponse.json({ success: true });
    response.cookies.set(SUPER_ADMIN_COOKIE, "1", {
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
