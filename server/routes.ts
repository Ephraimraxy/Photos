import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import axios from "axios";
import { getUncachableGoogleDriveClient, extractFileIdFromUrl } from "./google-drive";
import { addWatermarkToImageBuffer } from "./watermark";
import { randomUUID } from "crypto";

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

  // Proxy endpoint to serve watermarked preview from Google Drive
  app.get("/api/content/:id/preview", async (req, res) => {
    try {
      const content = await storage.getContentById(req.params.id);
      if (!content) {
        return res.status(404).json({ error: "Content not found" });
      }

      const drive = await getUncachableGoogleDriveClient();

      if (content.type === "image") {
        // For images, fetch from Google Drive and apply watermark
        const response = await drive.files.get(
          { fileId: content.googleDriveId, alt: 'media' },
          { responseType: 'arraybuffer' }
        );

        const imageBuffer = Buffer.from(response.data as ArrayBuffer);
        const watermarkedBuffer = await addWatermarkToImageBuffer(imageBuffer);

        res.set('Content-Type', 'image/jpeg');
        res.send(watermarkedBuffer);
      } else {
        // For videos, get thumbnail from Google Drive
        const fileMetadata = await drive.files.get({
          fileId: content.googleDriveId,
          fields: "thumbnailLink"
        });

        if (fileMetadata.data.thumbnailLink) {
          // Redirect to Google's thumbnail
          res.redirect(fileMetadata.data.thumbnailLink);
        } else {
          res.status(404).json({ error: "Thumbnail not available" });
        }
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
        publicKey: paystackResponse.data.data.access_code ? "" : "pk_test_dummy",
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

  // Download content from Google Drive (requires valid token)
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

      const drive = await getUncachableGoogleDriveClient();

      // Get file metadata for filename
      const fileMetadata = await drive.files.get({
        fileId: content.googleDriveId,
        fields: "name"
      });

      // Download from Google Drive
      const response = await drive.files.get(
        { fileId: content.googleDriveId, alt: 'media' },
        { responseType: 'arraybuffer' }
      );

      // Mark token as used
      await storage.markTokenAsUsed(req.params.token);

      // Send file
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
