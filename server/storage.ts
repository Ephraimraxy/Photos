import { type Content, type InsertContent, type Purchase, type InsertPurchase, type DownloadToken, type InsertDownloadToken } from "@shared/schema";
import { randomUUID } from "crypto";

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
  updatePurchaseStatus(id: string, status: string): Promise<void>;

  // Download token management
  createDownloadToken(token: InsertDownloadToken): Promise<DownloadToken>;
  getDownloadToken(token: string): Promise<DownloadToken | undefined>;
  markTokenAsUsed(token: string): Promise<void>;
}

export class MemStorage implements IStorage {
  private content: Map<string, Content>;
  private purchases: Map<string, Purchase>;
  private downloadTokens: Map<string, DownloadToken>;

  constructor() {
    this.content = new Map();
    this.purchases = new Map();
    this.downloadTokens = new Map();
  }

  async getAllContent(): Promise<Content[]> {
    return Array.from(this.content.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async getContentById(id: string): Promise<Content | undefined> {
    return this.content.get(id);
  }

  async createContent(insertContent: InsertContent): Promise<Content> {
    const id = randomUUID();
    const content: Content = {
      ...insertContent,
      id,
      createdAt: new Date(),
    };
    this.content.set(id, content);
    return content;
  }

  async deleteContent(id: string): Promise<void> {
    this.content.delete(id);
  }

  async createPurchase(insertPurchase: InsertPurchase): Promise<Purchase> {
    const id = randomUUID();
    const purchase: Purchase = {
      ...insertPurchase,
      id,
      createdAt: new Date(),
    };
    this.purchases.set(id, purchase);
    return purchase;
  }

  async getPurchaseById(id: string): Promise<Purchase | undefined> {
    return this.purchases.get(id);
  }

  async getPurchaseByReference(reference: string): Promise<Purchase | undefined> {
    return Array.from(this.purchases.values()).find(
      (p) => p.paystackReference === reference
    );
  }

  async updatePurchaseStatus(id: string, status: string): Promise<void> {
    const purchase = this.purchases.get(id);
    if (purchase) {
      purchase.status = status;
      this.purchases.set(id, purchase);
    }
  }

  async createDownloadToken(insertToken: InsertDownloadToken): Promise<DownloadToken> {
    const id = randomUUID();
    const token: DownloadToken = {
      ...insertToken,
      id,
      createdAt: new Date(),
    };
    this.downloadTokens.set(insertToken.token, token);
    return token;
  }

  async getDownloadToken(token: string): Promise<DownloadToken | undefined> {
    return this.downloadTokens.get(token);
  }

  async markTokenAsUsed(token: string): Promise<void> {
    const downloadToken = this.downloadTokens.get(token);
    if (downloadToken) {
      downloadToken.used = true;
      this.downloadTokens.set(token, downloadToken);
    }
  }
}

export const storage = new MemStorage();
