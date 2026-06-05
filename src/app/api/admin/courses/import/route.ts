import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { courses, events } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { requireAdminTenant } from "@/lib/auth";
import Papa from "papaparse";

export async function POST(req: NextRequest) {
  try {
    const tenant = await requireAdminTenant();

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "ファイルが選択されていません" }, { status: 400 });
    }

    const text = await file.text();

    const parsed = Papa.parse<Record<string, string>>(text, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim().toLowerCase(),
    });

    if (parsed.errors.length > 0 && parsed.data.length === 0) {
      return NextResponse.json(
        { error: "CSVの解析に失敗しました: " + parsed.errors[0].message },
        { status: 400 }
      );
    }

    if (parsed.data.length === 0) {
      return NextResponse.json({ error: "CSVにデータがありません" }, { status: 400 });
    }

    const headers = parsed.meta.fields ?? [];
    if (!headers.includes("name")) {
      return NextResponse.json({ error: "CSVに name 列が必要です" }, { status: 400 });
    }

    // アクティブなイベントがあれば紐付ける（任意）
    const activeEvent = await db.query.events.findFirst({
      where: and(eq(events.tenantId, tenant.id), eq(events.isActive, true)),
    });

    const existingCourses = await db.query.courses.findMany({
      where: eq(courses.tenantId, tenant.id),
    });

    let added = 0;
    let updated = 0;
    const errors: string[] = [];

    for (let i = 0; i < parsed.data.length; i++) {
      const row = parsed.data[i];
      const rowNum = i + 2;

      const name = row["name"]?.trim() ?? "";
      if (!name) {
        errors.push(`${rowNum}行目: name が空です`);
        continue;
      }

      const distRaw = row["distance_km"]?.trim();
      const durRaw = row["duration_min"]?.trim();
      const sortRaw = row["sort_order"]?.trim();

      const values = {
        name,
        description: row["description"]?.trim() || null,
        distanceKm: distRaw ? parseFloat(distRaw) || null : null,
        durationMin: durRaw ? parseInt(durRaw, 10) || null : null,
        sortOrder: sortRaw ? parseInt(sortRaw, 10) || 0 : 0,
        tenantId: tenant.id,
        eventId: activeEvent?.id ?? null,
      };

      const existing = existingCourses.find((c) => c.name === name);

      if (existing) {
        await db.update(courses).set(values).where(eq(courses.id, existing.id));
        updated++;
      } else {
        await db.insert(courses).values(values);
        added++;
      }
    }

    return NextResponse.json({ added, updated, errors });
  } catch (e: unknown) {
    if (e instanceof Error && e.message === "Unauthorized")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    console.error(e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
