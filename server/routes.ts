import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import multer from "multer";
import axios from "axios";
import { getUncachableGoogleDriveClient, extractFileIdFromUrl } from "./google-drive";
import { addWatermarkToImage, addWatermarkToVideo, getWatermarkedFilename } from "./watermark";
import { randomUUID } from "crypto";
import path from "path";
import fs from "fs";

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB limit
});

// Ensure uploads directories exist
const uploadsDir = path.join(process.cwd(), "uploads");
const originalsDir = path.join(uploadsDir, "originals");
const watermarkedDir = path.join(uploadsDir, "watermarked");

[uploadsDir, originalsDir, watermarkedDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Get all content
  app.get("/api/content", async (req, res) => {
    try {
      const content = await storage.getAllContent();
      res.json(content);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch content" });
    }
  });

  // Upload content directly
  app.post("/api/content/upload", upload.single("file"), async (req, res) => {
    try {
      if (!req.file || !req.body.title) {
        return res.status(400).json({ error: "File and title are required" });
      }

      const file = req.file;
      const title = req.body.title;
      const fileType = file.mimetype.startsWith("image/") ? "image" : "video";
      
      // Save original file to secure directory
      const filename = `${randomUUID()}${path.extname(file.originalname)}`;
      const originalPath = path.join(originalsDir, filename);
      fs.writeFileSync(originalPath, file.buffer);

      // Create watermarked version
      const watermarkedFilename = getWatermarkedFilename(filename);
      const watermarkedPath = path.join(watermarkedDir, watermarkedFilename);
      let actualWatermarkedPath = watermarkedPath;

      if (fileType === "image") {
        await addWatermarkToImage(originalPath, watermarkedPath);
      } else {
        // For videos, get the thumbnail path
        actualWatermarkedPath = await addWatermarkToVideo(originalPath, watermarkedPath);
      }

      const watermarkedFilenameToUse = path.basename(actualWatermarkedPath);

      const content = await storage.createContent({
        title,
        type: fileType,
        originalUrl: `uploads/originals/${filename}`,
        watermarkedUrl: `uploads/watermarked/${watermarkedFilenameToUse}`,
        thumbnailUrl: `uploads/watermarked/${watermarkedFilenameToUse}`,
        googleDriveId: null,
        fileSize: file.size,
        duration: null,
      });

      res.json(content);
    } catch (error) {
      console.error("Upload error:", error);
      res.status(500).json({ error: "Upload failed" });
    }
  });

  // Import from Google Drive
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
        fields: "id,name,mimeType,size,webContentLink,thumbnailLink"
      });

      // Get the download URL
      const response = await drive.files.get(
        { fileId, alt: 'media' },
        { responseType: 'arraybuffer' }
      );

      // Save original file to secure directory
      const filename = `${randomUUID()}${path.extname(fileMetadata.data.name || '')}`;
      const originalPath = path.join(originalsDir, filename);
      fs.writeFileSync(originalPath, Buffer.from(response.data as ArrayBuffer));

      // Create watermarked version
      const watermarkedFilename = getWatermarkedFilename(filename);
      const watermarkedPath = path.join(watermarkedDir, watermarkedFilename);
      let actualWatermarkedPath = watermarkedPath;

      if (type === "image") {
        await addWatermarkToImage(originalPath, watermarkedPath);
      } else {
        // For videos, get the thumbnail path
        actualWatermarkedPath = await addWatermarkToVideo(originalPath, watermarkedPath);
      }

      const watermarkedFilenameToUse = path.basename(actualWatermarkedPath);

      const content = await storage.createContent({
        title,
        type,
        originalUrl: `uploads/originals/${filename}`,
        watermarkedUrl: `uploads/watermarked/${watermarkedFilenameToUse}`,
        thumbnailUrl: `uploads/watermarked/${watermarkedFilenameToUse}`,
        googleDriveId: fileId,
        fileSize: parseInt(fileMetadata.data.size || "0"),
        duration: null,
      });

      res.json(content);
    } catch (error) {
      console.error("Google Drive import error:", error);
      res.status(500).json({ error: "Failed to import from Google Drive" });
    }
  });

  // Delete content
  app.delete("/api/content/:id", async (req, res) => {
    try {
      const content = await storage.getContentById(req.params.id);
      if (!content) {
        return res.status(404).json({ error: "Content not found" });
      }

      // Delete original and watermarked files
      if (content.originalUrl.startsWith("uploads/originals/")) {
        const originalPath = path.join(process.cwd(), content.originalUrl);
        if (fs.existsSync(originalPath)) {
          fs.unlinkSync(originalPath);
        }
      }

      if (content.watermarkedUrl.startsWith("uploads/watermarked/")) {
        const watermarkedPath = path.join(process.cwd(), content.watermarkedUrl);
        if (fs.existsSync(watermarkedPath)) {
          fs.unlinkSync(watermarkedPath);
        }
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
      const { contentIds, sessionId } = req.body;

      if (!contentIds || !Array.isArray(contentIds) || contentIds.length === 0) {
        return res.status(400).json({ error: "Content IDs are required" });
      }

      const amount = contentIds.length * 200 * 100; // Paystack uses kobo
      const reference = `DOCUEDIT-${randomUUID()}`;

      // Create purchase record
      await storage.createPurchase({
        sessionId,
        paystackReference: reference,
        contentIds,
        totalAmount: contentIds.length * 200,
        status: "pending",
      });

      // Initialize Paystack payment
      const paystackResponse = await axios.post(
        "https://api.paystack.co/transaction/initialize",
        {
          amount,
          email: "customer@docueditphotos.com", // In production, this would be user's email
          reference,
          metadata: {
            contentIds,
            sessionId,
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
        email: "customer@docueditphotos.com",
        publicKey: paystackResponse.data.data.access_code ? "" : "pk_test_dummy", // Paystack will handle this
        authorizationUrl: paystackResponse.data.data.authorization_url,
      });
    } catch (error) {
      console.error("Payment initialization error:", error);
      res.status(500).json({ error: "Failed to initialize payment" });
    }
  });

  // Verify payment
  app.post("/api/payment/verify", async (req, res) => {
    try {
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
        return res.status(404).json({ error: "Purchase not found" });
      }

      await storage.updatePurchaseStatus(purchase.id, "completed");

      // Generate download tokens (24 hour expiry)
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);

      for (const contentId of purchase.contentIds) {
        const token = randomUUID();
        await storage.createDownloadToken({
          purchaseId: purchase.id,
          contentId,
          token,
          expiresAt,
          used: false,
        });
      }

      res.json({ purchaseId: purchase.id });
    } catch (error) {
      console.error("Payment verification error:", error);
      res.status(500).json({ error: "Failed to verify payment" });
    }
  });

  // Get purchase details
  app.get("/api/purchase/:id", async (req, res) => {
    try {
      const purchase = await storage.getPurchaseById(req.params.id);
      if (!purchase || purchase.status !== "completed") {
        return res.status(404).json({ error: "Purchase not found" });
      }

      // Get content details and download tokens
      const items = await Promise.all(
        purchase.contentIds.map(async (contentId) => {
          const content = await storage.getContentById(contentId);
          const tokens = Array.from((storage as any).downloadTokens.values())
            .filter((t: any) => t.purchaseId === purchase.id && t.contentId === contentId);
          const token = tokens[0];

          return {
            id: content?.id || contentId,
            title: content?.title || "Unknown",
            type: content?.type || "image",
            downloadToken: token?.token || "",
          };
        })
      );

      // Get expiry from first token
      const firstToken = Array.from((storage as any).downloadTokens.values())
        .find((t: any) => t.purchaseId === purchase.id);

      res.json({
        purchaseId: purchase.id,
        items,
        expiresAt: firstToken?.expiresAt || new Date(),
      });
    } catch (error) {
      console.error("Purchase fetch error:", error);
      res.status(500).json({ error: "Failed to fetch purchase" });
    }
  });

  // Download content (requires valid token)
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

      // Send original file (secured behind token)
      const filepath = path.join(process.cwd(), content.originalUrl);
      if (!fs.existsSync(filepath)) {
        return res.status(404).json({ error: "File not found" });
      }

      res.download(filepath, content.title);
    } catch (error) {
      console.error("Download error:", error);
      res.status(500).json({ error: "Download failed" });
    }
  });

  // Serve only watermarked files publicly
  app.use("/uploads/watermarked", (req, res) => {
    const filepath = path.join(watermarkedDir, path.basename(req.path));
    if (fs.existsSync(filepath)) {
      res.sendFile(filepath);
    } else {
      res.status(404).json({ error: "File not found" });
    }
  });

  // Block direct access to originals
  app.use("/uploads/originals", (req, res) => {
    res.status(403).json({ error: "Unauthorized access" });
  });

  const httpServer = createServer(app);

  return httpServer;
}
