import 'dotenv/config';
import { google } from 'googleapis';
import { storage } from './storage';

let connectionSettings: any;

// Initialize Google Drive API with production-ready caching
export async function initializeGoogleDrive() {
  try {
    // Try to get cached token first
    const cachedToken = await storage.getTokenCache('google_drive');
    
    if (cachedToken && new Date(cachedToken.expiresAt) > new Date()) {
      console.log('✅ Using cached Google Drive token from database');
      connectionSettings = {
        auth: new google.auth.OAuth2(
          process.env.GOOGLE_DRIVE_CLIENT_ID,
          process.env.GOOGLE_DRIVE_CLIENT_SECRET
        ),
        accessToken: cachedToken.token,
      };
      return;
    }

    // If no valid cached token, try to refresh
    if (cachedToken) {
      console.log('🔄 Cached token expired, attempting refresh...');
      try {
        const refreshedToken = await refreshAccessToken();
        if (refreshedToken) {
          console.log('✅ Token refreshed successfully');
          return;
        }
      } catch (error) {
        console.log('❌ Token refresh failed, trying direct access token...');
      }
    }

    // Try direct access token
    if (process.env.GOOGLE_DRIVE_ACCESS_TOKEN) {
      console.log('🔑 Using direct access token');
      connectionSettings = {
        auth: new google.auth.OAuth2(
          process.env.GOOGLE_DRIVE_CLIENT_ID,
          process.env.GOOGLE_DRIVE_CLIENT_SECRET
        ),
        accessToken: process.env.GOOGLE_DRIVE_ACCESS_TOKEN,
      };
      
      // Cache the direct token
      const expiresAt = new Date(Date.now() + 55 * 60 * 1000); // 55 minutes
      await storage.saveTokenCache('google_drive', process.env.GOOGLE_DRIVE_ACCESS_TOKEN, expiresAt);
      return;
    }

    // Try service account (recommended for production)
    if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
      console.log('🔐 Using service account authentication');
      const serviceAccount = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
      const auth = new google.auth.GoogleAuth({
        credentials: serviceAccount,
        scopes: ['https://www.googleapis.com/auth/drive.readonly'],
      });
      
      const authClient = await auth.getClient();
      const accessToken = await authClient.getAccessToken();
      
      if (accessToken.token) {
        connectionSettings = {
          auth: authClient,
          accessToken: accessToken.token,
        };
        
        // Cache service account token
        const expiresAt = new Date(Date.now() + 55 * 60 * 1000);
        await storage.saveTokenCache('google_drive', accessToken.token, expiresAt);
        return;
      }
    }

    throw new Error('No valid Google Drive authentication method found');
  } catch (error) {
    console.error('Google Drive initialization error:', error);
    throw error;
  }
}

async function refreshAccessToken(): Promise<boolean> {
  try {
    if (!process.env.GOOGLE_DRIVE_REFRESH_TOKEN) {
      return false;
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_DRIVE_CLIENT_ID,
      process.env.GOOGLE_DRIVE_CLIENT_SECRET
    );

    oauth2Client.setCredentials({
      refresh_token: process.env.GOOGLE_DRIVE_REFRESH_TOKEN,
    });

    const { credentials } = await oauth2Client.refreshAccessToken();
    
    if (credentials.access_token) {
      connectionSettings = {
        auth: oauth2Client,
        accessToken: credentials.access_token,
      };

      // Cache the refreshed token
      const expiresAt = new Date(Date.now() + 55 * 60 * 1000);
      await storage.saveTokenCache('google_drive', credentials.access_token, expiresAt);
      
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Token refresh error:', error);
    return false;
  }
}

export async function getAccessToken(): Promise<string> {
  if (!connectionSettings) {
    await initializeGoogleDrive();
  }

  if (!connectionSettings?.accessToken) {
    throw new Error('Google Drive not properly initialized');
  }

  return connectionSettings.accessToken;
}

export async function getDriveService() {
  if (!connectionSettings) {
    await initializeGoogleDrive();
  }

  return google.drive({ version: 'v3', auth: connectionSettings.auth });
}

// Extract folder ID from Google Drive URL
export function extractFolderIdFromUrl(url: string): string | null {
  const folderMatch = url.match(/\/folders\/([a-zA-Z0-9-_]+)/);
  return folderMatch ? folderMatch[1] : null;
}

// Get folder contents
export async function getFolderContents(folderId: string) {
  const drive = await getDriveService();
  
  const response = await drive.files.list({
    q: `'${folderId}' in parents and trashed=false`,
    fields: 'files(id,name,mimeType,size,createdTime,modifiedTime)',
    pageSize: 1000,
  });

  return response.data.files || [];
}

// Categorize file by MIME type
export function categorizeFileByMimeType(mimeType: string): 'image' | 'video' | 'other' {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  return 'other';
}

// Get file metadata
export async function getFileMetadata(fileId: string) {
  const drive = await getDriveService();
  
  const response = await drive.files.get({
    fileId,
    fields: 'id,name,mimeType,size,createdTime,modifiedTime,webViewLink,thumbnailLink',
  });

  return response.data;
}

// Get file download URL
export async function getFileDownloadUrl(fileId: string) {
  const drive = await getDriveService();
  
  const response = await drive.files.get({
    fileId,
    fields: 'webContentLink',
  });

  return response.data.webContentLink;
}

// Clear token cache (useful for debugging)
export async function clearTokenCache() {
  await storage.clearTokenCache('google_drive');
  console.log('🗑️ Google Drive token cache cleared');
}
