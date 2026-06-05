import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { spots, courses } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { requireAdminTenant } from "@/lib/auth";
import { v4 as uuidv4 } from "uuid";
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
    if (!headers.includes("name") || !headers.includes("course_name")) {
      return NextResponse.json(
        { error: "CSVに name 列と course_name 列が必要です" },
        { status: 400 }
      );
    }

    const courseList = await db.query.courses.findMany({
      where: eq(courses.tenantId, tenant.id),
    });
    const courseByName = new Map(courseList.map((c) => [c.name, c]));

    const existingSpots = await db.query.spots.findMany({
      where: eq(spots.tenantId, tenant.id),
    });

    let added = 0;
    let updated = 0;
    const errors: string[] = [];

    for (let i = 0; i < parsed.data.length; i++) {
      const row = parsed.data[i];
      const rowNum = i + 2; // 1-indexed + header row

      const name = row["name"]?.trim() ?? "";
      const courseName = row["course_name"]?.trim() ?? "";

      if (!name) {
        errors.push(`${rowNum}行目: name が空です`);
        continue;
      }
      if (!courseName) {
        errors.push(`${rowNum}行目: course_name が空です`);
        continue;
      }

      const course = courseByName.get(courseName);
      if (!course) {
        errors.push(`${rowNum}行目: コース「${courseName}」が見つかりません`);
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
        updated++;
      } else {
        await db.insert(spots).values({ ...values, qrToken: uuidv4() });
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
