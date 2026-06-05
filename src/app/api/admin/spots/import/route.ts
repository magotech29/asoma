import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { spots, courses } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { requireAdminTenant } from "@/lib/auth";
import { v4 as uuidv4 } from "uuid";

function parseCSV(text: string): string[][] {
  const normalized = text.replace(/\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = normalized.split("\n").filter((l) => l.trim() !== "");
  return lines.map((line) => {
    const fields: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuotes) {
        if (ch === '"' && line[i + 1] === '"') {
          current += '"';
          i++;
        } else if (ch === '"') {
          inQuotes = false;
        } else {
          current += ch;
        }
      } else {
        if (ch === '"') {
          inQuotes = true;
        } else if (ch === ",") {
          fields.push(current);
          current = "";
        } else {
          current += ch;
        }
      }
    }
    fields.push(current);
    return fields;
  });
}

export async function POST(req: NextRequest) {
  try {
    const tenant = await requireAdminTenant();

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "ファイルが選択されていません" }, { status: 400 });
    }

    const text = await file.text();
    const rows = parseCSV(text);

    if (rows.length < 2) {
      return NextResponse.json({ error: "CSVにデータがありません" }, { status: 400 });
    }

    const header = rows[0].map((h) => h.trim().toLowerCase());
    const idx = (name: string) => header.indexOf(name);

    const nameIdx = idx("name");
    const courseIdx = idx("course_name");

    if (nameIdx < 0 || courseIdx < 0) {
      return NextResponse.json(
        { error: "CSVに name 列と course_name 列が必要です" },
        { status: 400 }
      );
    }

    const descIdx = idx("description");
    const addrIdx = idx("address");
    const latIdx = idx("lat");
    const lngIdx = idx("lng");
    const igIdx = idx("instagram_url");
    const webIdx = idx("website_url");
    const sortIdx = idx("sort_order");

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
    const dataRows = rows.slice(1);

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      const rowNum = i + 2;

      const name = row[nameIdx]?.trim() ?? "";
      const courseName = row[courseIdx]?.trim() ?? "";

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

      const values = {
        name,
        description: descIdx >= 0 ? row[descIdx]?.trim() || null : null,
        address: addrIdx >= 0 ? row[addrIdx]?.trim() || null : null,
        lat: latIdx >= 0 ? row[latIdx]?.trim() || null : null,
        lng: lngIdx >= 0 ? row[lngIdx]?.trim() || null : null,
        instagramUrl: igIdx >= 0 ? row[igIdx]?.trim() || null : null,
        websiteUrl: webIdx >= 0 ? row[webIdx]?.trim() || null : null,
        sortOrder:
          sortIdx >= 0 && row[sortIdx]?.trim()
            ? parseInt(row[sortIdx].trim(), 10) || 0
            : 0,
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
