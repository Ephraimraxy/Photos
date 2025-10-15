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
  sessionId: text("session_id").notNull(),
  paystackReference: text("paystack_reference").notNull().unique(),
  contentIds: text("content_ids").array().notNull(),
  totalAmount: integer("total_amount").notNull(),
  status: varchar("status", { length: 20 }).notNull().default("pending"), // pending, completed, failed
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

// Types
export type Content = typeof content.$inferSelect;
export type InsertContent = z.infer<typeof insertContentSchema>;

export type Purchase = typeof purchases.$inferSelect;
export type InsertPurchase = z.infer<typeof insertPurchaseSchema>;

export type DownloadToken = typeof downloadTokens.$inferSelect;
export type InsertDownloadToken = z.infer<typeof insertDownloadTokenSchema>;

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
  sessionId: z.string(),
});

export type PaymentInitRequest = z.infer<typeof paymentInitSchema>;

// Google Drive upload request
export const googleDriveUploadSchema = z.object({
  driveUrl: z.string().url(),
  title: z.string().min(1),
  type: z.enum(["image", "video"]),
});

export type GoogleDriveUploadRequest = z.infer<typeof googleDriveUploadSchema>;
