import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { events } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { requireAdminTenant } from "@/lib/auth";

const BUCKET = "event-images";

async function ensureBucket(supabaseUrl: string, serviceKey: string) {
  await fetch(`${supabaseUrl}/storage/v1/bucket`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ id: BUCKET, name: BUCKET, public: true }),
  });
}

export async function POST(req: NextRequest) {
  try {
    const tenant = await requireAdminTenant();
    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: "Storage not configured" }, { status: 500 });
    }

    const formData = await req.formData();
    const eventId = formData.get("eventId") as string;
    const imageFile = formData.get("image") as File | null;
    if (!eventId || !imageFile) {
      return NextResponse.json({ error: "eventId and image required" }, { status: 400 });
    }

    await ensureBucket(supabaseUrl, serviceKey);

    const path = `${tenant.id}/${eventId}.jpg`;
    const buffer = await imageFile.arrayBuffer();
    const uploadRes = await fetch(`${supabaseUrl}/storage/v1/object/${BUCKET}/${path}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "image/jpeg",
        "x-upsert": "true",
      },
      body: buffer,
    });

    if (!uploadRes.ok) {
      const err = await uploadRes.text();
      console.error("Storage upload failed:", uploadRes.status, err);
      return NextResponse.json({ error: `Storage error ${uploadRes.status}: ${err}` }, { status: 500 });
    }

    const imageUrl = `${supabaseUrl}/storage/v1/object/public/${BUCKET}/${path}`;
    await db.update(events).set({ imageUrl }).where(eq(events.id, eventId));

    return NextResponse.json({ imageUrl });
  } catch (e: unknown) {
    if (e instanceof Error && e.message === "Unauthorized")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    console.error(e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const tenant = await requireAdminTenant();
    const { eventId } = await req.json();
    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: "Storage not configured" }, { status: 500 });
    }

    const path = `${tenant.id}/${eventId}.jpg`;
    await fetch(`${supabaseUrl}/storage/v1/object/${BUCKET}/${path}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${serviceKey}` },
    });

    await db.update(events).set({ imageUrl: null }).where(eq(events.id, eventId));
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    if (e instanceof Error && e.message === "Unauthorized")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    console.error(e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
