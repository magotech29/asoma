import { NextResponse } from "next/server";
import { SUPER_ADMIN_COOKIE } from "@/lib/auth";

export async function POST() {
  const response = NextResponse.json({ success: true });
  response.cookies.set(SUPER_ADMIN_COOKIE, "", { maxAge: 0, path: "/" });
  return response;
}
