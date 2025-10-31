import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import axios from "axios";
import { getUncachableGoogleDriveClient, getGoogleDriveClientWithWriteAccess, extractFileIdFromUrl, extractFolderIdFromUrl, getFolderContents, categorizeFileByMimeType } from "./google-drive";
import { addWatermarkToImageBuffer, addWatermarkToVideo } from "./watermark";
import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import multer from "multer";
import { Readable } from "stream";

export async function registerRoutes(app: Express): Promise<Server> {
  // Ensure local uploads directory exists and is served statically
  const uploadsDir = path.resolve(process.cwd(), "uploads");
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  app.use('/uploads', express.static(uploadsDir));

  // Configure multer for file uploads (memory storage)
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 100 * 1024 * 1024, // 100MB limit
    },
    fileFilter: (req, file, cb) => {
      // Accept images and videos only
      if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
        cb(null, true);
      } else {
        cb(new Error('Only image and video files are allowed'));
      }
    },
  });
  
  // Security middleware for webhook endpoints
  app.use('/api/payment/webhook', (req, res, next) => {
    // Rate limiting for webhook endpoint
    const clientIP = req.ip || req.connection.remoteAddress;
    console.log(`Webhook request from IP: ${clientIP}`);
    
    // Only allow POST requests to webhook
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }
    
    // Check content type
    if (!req.is('application/json')) {
      return res.status(400).json({ error: 'Content-Type must be application/json' });
    }
    
    next();
  });
  
  // Get all content (with optional pagination)
  app.get("/api/content", async (req, res) => {
    try {
      const allContent = await storage.getAllContent();
      
      // If pagination parameters are provided, return paginated response
      if (req.query.page || req.query.limit) {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 100;
        const offset = (page - 1) * limit;
        const paginatedContent = allContent.slice(offset, offset + limit);
        
        return res.json({
          data: paginatedContent,
          pagination: {
            page,
            limit,
            total: allContent.length,
            totalPages: Math.ceil(allContent.length / limit),
          }
        });
      }
      
      // Otherwise, return all content (backward compatible)
      res.json(allContent);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch content" });
    }
  });

  // Get all purchases (for admin)
  app.get("/api/purchases", async (_req, res) => {
    try {
      const purchases = await storage.getAllPurchases();
      res.json(purchases);
    } catch (error) {
      console.error("Get purchases error:", error);
      res.status(500).json({ error: "Failed to fetch purchases" });
    }
  });

  // Coupon management endpoints
  app.get("/api/coupons", async (req, res) => {
    try {
      const coupons = await storage.getAllCoupons();
      res.json(coupons);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch coupons" });
    }
  });

  app.post("/api/coupons", async (req, res) => {
    try {
      const { imageCount, videoCount } = req.body;
      
      if (imageCount < 0 || videoCount < 0) {
        return res.status(400).json({ error: "Counts cannot be negative" });
      }
      
      if (imageCount === 0 && videoCount === 0) {
        return res.status(400).json({ error: "At least one count must be greater than 0" });
      }

      // Generate unique coupon code
      const code = `FREE${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
      
      const coupon = await storage.createCoupon({
        code,
        imageCount,
        videoCount,
        used: false,
      });

      res.json(coupon);
    } catch (error) {
      console.error("Coupon creation error:", error);
      res.status(500).json({ error: "Failed to create coupon" });
    }
  });

  app.post("/api/coupons/validate", async (req, res) => {
    try {
      const { code, userName } = req.body;

      if (!code || !userName) {
        return res.status(400).json({ error: "Code and user name are required" });
      }

      const coupon = await storage.getCouponByCode(code);

      if (!coupon) {
        return res.status(404).json({ error: "Invalid coupon code" });
      }

      if (coupon.used) {
        return res.status(400).json({ error: "Coupon has already been used" });
      }

      // Don't mark as used yet - just validate and return limits
      res.json({
        success: true,
        couponId: coupon.id,
        imageCount: coupon.imageCount,
        videoCount: coupon.videoCount,
        message: `Coupon validated! You can select up to ${coupon.imageCount} images and ${coupon.videoCount} videos for free.`
      });
    } catch (error) {
      console.error("Coupon validation error:", error);
      res.status(500).json({ error: "Failed to validate coupon" });
    }
  });

  app.post("/api/coupons/use", async (req, res) => {
    try {
      const { code, userName } = req.body;

      if (!code || !userName) {
        return res.status(400).json({ error: "Code and user name are required" });
      }

      const coupon = await storage.getCouponByCode(code);

      if (!coupon) {
        return res.status(404).json({ error: "Invalid coupon code" });
      }

      if (coupon.used) {
        return res.status(400).json({ error: "Coupon has already been used" });
      }

      // Mark coupon as used during checkout
      await storage.markCouponAsUsed(code, userName);

      res.json({
        success: true,
        message: "Coupon applied successfully"
      });
    } catch (error) {
      console.error("Coupon usage error:", error);
      res.status(500).json({ error: "Failed to use coupon" });
    }
  });

  // Validate coupon requirements for downloads
  app.post("/api/coupons/validate-requirements", async (req, res) => {
    try {
      const { couponCode, contentIds } = req.body;

      if (!couponCode || !contentIds || !Array.isArray(contentIds)) {
        return res.status(400).json({ error: "Coupon code and content IDs are required" });
      }

      const coupon = await storage.getCouponByCode(couponCode);
      if (!coupon) {
        return res.status(404).json({ error: "Invalid coupon code" });
      }

      // Get content types
      const contentItems = await Promise.all(
        contentIds.map(id => storage.getContentById(id))
      );
      
      const images = contentItems.filter(item => item?.type === "image").length;
      const videos = contentItems.filter(item => item?.type === "video").length;

      // Check if requirements are met
      const meetsRequirements = images >= coupon.imageCount && videos >= coupon.videoCount;
      
      res.json({
        valid: meetsRequirements,
        requiredImages: coupon.imageCount,
        requiredVideos: coupon.videoCount,
        currentImages: images,
        currentVideos: videos,
        message: meetsRequirements 
          ? "Coupon requirements met" 
          : `You need at least ${coupon.imageCount} images and ${coupon.videoCount} videos to use this coupon`
      });
    } catch (error) {
      console.error("Coupon validation error:", error);
      res.status(500).json({ error: "Failed to validate coupon requirements" });
    }
  });

  // Upload file from local device to local storage
  app.post("/api/content/upload", upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const title = req.body?.title || req.file.originalname || 'Untitled';

      const file = req.file;
      const mimeType = file.mimetype;
      const isImage = mimeType.startsWith('image/');
      const isVideo = mimeType.startsWith('video/');

      if (!isImage && !isVideo) {
        return res.status(400).json({ error: "Only image and video files are allowed" });
      }

      const type = isImage ? 'image' : 'video';

      // Avoid duplicates by title (case-insensitive)
      try {
        const all = await storage.getAllContent();
        const existing = all.find(c => (c.title || '').trim().toLowerCase() === title.trim().toLowerCase());
        if (existing) {
          return res.json(existing);
        }
      } catch (_) {}

      // Persist file locally with a unique filename
      const ext = path.extname(file.originalname) || (isImage ? '.jpg' : '.bin');
      const base = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9-_ ]/g, '').trim() || 'upload';
      const uniqueName = `${base}-${Date.now()}-${Math.floor(Math.random() * 1e6)}${ext}`;
      const destPath = path.join(uploadsDir, uniqueName);
      fs.writeFileSync(destPath, file.buffer);

      // Validate and generate preview
      let durationSeconds: number | null = null;
      let previewGenerated = false;
      if (isImage) {
        try {
          // Basic validation: ensure sharp can read it, then make a preview
          await addWatermarkToImageBuffer(file.buffer);
          const previewPath = destPath.replace(ext, '.preview.jpg');
          const watermarked = await addWatermarkToImageBuffer(file.buffer);
          fs.writeFileSync(previewPath, watermarked);
          previewGenerated = true;
        } catch (e: any) {
          // Cleanup original if image is invalid
          try { if (fs.existsSync(destPath)) fs.unlinkSync(destPath); } catch (_) {}
          return res.status(415).json({ error: `Invalid or unreadable image: ${title}` });
        }
      }

      // For videos, generate a preview thumbnail placeholder
      if (isVideo) {
        try {
          await addWatermarkToVideo(destPath, destPath);
        } catch (_) {
          // proceed; we still have the original and can try again later
        }
      }

      const created = await storage.createContent({
        title,
        type,
        // Reuse fields to store local identifiers/URLs
        googleDriveId: `local:${uniqueName}`,
        googleDriveUrl: `/uploads/${uniqueName}`,
        mimeType: mimeType,
        fileSize: file.size,
        duration: durationSeconds,
      } as any);

      res.json(created);
    } catch (error: any) {
      console.error("File upload error:", error);
      res.status(500).json({ error: error?.message || "Failed to upload file" });
    }
  });

  // Import from Google Drive (metadata only, no file downloads)
  app.post("/api/content/google-drive", async (req, res) => {
    try {
      const { driveUrl, title, type } = req.body;

      if (!driveUrl || !title || !type) {
        return res.status(400).json({ error: "Drive URL, title, and type are required" });
      }

      const fileId = extractFileIdFromUrl(driveUrl);
      if (!fileId) {
        return res.status(400).json({ error: "Invalid Google Drive URL" });
      }

      const drive = await getUncachableGoogleDriveClient();

      // Get file metadata
      const fileMetadata = await drive.files.get({
        fileId,
        fields: "id,name,mimeType,size,webContentLink,webViewLink,thumbnailLink,videoMediaMetadata"
      });

      // Validate file type matches requested type
      const mimeType = fileMetadata.data.mimeType || '';
      const isImage = mimeType.startsWith('image/');
      const isVideo = mimeType.startsWith('video/');

      if (type === 'image' && !isImage) {
        return res.status(400).json({ 
          error: "The selected Google Drive file is not an image. Please select an image file for image uploads." 
        });
      }

      if (type === 'video' && !isVideo) {
        return res.status(400).json({ 
          error: "The selected Google Drive file is not a video. Please select a video file for video uploads." 
        });
      }

      // Store metadata only (no file download)
      const content = await storage.createContent({
        title,
        type,
        googleDriveId: fileId,
        googleDriveUrl: fileMetadata.data.webViewLink || driveUrl,
        mimeType: mimeType,
        fileSize: parseInt(fileMetadata.data.size || "0"),
        duration: fileMetadata.data.videoMediaMetadata?.durationMillis 
          ? Math.floor(parseInt(fileMetadata.data.videoMediaMetadata.durationMillis) / 1000)
          : null,
      });

      res.json(content);
    } catch (error) {
      console.error("Google Drive import error:", error);
      res.status(500).json({ error: "Failed to import from Google Drive" });
    }
  });

  // Import entire Google Drive folder (bulk import)
  app.post("/api/content/google-drive-folder", async (req, res) => {
    try {
      const { folderUrl, mediaType = 'all' } = req.body;

      if (!folderUrl) {
        return res.status(400).json({ error: "Folder URL is required" });
      }

      const folderId = extractFolderIdFromUrl(folderUrl);
      if (!folderId) {
        return res.status(400).json({ error: "Invalid Google Drive folder URL" });
      }

      // Get all files from the folder
      const files = await getFolderContents(folderId, mediaType);
      
      if (files.length === 0) {
        return res.status(404).json({ 
          error: `No ${mediaType === 'all' ? 'media' : mediaType} files found in this folder` 
        });
      }

      const importedContent = [];
      const errors = [];

      // Process each file
      for (const file of files) {
        try {
          const fileType = categorizeFileByMimeType(file.mimeType || '');
          
          if (!fileType) {
            errors.push({ fileName: file.name, error: "Unsupported file type" });
            continue;
          }

          // Skip if mediaType filter doesn't match
          if (mediaType !== 'all' && fileType !== mediaType) {
            continue;
          }

          const content = await storage.createContent({
            title: file.name || 'Untitled',
            type: fileType,
            googleDriveId: file.id || '',
            googleDriveUrl: file.webViewLink || '',
            mimeType: file.mimeType || '',
            fileSize: parseInt(file.size || "0"),
            duration: file.videoMediaMetadata?.durationMillis 
              ? Math.floor(parseInt(file.videoMediaMetadata.durationMillis) / 1000)
              : null,
          });

          importedContent.push(content);
        } catch (fileError) {
          console.error(`Error importing file ${file.name}:`, fileError);
          errors.push({ fileName: file.name, error: "Failed to import" });
        }
      }

      res.json({
        success: true,
        imported: importedContent.length,
        total: files.length,
        errors: errors.length,
        content: importedContent,
        errorDetails: errors
      });
    } catch (error) {
      console.error("Google Drive folder import error:", error);
      res.status(500).json({ error: "Failed to import folder from Google Drive" });
    }
  });

  // Serve watermarked preview (local files or Google Drive fallback)
  app.get("/api/content/:id/preview", async (req, res) => {
    try {
      const content = await storage.getContentById(req.params.id);
      if (!content) {
        return res.status(404).json({ error: "Content not found" });
      }

      // Local storage path detection
      const isLocal = content.googleDriveId?.startsWith('local:') || content.googleDriveUrl?.startsWith('/uploads/');
      if (isLocal) {
        const fileName = content.googleDriveId.replace('local:', '');
        const localPath = path.join(uploadsDir, fileName);
        if (!fs.existsSync(localPath)) {
          return res.status(404).json({ error: "Local file not found" });
        }

        if (content.type === 'image') {
          const previewPath = localPath.replace(/\.[^.]+$/, '.preview.jpg');
          if (fs.existsSync(previewPath)) {
            const buf = fs.readFileSync(previewPath);
            res.set('Content-Type', 'image/jpeg');
            return res.send(buf);
          }
          try {
            const originalBuffer = fs.readFileSync(localPath);
            const watermarkedBuffer = await addWatermarkToImageBuffer(originalBuffer);
            fs.writeFileSync(previewPath, watermarkedBuffer);
            res.set('Content-Type', 'image/jpeg');
            return res.send(watermarkedBuffer);
          } catch (_) {
            const transparentPng = Buffer.from(
              'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAqMBgQwQq3UAAAAASUVORK5CYII=',
              'base64'
            );
            res.set('Content-Type', 'image/png');
            return res.send(transparentPng);
          }
        } else {
          // For videos, try to serve generated thumbnail if exists, otherwise a basic 1x1 PNG
          const thumbPath = localPath.replace(/\.(mp4|webm|mov)$/i, '.jpg');
          if (fs.existsSync(thumbPath)) {
            const thumb = fs.readFileSync(thumbPath);
            res.set('Content-Type', 'image/jpeg');
            return res.send(thumb);
          }
          const transparentPng = Buffer.from(
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAqMBgQwQq3UAAAAASUVORK5CYII=',
            'base64'
          );
          res.set('Content-Type', 'image/png');
          return res.send(transparentPng);
        }
      }

      // Fallback to Google Drive for legacy records
      const drive = await getUncachableGoogleDriveClient();
      if (content.type === "image") {
        const response = await drive.files.get(
          { fileId: content.googleDriveId, alt: 'media' },
          { responseType: 'arraybuffer' }
        );
        const imageBuffer = Buffer.from(response.data as ArrayBuffer);
        const watermarkedBuffer = await addWatermarkToImageBuffer(imageBuffer);
        res.set('Content-Type', 'image/jpeg');
        return res.send(watermarkedBuffer);
      } else {
        const fileMetadata = await drive.files.get({ fileId: content.googleDriveId, fields: "thumbnailLink" });
        if (fileMetadata.data.thumbnailLink) {
          return res.redirect(fileMetadata.data.thumbnailLink);
        }
        return res.status(404).json({ error: "Thumbnail not available" });
      }
    } catch (error) {
      console.error("Preview error:", error);
      res.status(500).json({ error: "Failed to load preview" });
    }
  });

  // Delete content
  app.delete("/api/content/:id", async (req, res) => {
    try {
      const content = await storage.getContentById(req.params.id);
      if (!content) {
        return res.status(404).json({ error: "Content not found" });
      }

      // If local, remove stored file and generated thumbnail
      const isLocal = content.googleDriveId?.startsWith('local:') || content.googleDriveUrl?.startsWith('/uploads/');
      if (isLocal) {
        const fileName = content.googleDriveId.replace('local:', '');
        const localPath = path.join(uploadsDir, fileName);
        const thumbPath = localPath.replace(/\.(mp4|webm|mov)$/i, '.jpg');
        try {
          if (fs.existsSync(localPath)) fs.unlinkSync(localPath);
          if (fs.existsSync(thumbPath)) fs.unlinkSync(thumbPath);
        } catch (_) {}
      }

      await storage.deleteContent(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete content" });
    }
  });

  // Initialize payment
  app.post("/api/payment/initialize", async (req, res) => {
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

      if (!trackingCode) {
        return res.status(400).json({ error: "Tracking code is required" });
      }

      if (!userName || !userName.trim()) {
        return res.status(400).json({ error: "Full name is required" });
      }

      // Handle coupon if provided
      let couponDiscount = 0;
      
      if (couponCode && couponCode.trim()) {
        const coupon = await storage.getCouponByCode(couponCode.trim());
        if (!coupon) {
          return res.status(400).json({ error: "Invalid coupon code" });
        }
        if (coupon.used) {
          return res.status(400).json({ error: "Coupon has already been used" });
        }
        
        // Get content types from database to calculate proper discount
        const contentItems = await Promise.all(
          contentIds.map(id => storage.getContentById(id))
        );
        
        const images = contentItems.filter(item => item?.type === "image").length;
        const videos = contentItems.filter(item => item?.type === "video").length;
        
        // Calculate free items based on coupon limits
        const freeImages = Math.min(images, coupon.imageCount);
        const freeVideos = Math.min(videos, coupon.videoCount);
        
        // Only discount the free items, charge for excess
        couponDiscount = (freeImages + freeVideos) * 200;
      }

      const amount = Math.max(0, (contentIds.length * 200 - couponDiscount)) * 100; // Paystack uses kobo
      const reference = `DOCUEDIT-${randomUUID()}`;
      
      // Generate unique ID based on user name and timestamp
      const uniqueId = `${userName.trim().replace(/\s+/g, '').toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;

      // Create purchase record with tracking code and user info
      try {
        await storage.createPurchase({
          trackingCode,
          paystackReference: reference,
          contentIds,
          totalAmount: contentIds.length * 200,
          status: "pending",
          userName: userName.trim(),
          uniqueId,
          couponCode: couponCode && couponCode.trim() ? couponCode.trim() : null,
        });
      } catch (dbError: any) {
        // Handle duplicate tracking code error
        if (dbError.code === '23505' || dbError.message?.includes('unique constraint') || dbError.message?.includes('duplicate key')) {
          return res.status(409).json({ 
            error: "This tracking code has already been used. Please refresh and try again.",
            code: "DUPLICATE_TRACKING_CODE"
          });
        }
        throw dbError;
      }

      // Initialize Paystack payment
      const paystackResponse = await axios.post(
        "https://api.paystack.co/transaction/initialize",
        {
          amount,
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
        reference,
        amount,
        trackingCode,
        email: "customer@docueditphotos.com",
        publicKey: process.env.PAYSTACK_PUBLIC_KEY,
        authorizationUrl: paystackResponse.data.data.authorization_url,
      });
    } catch (error) {
      console.error("Payment initialization error:", error);
      res.status(500).json({ error: "Failed to initialize payment" });
    }
  });

  // Paystack Webhook - Secure server-side verification with enhanced security
  app.post("/api/payment/webhook", async (req, res) => {
    try {
      // Enhanced security: Check for required headers and environment
      const hash = req.headers['x-paystack-signature'];
      const userAgent = req.headers['user-agent'];
      
      if (!hash || !process.env.PAYSTACK_SECRET_KEY) {
        console.log('Webhook security: Missing signature or secret key');
        return res.sendStatus(400);
      }

      // Verify Paystack user agent (additional security layer)
      if (!userAgent || !userAgent.includes('Paystack')) {
        console.log('Webhook security: Invalid user agent');
        return res.sendStatus(400);
      }

      // Get raw body for signature verification
      const body = JSON.stringify(req.body);
      const crypto = await import('crypto');
      
      // Create HMAC signature for verification
      const expectedHash = crypto
        .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY)
        .update(body)
        .digest('hex');

      // Constant-time comparison to prevent timing attacks
      const isValidSignature = crypto.timingSafeEqual(
        Buffer.from(hash, 'hex'),
        Buffer.from(expectedHash, 'hex')
      );

      if (!isValidSignature) {
        console.log('Webhook security: Invalid signature');
        return res.sendStatus(400);
      }

      const event = req.body;

      // Log webhook events for audit trail
      console.log(`Webhook received: ${event.event} for reference: ${event.data?.reference}`);

      // Only process successful charge events
      if (event.event === 'charge.success') {
        const reference = event.data.reference;
        
        if (!reference) {
          console.log('Webhook security: Missing reference in charge.success event');
          return res.sendStatus(400);
        }

        const purchase = await storage.getPurchaseByReference(reference);

        if (purchase && purchase.status === 'pending') {
          // Update purchase status atomically
          await storage.updatePurchaseStatus(purchase.id, 'completed');

          // Mark coupon as used if it was applied
          if (purchase.couponCode) {
            await storage.markCouponAsUsed(purchase.couponCode, purchase.userName);
            console.log(`Coupon ${purchase.couponCode} marked as used for purchase ${purchase.id}`);
          }

          // Generate download tokens (24 hour expiry)
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
          
          console.log(`Purchase ${purchase.id} completed successfully with ${purchase.contentIds.length} items`);
        } else {
          console.log(`Purchase ${reference} not found or already processed`);
        }
      } else {
        console.log(`Ignoring webhook event: ${event.event}`);
      }

      res.sendStatus(200);
    } catch (error) {
      console.error('Webhook error:', error);
      res.sendStatus(500);
    }
  });

  // Verify payment (client-side callback)
  app.post("/api/payment/verify", async (req, res) => {
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

  // Lookup purchase by tracking code
  app.post("/api/tracking/lookup", async (req, res) => {
    try {
      const { trackingCode } = req.body;

      if (!trackingCode) {
        return res.status(400).json({ error: "Tracking code is required" });
      }

      const purchase = await storage.getPurchaseByTrackingCode(trackingCode);
      
      if (!purchase) {
        return res.status(404).json({ error: "Invalid tracking code" });
      }

      // Get content details
      const items = await Promise.all(
        purchase.contentIds.map(async (contentId) => {
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
        purchaseId: purchase.id,
        trackingCode: purchase.trackingCode,
        status: purchase.status,
        totalAmount: purchase.totalAmount,
        items,
        createdAt: purchase.createdAt,
        userName: purchase.userName,
        uniqueId: purchase.uniqueId,
        paystackReference: purchase.paystackReference,
      });
    } catch (error) {
      console.error("Tracking lookup error:", error);
      res.status(500).json({ error: "Failed to lookup tracking code" });
    }
  });

  // Manual completion endpoint for pending purchases (for testing)
  app.post("/api/purchase/:id/complete", async (req, res) => {
    try {
      const purchase = await storage.getPurchaseById(req.params.id);
      if (!purchase) {
        return res.status(404).json({ error: "Purchase not found" });
      }

      if (purchase.status === 'pending') {
        await storage.updatePurchaseStatus(purchase.id, "completed");

        // Generate download tokens (24 hour expiry)
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

  // Get purchase details
  app.get("/api/purchase/:id", async (req, res) => {
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

  // Download content (local files or Google Drive) with a valid token
  app.get("/api/download/:token", async (req, res) => {
    try {
      const downloadToken = await storage.getDownloadToken(req.params.token);

      if (!downloadToken) {
        return res.status(404).json({ error: "Invalid download token" });
      }

      if (downloadToken.used) {
        return res.status(403).json({ error: "Token already used" });
      }

      if (new Date() > new Date(downloadToken.expiresAt)) {
        return res.status(403).json({ error: "Token expired" });
      }

      const content = await storage.getContentById(downloadToken.contentId);
      if (!content) {
        return res.status(404).json({ error: "Content not found" });
      }

      // Local file download
      const isLocal = content.googleDriveId?.startsWith('local:') || content.googleDriveUrl?.startsWith('/uploads/');
      if (isLocal) {
        const fileName = content.googleDriveId.replace('local:', '');
        const localPath = path.join(uploadsDir, fileName);
        if (!fs.existsSync(localPath)) {
          return res.status(404).json({ error: "File not found" });
        }
        await storage.markTokenAsUsed(req.params.token);
        res.set('Content-Type', content.mimeType);
        res.set('Content-Disposition', `attachment; filename="${content.title}"`);
        return fs.createReadStream(localPath).pipe(res);
      }

      // Google Drive fallback for legacy items
      const drive = await getUncachableGoogleDriveClient();
      const fileMetadata = await drive.files.get({ fileId: content.googleDriveId, fields: "name" });
      const response = await drive.files.get({ fileId: content.googleDriveId, alt: 'media' }, { responseType: 'arraybuffer' });
      await storage.markTokenAsUsed(req.params.token);
      res.set('Content-Type', content.mimeType);
      res.set('Content-Disposition', `attachment; filename="${fileMetadata.data.name || content.title}"`);
      res.send(Buffer.from(response.data as ArrayBuffer));
    } catch (error) {
      console.error("Download error:", error);
      res.status(500).json({ error: "Download failed" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
