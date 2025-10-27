const { pgTable, text, timestamp, uuid, integer, boolean, json } = require('drizzle-orm/pg-core');

// Database schema
const purchases = pgTable('purchases', {
  id: uuid('id').primaryKey().defaultRandom(),
  trackingCode: text('tracking_code').notNull(),
  userName: text('user_name').notNull(),
  uniqueId: text('unique_id').notNull(),
  contentIds: json('content_ids').$type<string[]>().notNull(),
  totalAmount: integer('total_amount').notNull(),
  status: text('status').notNull().default('pending'),
  paystackReference: text('paystack_reference'),
  couponId: uuid('coupon_id'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

const content = pgTable('content', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  type: text('type').notNull(), // 'image' or 'video'
  thumbnailUrl: text('thumbnail_url').notNull(),
  downloadUrl: text('download_url').notNull(),
  googleDriveId: text('google_drive_id').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

const downloadTokens = pgTable('download_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  purchaseId: uuid('purchase_id').notNull(),
  contentId: uuid('content_id').notNull(),
  token: text('token').notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
  used: boolean('used').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

const coupons = pgTable('coupons', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: text('code').notNull().unique(),
  imageCount: integer('image_count').default(0).notNull(),
  videoCount: integer('video_count').default(0).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

module.exports = {
  purchases,
  content,
  downloadTokens,
  coupons
};
