import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  doublePrecision,
  uuid,
  pgEnum,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const userRoleEnum = pgEnum("user_role", ["super_admin", "community_admin"]);
export const appStatusEnum = pgEnum("prize_status", ["pending", "won", "lost"]);

// ── テナント ──────────────────────────────────────────────
export const tenants = pgTable("tenants", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  tenantToken: text("tenant_token").notNull().unique(), // 参加者・管理者URL識別用8文字トークン
  name: text("name").notNull(),
  adminPasswordHash: text("admin_password_hash").notNull(), // コミュニティ管理者共通PW
  logoUrl: text("logo_url"),
  primaryColor: text("primary_color").default("#10b981"),
  isActive: boolean("is_active").notNull().default(true),
  sessionMaxAgeDays: integer("session_max_age_days").notNull().default(30),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ── 管理者アカウント ───────────────────────────────────────
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .references(() => tenants.id),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: userRoleEnum("role").notNull().default("community_admin"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ── イベント ──────────────────────────────────────────────
export const events = pgTable("events", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id),
  name: text("name").notNull(),
  description: text("description"),
  startsAt: timestamp("starts_at"),
  endsAt: timestamp("ends_at"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ── コース ────────────────────────────────────────────────
export const courses = pgTable("courses", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id),
  eventId: uuid("event_id").references(() => events.id),
  name: text("name").notNull(),
  description: text("description"),
  distanceKm: doublePrecision("distance_km"),
  durationMin: integer("duration_min"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ── スポット ──────────────────────────────────────────────
export const spots = pgTable("spots", {
  id: uuid("id").primaryKey().defaultRandom(),
  courseId: uuid("course_id")
    .notNull()
    .references(() => courses.id),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id),
  name: text("name").notNull(),
  description: text("description"),
  address: text("address"),
  lat: text("lat"),
  lng: text("lng"),
  instagramUrl: text("instagram_url"),
  websiteUrl: text("website_url"),
  qrToken: text("qr_token").notNull().unique(),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ── 参加者セッション ───────────────────────────────────────
export const participants = pgTable("participants", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id),
  sessionToken: text("session_token").notNull().unique(),
  nickname: text("nickname"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ── スタンプ取得ログ ───────────────────────────────────────
export const stampLogs = pgTable("stamp_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  participantId: uuid("participant_id")
    .notNull()
    .references(() => participants.id),
  spotId: uuid("spot_id")
    .notNull()
    .references(() => spots.id),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id),
  stampedAt: timestamp("stamped_at").notNull().defaultNow(),
});

// ── 景品応募 ──────────────────────────────────────────────
export const prizeApplications = pgTable("prize_applications", {
  id: uuid("id").primaryKey().defaultRandom(),
  participantId: uuid("participant_id")
    .notNull()
    .references(() => participants.id),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id),
  name: text("name").notNull(),
  contact: text("contact").notNull(),
  message: text("message"),
  status: appStatusEnum("status").notNull().default("pending"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ── リレーション定義 ───────────────────────────────────────
export const tenantsRelations = relations(tenants, ({ many }) => ({
  users: many(users),
  events: many(events),
  courses: many(courses),
  spots: many(spots),
  participants: many(participants),
}));

export const eventsRelations = relations(events, ({ one, many }) => ({
  tenant: one(tenants, { fields: [events.tenantId], references: [tenants.id] }),
  courses: many(courses),
}));

export const coursesRelations = relations(courses, ({ one, many }) => ({
  tenant: one(tenants, { fields: [courses.tenantId], references: [tenants.id] }),
  event: one(events, { fields: [courses.eventId], references: [events.id] }),
  spots: many(spots),
}));

export const spotsRelations = relations(spots, ({ one, many }) => ({
  course: one(courses, { fields: [spots.courseId], references: [courses.id] }),
  tenant: one(tenants, { fields: [spots.tenantId], references: [tenants.id] }),
  stampLogs: many(stampLogs),
}));

export const participantsRelations = relations(participants, ({ one, many }) => ({
  tenant: one(tenants, { fields: [participants.tenantId], references: [tenants.id] }),
  stampLogs: many(stampLogs),
  prizeApplications: many(prizeApplications),
}));

export const stampLogsRelations = relations(stampLogs, ({ one }) => ({
  participant: one(participants, { fields: [stampLogs.participantId], references: [participants.id] }),
  spot: one(spots, { fields: [stampLogs.spotId], references: [spots.id] }),
  tenant: one(tenants, { fields: [stampLogs.tenantId], references: [tenants.id] }),
}));

export const prizeApplicationsRelations = relations(prizeApplications, ({ one }) => ({
  participant: one(participants, { fields: [prizeApplications.participantId], references: [participants.id] }),
  tenant: one(tenants, { fields: [prizeApplications.tenantId], references: [tenants.id] }),
}));

export const usersRelations = relations(users, ({ one }) => ({
  tenant: one(tenants, { fields: [users.tenantId], references: [tenants.id] }),
}));
