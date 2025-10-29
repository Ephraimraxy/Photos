const express = require('express');
const axios = require('axios');
const { randomUUID } = require('crypto');
const multer = require('multer');
const sharp = require('sharp');
const { google } = require('googleapis');
const { drizzle } = require('drizzle-orm/postgres-js');
const postgres = require('postgres');
const { eq, and, desc, sql } = require('drizzle-orm');
const { z } = require('zod');

// Load environment variables
require('dotenv').config();

const app = express();

// Enable CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }
  next();
});

// Normalize Netlify function base path so Express routes match
app.use((req, _res, next) => {
  const base = '/.netlify/functions/api';
  if (req.url.startsWith(base)) {
    req.url = req.url.slice(base.length) || '/';
  }
  next();
});

// Parse JSON bodies
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Database schema
const purchases = {
  id: 'uuid',
  trackingCode: 'text',
  userName: 'text',
  uniqueId: 'text',
  contentIds: 'json',
  totalAmount: 'integer',
  status: 'text',
  paystackReference: 'text',
  couponId: 'uuid',
  createdAt: 'timestamp'
};

const content = {
  id: 'uuid',
  title: 'text',
  type: 'text',
  thumbnailUrl: 'text',
  downloadUrl: 'text',
  googleDriveId: 'text',
  createdAt: 'timestamp'
};

const downloadTokens = {
  id: 'uuid',
  purchaseId: 'uuid',
  contentId: 'uuid',
  token: 'text',
  expiresAt: 'timestamp',
  used: 'boolean',
  createdAt: 'timestamp'
};

const coupons = {
  id: 'uuid',
  code: 'text',
  imageCount: 'integer',
  videoCount: 'integer',
  isActive: 'boolean',
  createdAt: 'timestamp'
};

// Database connection
let db = null;
let sqlConnection = null;

const initDB = async () => {
  if (db) return db;
  
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL must be set');
  }

  sqlConnection = postgres(connectionString);
  db = drizzle(sqlConnection);
  return db;
};

// Storage functions
const storage = {
  async createContent(data) {
    const database = await initDB();
    const [created] = await database.insert(content).values(data).returning();
    return created;
  },
  async createPurchase(data) {
    const database = await initDB();
    const [purchase] = await database.insert(purchases).values(data).returning();
    return purchase;
  },

  async getPurchaseById(id) {
    const database = await initDB();
    const [purchase] = await database.select().from(purchases).where(eq(purchases.id, id));
    return purchase;
  },

  async getPurchaseByReference(reference) {
    const database = await initDB();
    const [purchase] = await database.select().from(purchases).where(eq(purchases.paystackReference, reference));
    return purchase;
  },

  async updatePurchaseStatus(id, status) {
    const database = await initDB();
    await database.update(purchases).set({ status }).where(eq(purchases.id, id));
  },

  async createDownloadToken(data) {
    const database = await initDB();
    const [token] = await database.insert(downloadTokens).values(data).returning();
    return token;
  },

  async getDownloadTokensByPurchase(purchaseId) {
    const database = await initDB();
    return await database.select().from(downloadTokens).where(eq(downloadTokens.purchaseId, purchaseId));
  },

  async getContentById(id) {
    const database = await initDB();
    const [content] = await database.select().from(content).where(eq(content.id, id));
    return content;
  },

  async getAllContent() {
    const database = await initDB();
    return await database.select().from(content).orderBy(desc(content.createdAt));
  },

  async getAllPurchases() {
    const database = await initDB();
    return await database.select().from(purchases).orderBy(desc(purchases.createdAt));
  },

  async getAllCoupons() {
    const database = await initDB();
    return await database.select().from(coupons).orderBy(desc(coupons.createdAt));
  },

  async getCouponByCode(code) {
    const database = await initDB();
    const [coupon] = await database.select().from(coupons).where(eq(coupons.code, code));
    return coupon;
  }
};

// Multer configuration
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

// Google Drive setup
let oauth2Client = null;
let drive = null;

const initGoogleDriveWithToken = (accessToken) => {
  // Create new client per request to use the end-user token
  const client = new google.auth.OAuth2(
    process.env.GOOGLE_DRIVE_CLIENT_ID,
    process.env.GOOGLE_DRIVE_CLIENT_SECRET,
    'postmessage'
  );
  client.setCredentials({ access_token: accessToken });
  const drv = google.drive({ version: 'v3', auth: client });
  return { oauth2Client: client, drive: drv };
};

// Routes
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Get all content
app.get('/content', async (req, res) => {
  try {
    const content = await storage.getAllContent();
    res.json(content);
  } catch (error) {
    console.error('Content fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch content' });
  }
});

// Get content by ID
app.get('/content/:id', async (req, res) => {
  try {
    const content = await storage.getContentById(req.params.id);
    if (!content) {
      return res.status(404).json({ error: 'Content not found' });
    }
    res.json(content);
  } catch (error) {
    console.error('Content fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch content' });
  }
});

// Content preview endpoint
app.get('/content/:id/preview', async (req, res) => {
  try {
    const content = await storage.getContentById(req.params.id);
    if (!content) {
      return res.status(404).json({ error: 'Content not found' });
    }

    // For now, return the thumbnail URL directly
    res.redirect(content.thumbnailUrl);
  } catch (error) {
    console.error('Content preview error:', error);
    res.status(500).json({ error: 'Failed to fetch content preview' });
  }
});

// Download content
app.get('/content/:id/download', async (req, res) => {
  try {
    const { token } = req.query;
    
    if (!token) {
      return res.status(400).json({ error: 'Download token required' });
    }

    // Verify token and get content
    const database = await initDB();
    const downloadToken = await database.select()
      .from(downloadTokens)
      .where(and(
        eq(downloadTokens.token, token),
        eq(downloadTokens.contentId, req.params.id),
        eq(downloadTokens.used, false)
      ))
      .limit(1);

    if (downloadToken.length === 0) {
      return res.status(404).json({ error: 'Invalid or expired download token' });
    }

    const tokenData = downloadToken[0];
    
    // Check if token is expired
    if (new Date() > new Date(tokenData.expiresAt)) {
      return res.status(410).json({ error: 'Download token has expired' });
    }

    // Mark token as used
    await database.update(downloadTokens)
      .set({ used: true })
      .where(eq(downloadTokens.id, tokenData.id));

    // Get content
    const content = await storage.getContentById(req.params.id);
    if (!content) {
      return res.status(404).json({ error: 'Content not found' });
    }

    // Redirect to Google Drive download URL
    res.redirect(content.downloadUrl);
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ error: 'Failed to process download' });
  }
});

// Payment initialization
app.post('/payment/initialize', async (req, res) => {
  try {
    // Validate Paystack credentials
    if (!process.env.PAYSTACK_SECRET_KEY) {
      return res.status(500).json({ 
        error: "Payment system not configured. Please set up Paystack credentials." 
      });
    }

    const { contentIds, trackingCode, userName, couponCode } = req.body;

    if (!contentIds || !Array.isArray(contentIds) || contentIds.length === 0) {
      return res.status(400).json({ error: "Content IDs are required" });
    }

    if (!trackingCode || !userName) {
      return res.status(400).json({ error: "Tracking code and user name are required" });
    }

    // Calculate total amount
    let totalAmount = contentIds.length * 200; // 200 per item

    // Apply coupon if provided
    let coupon = null;
    if (couponCode) {
      coupon = await storage.getCouponByCode(couponCode);
      if (coupon && coupon.isActive) {
        const freeImages = coupon.imageCount || 0;
        const freeVideos = coupon.videoCount || 0;
        
        // Count images and videos in the cart
        const contentItems = await Promise.all(
          contentIds.map(id => storage.getContentById(id))
        );
        
        const imageCount = contentItems.filter(item => item?.type === 'image').length;
        const videoCount = contentItems.filter(item => item?.type === 'video').length;
        
        const excessImages = Math.max(0, imageCount - freeImages);
        const excessVideos = Math.max(0, videoCount - freeVideos);
        
        totalAmount = (excessImages + excessVideos) * 200;
      }
    }

    // Generate unique reference
    const reference = `DOCUEDIT-${randomUUID()}`;
    const uniqueId = `${userName.toUpperCase()}-${randomUUID().substring(0, 8).toUpperCase()}`;

    // Create purchase record
    const purchase = await storage.createPurchase({
      id: randomUUID(),
      trackingCode,
      userName,
      uniqueId,
      contentIds,
      totalAmount,
      status: 'pending',
      paystackReference: reference,
      couponId: coupon?.id || null,
    });

    // Initialize Paystack payment
    const paystackResponse = await axios.post(
      "https://api.paystack.co/transaction/initialize",
      {
        amount: totalAmount * 100, // Convert to kobo
        email: "customer@docueditphotos.com",
        reference,
        callback_url: `${req.protocol}://${req.get('host')}/checkout`,
        metadata: {
          contentIds,
          trackingCode,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    res.json({
      authorization_url: paystackResponse.data.data.authorization_url,
      reference: paystackResponse.data.data.reference,
      purchaseId: purchase.id,
    });
  } catch (error) {
    console.error("Payment initialization error:", error);
    res.status(500).json({ error: "Failed to initialize payment" });
  }
});

// Verify payment (client-side callback)
app.post('/payment/verify', async (req, res) => {
  try {
    // Validate Paystack credentials
    if (!process.env.PAYSTACK_SECRET_KEY) {
      return res.status(500).json({ 
        error: "Payment system not configured. Please set up Paystack credentials." 
      });
    }

    const { reference } = req.body;

    if (!reference) {
      return res.status(400).json({ error: "Payment reference is required" });
    }

    // Verify with Paystack
    const paystackResponse = await axios.get(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        },
      }
    );

    const paymentData = paystackResponse.data.data;

    if (paymentData.status !== "success") {
      return res.status(400).json({ error: "Payment verification failed" });
    }

    // Update purchase status
    const purchase = await storage.getPurchaseByReference(reference);
    if (!purchase) {
      console.log("Purchase not found for reference:", reference);
      return res.status(404).json({ error: "Purchase not found" });
    }

    console.log("Found purchase:", purchase.id, "Status:", purchase.status);

    if (purchase.status === 'pending') {
      console.log("Updating purchase status to completed...");
      await storage.updatePurchaseStatus(purchase.id, "completed");

      // Generate download tokens (24 hour expiry)
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);

      console.log("Generating download tokens for", purchase.contentIds.length, "items");
      const tokenPromises = purchase.contentIds.map(contentId => 
        storage.createDownloadToken({
          purchaseId: purchase.id,
          contentId,
          token: randomUUID(),
          expiresAt,
          used: false,
        })
      );

      await Promise.all(tokenPromises);
      console.log("Download tokens generated successfully");
    } else {
      console.log("Purchase already completed, skipping token generation");
    }

    res.json({ purchaseId: purchase.id, trackingCode: purchase.trackingCode });
  } catch (error) {
    console.error("Payment verification error:", error);
    res.status(500).json({ error: "Failed to verify payment" });
  }
});

// Get purchase details
app.get('/purchase/:id', async (req, res) => {
  try {
    const purchase = await storage.getPurchaseById(req.params.id);
    if (!purchase || purchase.status !== "completed") {
      return res.status(404).json({ error: "Purchase not found" });
    }

    // Get download tokens for this purchase
    const tokens = await storage.getDownloadTokensByPurchase(purchase.id);

    // Get content details with tokens
    const items = await Promise.all(
      purchase.contentIds.map(async (contentId) => {
        const content = await storage.getContentById(contentId);
        const token = tokens.find(t => t.contentId === contentId);

        return {
          id: content?.id || contentId,
          title: content?.title || "Unknown",
          type: content?.type || "image",
          downloadToken: token?.token || "",
        };
      })
    );

    // Get expiry from first token
    const firstToken = tokens[0];

    res.json({
      purchaseId: purchase.id,
      trackingCode: purchase.trackingCode,
      items,
      expiresAt: firstToken?.expiresAt || new Date(),
    });
  } catch (error) {
    console.error("Purchase fetch error:", error);
    res.status(500).json({ error: "Failed to fetch purchase" });
  }
});

// Manual purchase completion (for admin)
app.post('/purchase/:id/complete', async (req, res) => {
  try {
    const purchase = await storage.getPurchaseById(req.params.id);
    if (!purchase) {
      return res.status(404).json({ error: "Purchase not found" });
    }
    if (purchase.status === 'pending') {
      await storage.updatePurchaseStatus(purchase.id, "completed");
      // Generate download tokens
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);
      const tokenPromises = purchase.contentIds.map(contentId => 
        storage.createDownloadToken({
          purchaseId: purchase.id,
          contentId,
          token: randomUUID(),
          expiresAt,
          used: false,
        })
      );
      await Promise.all(tokenPromises);
      res.json({ success: true, message: "Purchase completed" });
    } else {
      res.json({ success: false, message: "Purchase already completed" });
    }
  } catch (error) {
    console.error("Purchase completion error:", error);
    res.status(500).json({ error: "Failed to complete purchase" });
  }
});

// Tracking code lookup
app.post('/tracking/lookup', async (req, res) => {
  try {
    const { trackingCode } = req.body;

    if (!trackingCode) {
      return res.status(400).json({ error: "Tracking code is required" });
    }

    const database = await initDB();
    const purchase = await database.select()
      .from(purchases)
      .where(eq(purchases.trackingCode, trackingCode))
      .limit(1);

    if (purchase.length === 0) {
      return res.status(404).json({ error: "Tracking code not found" });
    }

    const purchaseData = purchase[0];

    // Get content details
    const items = await Promise.all(
      purchaseData.contentIds.map(async (contentId) => {
        const content = await storage.getContentById(contentId);
        return {
          id: content?.id || contentId,
          title: content?.title || "Unknown",
          type: content?.type || "image",
          thumbnailUrl: `/api/content/${contentId}/preview`,
        };
      })
    );

    res.json({
      purchaseId: purchaseData.id,
      trackingCode: purchaseData.trackingCode,
      status: purchaseData.status,
      totalAmount: purchaseData.totalAmount,
      items,
      createdAt: purchaseData.createdAt,
      userName: purchaseData.userName,
      uniqueId: purchaseData.uniqueId,
      paystackReference: purchaseData.paystackReference,
    });
  } catch (error) {
    console.error("Tracking lookup error:", error);
    res.status(500).json({ error: "Failed to lookup tracking code" });
  }
});

// Admin routes
app.get('/admin/purchases', async (req, res) => {
  try {
    const purchases = await storage.getAllPurchases();
    res.json(purchases);
  } catch (error) {
    console.error("Admin purchases fetch error:", error);
    res.status(500).json({ error: "Failed to fetch purchases" });
  }
});

app.get('/admin/coupons', async (req, res) => {
  try {
    const coupons = await storage.getAllCoupons();
    res.json(coupons);
  } catch (error) {
    console.error("Admin coupons fetch error:", error);
    res.status(500).json({ error: "Failed to fetch coupons" });
  }
});

// Additional endpoints required by frontend
app.get('/purchases', async (req, res) => {
  try {
    const purchases = await storage.getAllPurchases();
    res.json(purchases);
  } catch (error) {
    console.error('Get purchases error:', error);
    res.status(500).json({ error: 'Failed to fetch purchases' });
  }
});

// Google Drive folder import (stub; implement as needed)
app.post('/content/google-drive-folder', async (req, res) => {
  try {
    const { folderId, token, mediaType } = req.body || {};
    if (!folderId || !token) {
      return res.status(400).json({ error: 'folderId and token are required' });
    }

    const { drive } = initGoogleDriveWithToken(token);

    // List files in the folder
    const listResp = await drive.files.list({
      q: `'${folderId}' in parents and trashed = false`,
      fields: 'files(id, name, mimeType)'
    });

    let files = listResp.data.files || [];
    if (mediaType === 'image') {
      files = files.filter(f => (f.mimeType || '').startsWith('image/'));
    } else if (mediaType === 'video') {
      files = files.filter(f => (f.mimeType || '').startsWith('video/'));
    }

    const created = [];
    for (const f of files) {
      const fileId = f.id;
      // Ensure public access
      try {
        await drive.permissions.create({
          fileId,
          requestBody: { role: 'reader', type: 'anyone' }
        });
      } catch (_) {
        // ignore permission errors if already public
      }

      const type = f.mimeType?.startsWith('video/') ? 'video' : 'image';
      const downloadUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
      const thumbnailUrl = `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`;

      const record = await storage.createContent({
        id: randomUUID(),
        title: f.name,
        type,
        thumbnailUrl,
        downloadUrl,
        googleDriveId: fileId,
      });
      created.push(record);
    }

    res.json({ imported: created.length, items: created });
  } catch (error) {
    console.error('Google Drive folder import error:', error);
    res.status(500).json({ error: 'Failed to import from Google Drive folder' });
  }
});

// Import a single Google Drive file by ID using user's token
app.post('/content/google-drive', async (req, res) => {
  try {
    const { fileId, title, type, token } = req.body || {};
    if (!fileId || !token) {
      return res.status(400).json({ error: 'fileId and token are required' });
    }

    const { drive } = initGoogleDriveWithToken(token);

    // Make file public
    try {
      await drive.permissions.create({
        fileId,
        requestBody: { role: 'reader', type: 'anyone' }
      });
    } catch (_) {}

    const resolvedType = type || 'image';
    const downloadUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
    const thumbnailUrl = `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`;

    const created = await storage.createContent({
      id: randomUUID(),
      title: title || fileId,
      type: resolvedType,
      thumbnailUrl,
      downloadUrl,
      googleDriveId: fileId,
    });

    res.json(created);
  } catch (error) {
    console.error('Google Drive single file import error:', error);
    res.status(500).json({ error: 'Failed to import from Google Drive' });
  }
});

// Upload single file and create content via Google Drive
app.post('/content/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'File is required' });
    }
    const title = req.body?.title || req.file.originalname;
    const { drive } = initGoogleDrive();

    const folderId = process.env.GOOGLE_DRIVE_UPLOAD_FOLDER_ID;
    if (!folderId) {
      return res.status(500).json({ error: 'GOOGLE_DRIVE_UPLOAD_FOLDER_ID not configured' });
    }

    // Upload to Google Drive
    const fileMeta = {
      name: title,
      parents: [folderId],
    };
    const media = {
      mimeType: req.file.mimetype,
      body: Buffer.isBuffer(req.file.buffer)
        ? require('stream').Readable.from(req.file.buffer)
        : req.file.stream,
    };

    const uploadResp = await drive.files.create({
      requestBody: fileMeta,
      media,
      fields: 'id, name'
    });

    const fileId = uploadResp.data.id;

    // Make public
    try {
      await drive.permissions.create({
        fileId,
        requestBody: { role: 'reader', type: 'anyone' }
      });
    } catch (_) {}

    const type = req.file.mimetype?.startsWith('video/') ? 'video' : 'image';
    const downloadUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
    const thumbnailUrl = `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`;

    const created = await storage.createContent({
      id: randomUUID(),
      title,
      type,
      thumbnailUrl,
      downloadUrl,
      googleDriveId: fileId,
    });

    res.json(created);
  } catch (error) {
    console.error('File upload error:', error);
    res.status(500).json({ error: 'Failed to upload file' });
  }
});

// Export the Express app as a Netlify Function using serverless-http
const serverless = require('serverless-http');
module.exports.handler = serverless(app);