const express = require('express');
const axios = require('axios');
const { randomUUID } = require('crypto');
const busboy = require('busboy');
const sharp = require('sharp');
const { google } = require('googleapis');
const { drizzle } = require('drizzle-orm/postgres-js');
const postgres = require('postgres');
const { eq, and, desc, sql } = require('drizzle-orm');
const { z } = require('zod');
// Load environment variables
require('dotenv').config();

// Supabase Storage functions using REST API (to avoid bundling large SDK)
async function uploadFileToSupabase(fileBuffer, fileName, mimeType) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const BUCKET_NAME = 'content';
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in environment variables"
    );
  }
  
  // Generate unique file name
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 15);
  const fileExtension = fileName.split('.').pop() || '';
  const uniqueFileName = `${timestamp}-${randomString}.${fileExtension}`;
  const filePath = `${uniqueFileName}`;

  // Upload file to Supabase Storage using REST API
  const uploadUrl = `${supabaseUrl}/storage/v1/object/${BUCKET_NAME}/${filePath}`;
  const uploadResponse = await axios.put(uploadUrl, fileBuffer, {
    headers: {
      'Authorization': `Bearer ${supabaseKey}`,
      'Content-Type': mimeType,
      'x-upsert': 'false'
    },
    maxContentLength: Infinity,
    maxBodyLength: Infinity
  });

  if (uploadResponse.status !== 200) {
    throw new Error(`Failed to upload file to Supabase: ${uploadResponse.statusText}`);
  }

  // Get public URL - use signed URL for better reliability
  // First try to get a signed URL, fallback to public URL
  let publicUrl;
  try {
    // Try to create a signed URL (valid for 1 year)
    const signUrl = `${supabaseUrl}/storage/v1/object/sign/${BUCKET_NAME}/${filePath}`;
    const signResponse = await axios.post(signUrl, {}, {
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
      },
      params: {
        expiresIn: '31536000' // 1 year
      }
    });
    
    if (signResponse.data?.signedURL) {
      publicUrl = `${supabaseUrl}${signResponse.data.signedURL}`;
    } else {
      // Fallback to public URL
      publicUrl = `${supabaseUrl}/storage/v1/object/public/${BUCKET_NAME}/${filePath}`;
    }
  } catch (error) {
    console.log('Could not create signed URL, using public URL:', error.message);
    // Fallback to public URL
    publicUrl = `${supabaseUrl}/storage/v1/object/public/${BUCKET_NAME}/${filePath}`;
  }

  return {
    path: filePath,
    url: publicUrl,
  };
}

// Helper function to parse multipart form data in Netlify Functions
function parseMultipartForm(event) {
  return new Promise((resolve, reject) => {
    const fields = {};
    const files = [];
    
    try {
      const bb = busboy({ 
        headers: {
          ...event.headers,
          'content-type': event.headers['content-type'] || event.headers['Content-Type']
        }
      });

      // Handle file uploads
      bb.on('file', (fieldname, file, info) => {
        const { filename, mimeType } = info;
        const chunks = [];
        
        file.on('data', (data) => {
          chunks.push(data);
        });
        
        file.on('end', () => {
          files.push({
            fieldname,
            filename,
            mimetype: mimeType,
            buffer: Buffer.concat(chunks)
          });
        });
      });

      // Handle regular form fields
      bb.on('field', (fieldname, value) => {
        fields[fieldname] = value;
      });

      // When parsing completes
      bb.on('close', () => {
        resolve({ fields, files });
      });

      bb.on('error', (error) => {
        reject(error);
      });

      // CRITICAL: Event body must be base64 decoded for Netlify Functions
      let body;
      if (event.isBase64Encoded) {
        body = Buffer.from(event.body, 'base64');
      } else if (typeof event.body === 'string') {
        body = Buffer.from(event.body, 'utf8');
      } else if (Buffer.isBuffer(event.body)) {
        body = event.body;
      } else {
        throw new Error('Invalid body format in event');
      }
      
      console.log('[Parse] Body length:', body.length, 'bytes');
      bb.end(body);
    } catch (error) {
      reject(error);
    }
  });
}

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
  // Also handle cases where redirect preserved '/api' prefix
  if (req.url.startsWith('/api/')) {
    req.url = req.url.slice(4) || '/';
  }
  next();
});

// Parse JSON bodies
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Middleware to attach parsed file data from Netlify Function wrapper
app.use((req, res, next) => {
  // Try multiple ways to access the parsed file data
  const requestId = req.headers['x-request-id'];
  const event = req.apiGateway?.event || req.context?.event;
  
  // First try: Get from parsed file store using request ID
  if (requestId && parsedFileStore.has(requestId)) {
    const { file, fields } = parsedFileStore.get(requestId);
    req.file = file;
    if (fields) {
      req.body = { ...req.body, ...fields };
    }
  }
  // Second try: Get directly from event
  else if (event?._parsedFile) {
    req.file = event._parsedFile;
    if (event._parsedFields) {
      req.body = { ...req.body, ...event._parsedFields };
    }
  }
  
  next();
});

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
  googleDriveId: 'text',
  googleDriveUrl: 'text',
  supabasePath: 'text',
  supabaseUrl: 'text',
  mimeType: 'text',
  fileSize: 'integer',
  duration: 'integer',
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
    // Use raw SQL to insert with all columns including Supabase columns
    const result = await sqlConnection`
      INSERT INTO content (
        id, title, type, 
        google_drive_id, google_drive_url,
        supabase_path, supabase_url,
        mime_type, file_size, duration
      ) VALUES (
        ${data.id}, ${data.title}, ${data.type},
        ${data.googleDriveId || null}, ${data.googleDriveUrl || null},
        ${data.supabasePath || null}, ${data.supabaseUrl || null},
        ${data.mimeType}, ${data.fileSize || null}, ${data.duration || null}
      )
      RETURNING 
        id, title, type,
        google_drive_id as "googleDriveId",
        google_drive_url as "googleDriveUrl",
        supabase_path as "supabasePath",
        supabase_url as "supabaseUrl",
        mime_type as "mimeType",
        file_size as "fileSize",
        duration,
        created_at as "createdAt"
    `;
    return result[0];
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
    // Use raw SQL to handle all columns including new Supabase columns
    const result = await sqlConnection`
      SELECT 
        id, title, type, 
        google_drive_id as "googleDriveId",
        google_drive_url as "googleDriveUrl",
        supabase_path as "supabasePath",
        supabase_url as "supabaseUrl",
        mime_type as "mimeType",
        file_size as "fileSize",
        duration,
        created_at as "createdAt"
      FROM content 
      WHERE id = ${id}
      LIMIT 1
    `;
    return result[0] || null;
  },

  async getAllContent() {
    const database = await initDB();
    // Use raw SQL to handle all columns including new Supabase columns
    const result = await sqlConnection`
      SELECT 
        id, title, type, 
        google_drive_id as "googleDriveId",
        google_drive_url as "googleDriveUrl",
        supabase_path as "supabasePath",
        supabase_url as "supabaseUrl",
        mime_type as "mimeType",
        file_size as "fileSize",
        duration,
        created_at as "createdAt"
      FROM content 
      ORDER BY created_at DESC
    `;
    return result;
  },

  async getAllPurchases() {
    const database = await initDB();
    // Use raw SQL to ensure all columns are returned correctly
    const result = await sqlConnection`
      SELECT 
        id, tracking_code as "trackingCode", user_name as "userName",
        unique_id as "uniqueId", content_ids as "contentIds",
        total_amount as "totalAmount", status, paystack_reference as "paystackReference",
        coupon_id as "couponId", created_at as "createdAt"
      FROM purchases 
      ORDER BY created_at DESC
    `;
    return result;
  },

  async getAllCoupons() {
    const database = await initDB();
    return await database.select().from(coupons).orderBy(desc(coupons.createdAt));
  },

  async getCouponByCode(code) {
    const database = await initDB();
    const [coupon] = await database.select().from(coupons).where(eq(coupons.code, code));
    return coupon;
  },

  async deleteContent(id) {
    const database = await initDB();
    // Use raw SQL to delete
    await sqlConnection`
      DELETE FROM content 
      WHERE id = ${id}
    `;
  }
};

// No multer needed - using busboy for serverless file uploads

// Google Drive setup
let oauth2Client = null;
let drive = null;

const initGoogleDrive = () => {
  // Initialize with server credentials for admin uploads
  if (!oauth2Client || !drive) {
    oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_DRIVE_CLIENT_ID,
      process.env.GOOGLE_DRIVE_CLIENT_SECRET,
      'postmessage'
    );
    
    // Set credentials from refresh token
    oauth2Client.setCredentials({
      refresh_token: process.env.GOOGLE_DRIVE_REFRESH_TOKEN,
      access_token: process.env.GOOGLE_DRIVE_ACCESS_TOKEN,
    });
    
    drive = google.drive({ version: 'v3', auth: oauth2Client });
  }
  return { oauth2Client, drive };
};

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

    // Use Supabase URL if available, otherwise use Google Drive URL
    if (content.supabaseUrl) {
      // For Supabase, redirect directly to the public URL
      // This is more efficient than proxying through the function
      res.redirect(content.supabaseUrl);
    } else if (content.googleDriveUrl) {
      res.redirect(content.googleDriveUrl);
    } else {
      res.status(404).json({ error: 'Content URL not available' });
    }
  } catch (error) {
    console.error('Content preview error:', error);
    res.status(500).json({ error: 'Failed to fetch content preview' });
  }
});

// Report failed image load (disabled for now - requires database migration)
app.post('/content/:id/report-failed', async (req, res) => {
  // Silently succeed - feature requires load_status column
  res.json({ success: true });
});

// Delete content
app.delete('/content/:id', async (req, res) => {
  try {
    const content = await storage.getContentById(req.params.id);
    if (!content) {
      return res.status(404).json({ error: 'Content not found' });
    }

    // Delete file from Supabase if it exists
    if (content.supabasePath) {
      try {
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        const BUCKET_NAME = 'content';
        
        if (supabaseUrl && supabaseKey) {
          const deleteUrl = `${supabaseUrl}/storage/v1/object/${BUCKET_NAME}/${content.supabasePath}`;
          await axios.delete(deleteUrl, {
            headers: {
              'Authorization': `Bearer ${supabaseKey}`
            }
          });
        }
      } catch (error) {
        console.error('Failed to delete file from Supabase:', error);
        // Continue with database deletion even if file deletion fails
      }
    }

    // Delete from database
    await storage.deleteContent(req.params.id);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: 'Failed to delete content' });
  }
});

// Upload file to Supabase Storage
app.post('/content/upload', async (req, res) => {
  try {
    console.log('[Upload Route] Request received');
    console.log('[Upload Route] Method:', req.method);
    console.log('[Upload Route] URL:', req.url);
    console.log('[Upload Route] Headers:', JSON.stringify(req.headers));
    console.log('[Upload Route] Request body type:', typeof req.body);
    console.log('[Upload Route] Request body keys:', Object.keys(req.body || {}));
    
    // Try multiple ways to get the file
    const requestId = req.headers['x-request-id'];
    const event = req.apiGateway?.event || req.context?.event;
    
    console.log('[Upload Route] Request ID:', requestId);
    console.log('[Upload Route] Event present:', !!event);
    console.log('[Upload Route] Parsed file store has ID:', requestId ? parsedFileStore.has(requestId) : false);
    
    let file = null;
    let fields = req.body || {};
    
    // Try to get file from parsed file store
    if (requestId && parsedFileStore.has(requestId)) {
      const parsed = parsedFileStore.get(requestId);
      file = parsed.file;
      fields = { ...fields, ...parsed.fields };
      console.log('[Upload Route] Got file from parsed file store');
    }
    // Try to get from event
    else if (event?._parsedFile) {
      file = event._parsedFile;
      fields = { ...fields, ...event._parsedFields };
      console.log('[Upload Route] Got file from event');
    }
    // Try to get from req.file (set by middleware)
    else if (req.file) {
      file = req.file;
      console.log('[Upload Route] Got file from req.file');
    }
    
    console.log('[Upload Route] File:', file ? `present (${file.filename}, ${file.size} bytes)` : 'missing');
    console.log('[Upload Route] Fields:', JSON.stringify(fields));
    
    if (!file) {
      console.error('[Upload Route] No file found in request - checked all sources');
      return res.status(400).json({ 
        error: 'No file uploaded. Please select a file.',
        debug: {
          requestId,
          hasEvent: !!event,
          hasReqFile: !!req.file,
          hasInStore: requestId ? parsedFileStore.has(requestId) : false
        }
      });
    }

    const title = typeof fields === 'object' ? fields.title : req.body?.title;
    if (!title) {
      console.error('[Upload] No title provided');
      return res.status(400).json({ error: 'Title is required' });
    }

    const mimeType = file.mimetype;
    const isImage = mimeType.startsWith('image/');
    const isVideo = mimeType.startsWith('video/');

    if (!isImage && !isVideo) {
      return res.status(400).json({ error: 'Only image and video files are allowed' });
    }

    const type = isImage ? 'image' : 'video';
    console.log('[Upload] File type:', type, 'MIME:', mimeType, 'Size:', file.size || file.buffer?.length);

    // Upload to Supabase Storage
    console.log('[Upload] Uploading to Supabase...');
    const { path: supabasePath, url: supabaseUrl } = await uploadFileToSupabase(
      file.buffer,
      file.originalname || file.filename,
      mimeType
    );
    console.log('[Upload] Uploaded to Supabase:', supabasePath);

    // Create content record
    console.log('[Upload] Creating database record...');
    const content = await storage.createContent({
      id: randomUUID(),
      title,
      type,
      supabasePath,
      supabaseUrl,
      mimeType: mimeType,
      fileSize: file.size || file.buffer.length,
      duration: null,
      googleDriveId: null,
      googleDriveUrl: null,
    });
    console.log('[Upload] Content created:', content.id);

    res.json(content);
  } catch (error) {
    console.error('[Upload] File upload error:', error);
    console.error('[Upload] Error stack:', error.stack);
    res.status(500).json({ 
      error: error?.message || 'Failed to upload file',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
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

// Removed duplicate upload route - handled directly in handler

// 404 diagnostics at the very end (after routes)
app.use((req, res) => {
  console.warn('[404]', { method: req.method, url: req.url, originalUrl: req.originalUrl });
  res.status(404).json({ error: 'Not Found', url: req.url });
});

// Export the Express app as a Netlify Function using serverless-http
const serverless = require('serverless-http');
const baseHandler = serverless(app);

// Temporary storage for parsed file data (keyed by request ID)
const parsedFileStore = new Map();

// Wrap the handler to parse multipart form data for file uploads
module.exports.handler = async (event, context) => {
  // Check if this is a file upload request
  const contentType = event.headers['content-type'] || event.headers['Content-Type'] || '';
  const path = event.path || event.rawPath || '';
  const method = event.httpMethod || event.requestContext?.http?.method || 'GET';
  
  console.log('[Handler] Request path:', path);
  console.log('[Handler] Content-Type:', contentType);
  console.log('[Handler] Method:', method);
  console.log('[Handler] Body present:', !!event.body);
  console.log('[Handler] Body isBase64Encoded:', event.isBase64Encoded);
  
  // Normalize path - remove Netlify function prefix if present
  let normalizedPath = path;
  if (path.startsWith('/.netlify/functions/api')) {
    normalizedPath = path.slice('/.netlify/functions/api'.length) || '/';
  }
  if (normalizedPath.startsWith('/api/')) {
    normalizedPath = normalizedPath.slice(4) || '/';
  }
  
  // Check if this is an upload request
  const isUploadRequest = method === 'POST' && 
    (normalizedPath === '/content/upload' || normalizedPath.includes('/content/upload')) &&
    (contentType.includes('multipart/form-data') || contentType.startsWith('multipart/'));
  
  console.log('[Handler] Normalized path:', normalizedPath);
  console.log('[Handler] Is upload request:', isUploadRequest);
  
  if (isUploadRequest) {
    // Handle upload directly - don't go through Express
    try {
      console.log('[Upload] Handling upload directly...');
      
      if (!event.body) {
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'No request body received' })
        };
      }
      
      // Parse multipart form data
      const { fields, files } = await parseMultipartForm(event);
      
      if (files.length === 0) {
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'No file found in upload request' })
        };
      }
      
      const file = files[0];
      const title = fields.title || file.filename || 'Untitled';
      
      const mimeType = file.mimetype;
      const isImage = mimeType.startsWith('image/');
      const isVideo = mimeType.startsWith('video/');
      
      if (!isImage && !isVideo) {
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Only image and video files are allowed' })
        };
      }
      
      const type = isImage ? 'image' : 'video';
      console.log('[Upload] Processing:', file.filename, type, file.buffer.length, 'bytes');
      
      // Upload to Supabase
      const { path: supabasePath, url: supabaseUrl } = await uploadFileToSupabase(
        file.buffer,
        file.filename,
        mimeType
      );
      console.log('[Upload] Uploaded to Supabase:', supabasePath);
      
      // Create content record
      const content = await storage.createContent({
        id: randomUUID(),
        title,
        type,
        supabasePath,
        supabaseUrl,
        mimeType: mimeType,
        fileSize: file.buffer.length,
        duration: null,
        googleDriveId: null,
        googleDriveUrl: null,
      });
      console.log('[Upload] Content created:', content.id);
      
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(content)
      };
    } catch (error) {
      console.error('[Upload] Error:', error);
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          error: 'Failed to upload file', 
          details: error.message
        })
      };
    }
  }
  
  // For non-upload requests, use the standard handler
  try {
    const response = await baseHandler(event, context);
    // Ensure all responses are JSON if they're errors
    if (response && response.statusCode >= 400 && response.headers && response.headers['Content-Type'] && response.headers['Content-Type'].includes('text/html')) {
      return {
        ...response,
        headers: {
          ...response.headers,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ error: response.body || 'An error occurred' })
      };
    }
    return response;
  } catch (error) {
    console.error('[Handler] Error in base handler:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Internal server error', details: error.message })
    };
  }
};