import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { spots, courses, events } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { requireAdminTenant } from "@/lib/auth";
import { v4 as uuidv4 } from "uuid";
import Papa from "papaparse";

type BulkResult = {
  courses: { added: number; updated: number };
  spots: { added: number; updated: number };
  errors: string[];
};

export async function POST(req: NextRequest): Promise<NextResponse> {
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
    if (!headers.includes("type") || !headers.includes("name")) {
      return NextResponse.json(
        { error: "CSVに type 列と name 列が必要です" },
        { status: 400 }
      );
    }

    const result: BulkResult = {
      courses: { added: 0, updated: 0 },
      spots: { added: 0, updated: 0 },
      errors: [],
    };

    // アクティブイベントを取得（コース紐付け用）
    const activeEvent = await db.query.events.findFirst({
      where: and(eq(events.tenantId, tenant.id), eq(events.isActive, true)),
    });

    // ── PASS 1: コース行を先に処理 ─────────────────────────────────────
    const existingCourses = await db.query.courses.findMany({
      where: eq(courses.tenantId, tenant.id),
    });

    for (let i = 0; i < parsed.data.length; i++) {
      const row = parsed.data[i];
      if (row["type"]?.trim().toLowerCase() !== "course") continue;

      const rowNum = i + 2;
      const name = row["name"]?.trim() ?? "";
      if (!name) {
        result.errors.push(`${rowNum}行目: name が空です`);
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
        result.courses.updated++;
      } else {
        await db.insert(courses).values(values);
        result.courses.added++;
      }
    }

    // ── PASS 2: スポット行を処理（コース登録後にマップ再構築） ─────────
    const freshCourses = await db.query.courses.findMany({
      where: eq(courses.tenantId, tenant.id),
    });
    const courseByName = new Map(freshCourses.map((c) => [c.name, c]));

    const existingSpots = await db.query.spots.findMany({
      where: eq(spots.tenantId, tenant.id),
    });

    for (let i = 0; i < parsed.data.length; i++) {
      const row = parsed.data[i];
      if (row["type"]?.trim().toLowerCase() !== "spot") continue;

      const rowNum = i + 2;
      const name = row["name"]?.trim() ?? "";
      const courseName = row["course_name"]?.trim() ?? "";

      if (!name) {
        result.errors.push(`${rowNum}行目: name が空です`);
        continue;
      }
      if (!courseName) {
        result.errors.push(`${rowNum}行目: course_name が空です`);
        continue;
      }

      const course = courseByName.get(courseName);
      if (!course) {
        result.errors.push(`${rowNum}行目: コース「${courseName}」が見つかりません`);
        continue;
      }

      const sortRaw = row["sort_order"]?.trim();
      const values = {
        name,
        description: row["description"]?.trim() || null,
        address: row["address"]?.trim() || null,
        lat: row["lat"]?.trim() || null,
        lng: row["lng"]?.trim() || null,
        instagramUrl: row["instagram_url"]?.trim() || null,
        websiteUrl: row["website_url"]?.trim() || null,
        sortOrder: sortRaw ? parseInt(sortRaw, 10) || 0 : 0,
        courseId: course.id,
        tenantId: tenant.id,
      };

      const existing = existingSpots.find(
        (s) => s.name === name && s.courseId === course.id
      );

      if (existing) {
        await db.update(spots).set(values).where(eq(spots.id, existing.id));
        result.spots.updated++;
      } else {
        await db.insert(spots).values({ ...values, qrToken: uuidv4() });
        result.spots.added++;
      }
    }

    return NextResponse.json(result);
  } catch (e: unknown) {
    if (e instanceof Error && e.message === "Unauthorized")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    console.error(e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
