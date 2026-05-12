import { NextResponse } from "next/server";
import { requireAdminTenant } from "@/lib/auth";

export async function GET() {
  try {
    const tenant = await requireAdminTenant();
    return NextResponse.json({ id: tenant.id, name: tenant.name });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
