import { type Content, type InsertContent, type Purchase, type InsertPurchase, type DownloadToken, type InsertDownloadToken, content, purchases, downloadTokens } from "@shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  // Content management
  getAllContent(): Promise<Content[]>;
  getContentById(id: string): Promise<Content | undefined>;
  createContent(content: InsertContent): Promise<Content>;
  deleteContent(id: string): Promise<void>;

  // Purchase management
  createPurchase(purchase: InsertPurchase): Promise<Purchase>;
  getPurchaseById(id: string): Promise<Purchase | undefined>;
  getPurchaseByReference(reference: string): Promise<Purchase | undefined>;
  getPurchaseByTrackingCode(trackingCode: string): Promise<Purchase | undefined>;
  getAllPurchases(): Promise<Purchase[]>;
  updatePurchaseStatus(id: string, status: string): Promise<void>;

  // Download token management
  createDownloadToken(token: InsertDownloadToken): Promise<DownloadToken>;
  getDownloadToken(token: string): Promise<DownloadToken | undefined>;
  getDownloadTokensByPurchase(purchaseId: string): Promise<DownloadToken[]>;
  markTokenAsUsed(token: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getAllContent(): Promise<Content[]> {
    return await db.select().from(content).orderBy(desc(content.createdAt));
  }

  async getContentById(id: string): Promise<Content | undefined> {
    const [result] = await db.select().from(content).where(eq(content.id, id));
    return result || undefined;
  }

  async createContent(insertContent: InsertContent): Promise<Content> {
    const [result] = await db.insert(content).values(insertContent).returning();
    return result;
  }

  async deleteContent(id: string): Promise<void> {
    await db.delete(content).where(eq(content.id, id));
  }

  async createPurchase(insertPurchase: InsertPurchase): Promise<Purchase> {
    const [result] = await db.insert(purchases).values(insertPurchase).returning();
    return result;
  }

  async getPurchaseById(id: string): Promise<Purchase | undefined> {
    const [result] = await db.select().from(purchases).where(eq(purchases.id, id));
    return result || undefined;
  }

  async getPurchaseByReference(reference: string): Promise<Purchase | undefined> {
    const [result] = await db.select().from(purchases).where(eq(purchases.paystackReference, reference));
    return result || undefined;
  }

  async getPurchaseByTrackingCode(trackingCode: string): Promise<Purchase | undefined> {
    const [result] = await db.select().from(purchases).where(eq(purchases.trackingCode, trackingCode));
    return result || undefined;
  }

  async getAllPurchases(): Promise<Purchase[]> {
    return await db.select().from(purchases).orderBy(desc(purchases.createdAt));
  }

  async updatePurchaseStatus(id: string, status: string): Promise<void> {
    await db.update(purchases).set({ status }).where(eq(purchases.id, id));
  }

  async createDownloadToken(insertToken: InsertDownloadToken): Promise<DownloadToken> {
    const [result] = await db.insert(downloadTokens).values(insertToken).returning();
    return result;
  }

  async getDownloadToken(token: string): Promise<DownloadToken | undefined> {
    const [result] = await db.select().from(downloadTokens).where(eq(downloadTokens.token, token));
    return result || undefined;
  }

  async getDownloadTokensByPurchase(purchaseId: string): Promise<DownloadToken[]> {
    return await db.select().from(downloadTokens).where(eq(downloadTokens.purchaseId, purchaseId));
  }

  async markTokenAsUsed(token: string): Promise<void> {
    await db.update(downloadTokens).set({ used: true }).where(eq(downloadTokens.token, token));
  }
}

export const storage = new DatabaseStorage();
