/**
 * Raw SQL seed script — bypasses drizzle-orm tsx resolution issues.
 * Creates test tenant, event, course, and spots for dev/preview.
 */
import postgres from "postgres";
import { createHash, randomUUID } from "crypto";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("ERROR: DATABASE_URL is not set");
  process.exit(1);
}

const ADMIN_PASSWORD = "changeme123";
const TENANT_TOKEN = "kasuga01";
const TENANT_SLUG = "kasuga";

const sql = postgres(DATABASE_URL, { prepare: false });

function hashPassword(password) {
  return createHash("sha256").update(password).digest("hex");
}

async function seed() {
  console.log("🌱 Seeding test data...");

  try {
    // テナントを作成（既存なら skip）
    const existing = await sql`
      SELECT id FROM tenants WHERE tenant_token = ${TENANT_TOKEN} LIMIT 1
    `;
    if (existing.length > 0) {
      console.log("✓ テナントはすでに存在します — スキップ");
      await sql.end();
      return;
    }

    const [tenant] = await sql`
      INSERT INTO tenants (id, slug, tenant_token, name, admin_password_hash, primary_color, is_active, created_at)
      VALUES (
        ${randomUUID()}, ${TENANT_SLUG}, ${TENANT_TOKEN},
        ${"春日市スタンプラリー"}, ${hashPassword(ADMIN_PASSWORD)},
        ${"#10b981"}, true, NOW()
      )
      RETURNING id
    `;

    const [event] = await sql`
      INSERT INTO events (id, tenant_id, name, description, is_active, created_at)
      VALUES (
        ${randomUUID()}, ${tenant.id},
        ${"春日市ウォーキングラリー 試験運用"},
        ${"3スポットを巡るデジタルスタンプラリー"},
        true, NOW()
      )
      RETURNING id
    `;

    const [course] = await sql`
      INSERT INTO courses (id, tenant_id, event_id, name, description, distance_km, duration_min, sort_order, created_at)
      VALUES (
        ${randomUUID()}, ${tenant.id}, ${event.id},
        ${"春日市中心部コース"},
        ${"春日市の主要スポットを巡る約3kmのコース"},
        3.0, 45, 0, NOW()
      )
      RETURNING id
    `;

    const spots = [
      { name: "春日市役所", desc: "春日市の中心施設", address: "福岡県春日市日の出町2-15", lat: "33.5300", lng: "130.4690", sort: 0 },
      { name: "春日公園",   desc: "緑豊かな市民公園", address: "福岡県春日市春日公園1丁目",   lat: "33.5350", lng: "130.4720", sort: 1 },
      { name: "春日原駅",   desc: "西鉄春日原駅",     address: "福岡県春日市春日原北町",       lat: "33.5240", lng: "130.4640", sort: 2 },
    ];

    for (const s of spots) {
      await sql`
        INSERT INTO spots (id, course_id, tenant_id, name, description, address, lat, lng, qr_token, sort_order, created_at)
        VALUES (
          ${randomUUID()}, ${course.id}, ${tenant.id},
          ${s.name}, ${s.desc}, ${s.address}, ${s.lat}, ${s.lng},
          ${randomUUID()}, ${s.sort}, NOW()
        )
      `;
    }

    console.log("✅ シード完了！");
    console.log("─────────────────────────────────────────");
    console.log("テナント:     春日市スタンプラリー");
    console.log("参加者URL:    /?t=" + TENANT_TOKEN);
    console.log("管理者URL:    /admin/login?t=" + TENANT_TOKEN);
    console.log("管理者PW:     " + ADMIN_PASSWORD);
    console.log("スポット:     3件 (春日市役所・春日公園・春日原駅)");
    console.log("─────────────────────────────────────────");
  } catch (err) {
    console.error("シードエラー:", err.message);
    await sql.end();
    process.exit(1);
  }

  await sql.end();
}

seed();
