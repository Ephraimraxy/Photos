import 'dotenv/config';
import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle({ client: pool, schema });

// Ensure tables exist in Neon when running locally or first boot
export async function ensureSchema(): Promise<void> {
  try {
    await pool.query(`CREATE TABLE IF NOT EXISTS content (
      id varchar PRIMARY KEY DEFAULT gen_random_uuid()::text,
      title text NOT NULL,
      type varchar(10) NOT NULL,
      google_drive_id text NOT NULL,
      google_drive_url text NOT NULL,
      mime_type text NOT NULL,
      file_size integer,
      duration integer,
      created_at timestamp DEFAULT now() NOT NULL
    )`);

    await pool.query(`CREATE TABLE IF NOT EXISTS purchases (
      id varchar PRIMARY KEY DEFAULT gen_random_uuid()::text,
      tracking_code text NOT NULL UNIQUE,
      paystack_reference text NOT NULL UNIQUE,
      content_ids text[] NOT NULL,
      total_amount integer NOT NULL,
      status varchar(20) NOT NULL DEFAULT 'pending',
      user_name text NOT NULL,
      unique_id text NOT NULL UNIQUE,
      coupon_code text,
      created_at timestamp DEFAULT now() NOT NULL
    )`);

    await pool.query(`CREATE TABLE IF NOT EXISTS download_tokens (
      id varchar PRIMARY KEY DEFAULT gen_random_uuid()::text,
      purchase_id varchar NOT NULL,
      content_id varchar NOT NULL,
      token text NOT NULL UNIQUE,
      expires_at timestamp NOT NULL,
      used boolean DEFAULT false NOT NULL,
      created_at timestamp DEFAULT now() NOT NULL
    )`);

    await pool.query(`CREATE TABLE IF NOT EXISTS coupons (
      id varchar PRIMARY KEY DEFAULT gen_random_uuid()::text,
      code text NOT NULL UNIQUE,
      image_count integer NOT NULL DEFAULT 0,
      video_count integer NOT NULL DEFAULT 0,
      used boolean DEFAULT false NOT NULL,
      used_by text,
      used_at timestamp,
      expires_at timestamp,
      created_at timestamp DEFAULT now() NOT NULL
    )`);
    
    console.log('✅ Database schema ensured');
  } catch (error) {
    console.error('❌ Failed to ensure database schema:', error);
    throw error;
  }
}
