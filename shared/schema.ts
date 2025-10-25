import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const content = pgTable("content", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  type: varchar("type", { length: 10 }).notNull(), // "image" or "video"
  googleDriveId: text("google_drive_id").notNull(),
  googleDriveUrl: text("google_drive_url").notNull(),
  mimeType: text("mime_type").notNull(),
  fileSize: integer("file_size"),
  duration: integer("duration"), // for videos, in seconds
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const purchases = pgTable("purchases", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  trackingCode: text("tracking_code").notNull().unique(), // Unique code for customers to track their purchase
  paystackReference: text("paystack_reference").notNull().unique(),
  contentIds: text("content_ids").array().notNull(),
  totalAmount: integer("total_amount").notNull(),
  status: varchar("status", { length: 20 }).notNull().default("pending"), // pending, completed, failed
  userName: text("user_name").notNull(), // Customer's full name
  uniqueId: text("unique_id").notNull().unique(), // Generated unique ID based on name
  couponCode: text("coupon_code"), // Applied coupon code
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const downloadTokens = pgTable("download_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  purchaseId: varchar("purchase_id").notNull(),
  contentId: varchar("content_id").notNull(),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const coupons = pgTable("coupons", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: text("code").notNull().unique(),
  imageCount: integer("image_count").notNull().default(0),
  videoCount: integer("video_count").notNull().default(0),
  used: boolean("used").default(false).notNull(),
  usedBy: text("used_by"), // User name who used the coupon
  usedAt: timestamp("used_at"),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const tokenCache = pgTable("token_cache", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  service: text("service").notNull().default("google_drive"), // Service name for different tokens
  token: text("token").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Insert schemas
export const insertContentSchema = createInsertSchema(content).omit({
  id: true,
  createdAt: true,
});

export const insertPurchaseSchema = createInsertSchema(purchases).omit({
  id: true,
  createdAt: true,
});

export const insertDownloadTokenSchema = createInsertSchema(downloadTokens).omit({
  id: true,
  createdAt: true,
});

export const insertCouponSchema = createInsertSchema(coupons).omit({
  id: true,
  createdAt: true,
});

// Types
export type Content = typeof content.$inferSelect;
export type InsertContent = z.infer<typeof insertContentSchema>;

export type Purchase = typeof purchases.$inferSelect;
export type InsertPurchase = z.infer<typeof insertPurchaseSchema>;

export type DownloadToken = typeof downloadTokens.$inferSelect;
export type InsertDownloadToken = z.infer<typeof insertDownloadTokenSchema>;

export type Coupon = typeof coupons.$inferSelect;
export type InsertCoupon = z.infer<typeof insertCouponSchema>;

export type TokenCache = typeof tokenCache.$inferSelect;
export type InsertTokenCache = typeof tokenCache.$inferInsert;

// Cart item type for frontend
export type CartItem = {
  id: string;
  title: string;
  type: "image" | "video";
  thumbnailUrl: string;
  price: number;
};

// Payment initialization request
export const paymentInitSchema = z.object({
  contentIds: z.array(z.string()).min(1),
  trackingCode: z.string(),
  userName: z.string().min(1, "Full name is required"),
});

export type PaymentInitRequest = z.infer<typeof paymentInitSchema>;

// Tracking code lookup request
export const trackingCodeLookupSchema = z.object({
  trackingCode: z.string().min(1),
});

export type TrackingCodeLookupRequest = z.infer<typeof trackingCodeLookupSchema>;

// Google Drive upload request
export const googleDriveUploadSchema = z.object({
  driveUrl: z.string().url(),
  title: z.string().min(1),
  type: z.enum(["image", "video"]),
});

export type GoogleDriveUploadRequest = z.infer<typeof googleDriveUploadSchema>;
