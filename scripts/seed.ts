import { config } from "dotenv";
config({ path: ".env.local" });

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../src/lib/db/schema";
import { createHash } from "crypto";
import { v4 as uuidv4 } from "uuid";

const ADMIN_PASSWORD = "changeme123";
const TENANT_TOKEN = "kasuga01";

const client = postgres(process.env.DATABASE_URL!, { prepare: false });
const db = drizzle(client, { schema });

function hashPassword(password: string) {
  return createHash("sha256").update(password).digest("hex");
}

async function seed() {
  console.log("🌱 Seeding...");

  const [tenant] = await db
    .insert(schema.tenants)
    .values({
      slug: "kasuga",
      tenantToken: TENANT_TOKEN,
      name: "春日市スタンプラリー",
      adminPasswordHash: hashPassword(ADMIN_PASSWORD),
      primaryColor: "#10b981",
    })
    .onConflictDoNothing()
    .returning();

  if (!tenant) {
    console.log("テナント already exists — スキップ");
    await client.end();
    return;
  }

  const [event] = await db.insert(schema.events).values({
    tenantId: tenant.id,
    name: "春日市ウォーキングラリー 試験運用",
    description: "3スポットを巡るデジタルスタンプラリー",
    isActive: true,
  }).returning();

  const [course] = await db.insert(schema.courses).values({
    tenantId: tenant.id,
    eventId: event.id,
    name: "春日市中心部コース",
    description: "春日市の主要スポットを巡る約3kmのコース",
    distanceKm: 3.0,
    durationMin: 45,
    sortOrder: 0,
  }).returning();

  const spotData = [
    { name: "春日市役所", description: "春日市の中心施設", address: "福岡県春日市日の出町2-15", lat: 33.530, lng: 130.469, sortOrder: 0 },
    { name: "春日公園", description: "緑豊かな市民公園", address: "福岡県春日市春日公園1丁目", lat: 33.535, lng: 130.472, sortOrder: 1 },
    { name: "春日駅", description: "西鉄春日駅", address: "福岡県春日市春日原北町", lat: 33.524, lng: 130.464, sortOrder: 2 },
  ];

  for (const spot of spotData) {
    await db.insert(schema.spots).values({ courseId: course.id, tenantId: tenant.id, ...spot, qrToken: uuidv4() });
  }

  console.log("✓ テナント作成:", tenant.slug);
  console.log("✓ 参加者URL:  https://asoma.mago-t.com/?t=" + TENANT_TOKEN);
  console.log("✓ 管理者URL:  https://asoma.mago-t.com/admin/login?t=" + TENANT_TOKEN);
  console.log("✓ 管理者PW:   " + ADMIN_PASSWORD);
  console.log("✓ コース: 春日市中心部コース（3スポット）");
  console.log("\n⚠️  初回ログイン後、スーパー管理者画面でパスワードを変更してください");

  await client.end();
}

seed().catch((e) => { console.error(e); process.exit(1); });
