import 'dotenv/config';
import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';

let connectionSettings: any;
let tokenCache: { token: string; expiresAt: number } | null = null;

// Persistent cache file path
const CACHE_FILE = path.join(process.cwd(), '.token-cache.json');

// Load cached token on startup
function loadTokenCache() {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      const cached = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
      if (cached.expiresAt > Date.now()) {
        tokenCache = cached;
        console.log('✅ Loaded valid token from cache');
        return true;
      } else {
        console.log('⚠️ Cached token expired, will refresh');
        fs.unlinkSync(CACHE_FILE); // Remove expired cache
      }
    }
  } catch (error) {
    console.log('⚠️ Could not load token cache:', error);
  }
  return false;
}

// Save token to persistent cache
function saveTokenCache(cache: { token: string; expiresAt: number }) {
  try {
    fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
    console.log('💾 Token saved to persistent cache');
  } catch (error) {
    console.log('⚠️ Could not save token cache:', error);
  }
}

async function getAccessToken() {
  // Load token from persistent cache on first call
  if (!tokenCache) {
    loadTokenCache();
  }

  // Check if we have a valid cached token
  if (tokenCache && tokenCache.expiresAt > Date.now()) {
    console.log('✅ Using cached Google Drive token');
    return tokenCache.token;
  }

  // Production: Use refresh token to get new access token (preferred method)
  if (process.env.GOOGLE_DRIVE_REFRESH_TOKEN && process.env.GOOGLE_DRIVE_CLIENT_ID && process.env.GOOGLE_DRIVE_CLIENT_SECRET) {
    try {
      const { google } = await import('googleapis');
      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_DRIVE_CLIENT_ID,
        process.env.GOOGLE_DRIVE_CLIENT_SECRET,
        'https://developers.google.com/oauthplayground'
      );
      
      oauth2Client.setCredentials({
        refresh_token: process.env.GOOGLE_DRIVE_REFRESH_TOKEN
      });
      
      const { token } = await oauth2Client.getAccessToken();
      
      // Cache the token for 55 minutes (tokens expire in 1 hour)
      tokenCache = {
        token: token!,
        expiresAt: Date.now() + (55 * 60 * 1000) // 55 minutes
      };
      
      // Save to persistent cache
      saveTokenCache(tokenCache);
      
      console.log('✅ Google Drive token refreshed and cached successfully');
      return token;
    } catch (error) {
      console.error('❌ Failed to refresh Google Drive token:', error);
      // Fall back to direct access token if refresh fails
      if (process.env.GOOGLE_DRIVE_ACCESS_TOKEN) {
        console.log('⚠️ Using fallback access token');
        return process.env.GOOGLE_DRIVE_ACCESS_TOKEN;
      }
      throw new Error('Failed to refresh Google Drive access token');
    }
  }

  // Fallback: Use direct access token
  if (process.env.GOOGLE_DRIVE_ACCESS_TOKEN) {
    console.log('⚠️ Using direct access token (may expire)');
    return process.env.GOOGLE_DRIVE_ACCESS_TOKEN;
  }

  // Production: Use Service Account (recommended for production)
  if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
    try {
      const serviceAccountKey = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
      const auth = new google.auth.GoogleAuth({
        credentials: serviceAccountKey,
        scopes: ['https://www.googleapis.com/auth/drive.readonly']
      });
      const authClient = await auth.getClient();
      const accessToken = await authClient.getAccessToken();
      return accessToken.token;
    } catch (error) {
      throw new Error('Invalid Google Service Account key. Please check your GOOGLE_SERVICE_ACCOUNT_KEY environment variable.');
    }
  }

  // Production: Use OAuth credentials to get access token
  if (process.env.GOOGLE_DRIVE_CLIENT_ID && process.env.GOOGLE_DRIVE_CLIENT_SECRET) {
    throw new Error('Google Drive OAuth credentials found but access token required. Please obtain an access token using OAuth flow and set GOOGLE_DRIVE_ACCESS_TOKEN');
  }

  // Replit connector fallback (for Replit deployments)
  if (connectionSettings && connectionSettings.settings.expires_at && new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
    return connectionSettings.settings.access_token;
  }
  
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('Google Drive authentication required. Please set up Google Drive Service Account or OAuth and provide GOOGLE_SERVICE_ACCOUNT_KEY or GOOGLE_DRIVE_ACCESS_TOKEN in your environment variables.');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=google-drive',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  if (!connectionSettings || !connectionSettings.settings) {
    throw new Error('Google Drive not connected');
  }

  const accessToken = connectionSettings.settings.access_token || connectionSettings.settings.oauth?.credentials?.access_token;

  if (!accessToken) {
    throw new Error('Google Drive not connected');
  }
  return accessToken;
}

export async function getUncachableGoogleDriveClient() {
  const accessToken = await getAccessToken();

  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({
    access_token: accessToken
  });

  return google.drive({ version: 'v3', auth: oauth2Client });
}

export function extractFileIdFromUrl(url: string): string | null {
  const patterns = [
    /\/d\/([a-zA-Z0-9_-]+)/,
    /id=([a-zA-Z0-9_-]+)/,
    /\/file\/d\/([a-zA-Z0-9_-]+)/
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

export function extractFolderIdFromUrl(url: string): string | null {
  const patterns = [
    /\/folders\/([a-zA-Z0-9_-]+)/,
    /id=([a-zA-Z0-9_-]+)/
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

export async function getFolderContents(folderId: string, mediaType: 'image' | 'video' | 'all' = 'all') {
  const drive = await getUncachableGoogleDriveClient();
  
  // Build query based on media type
  let query = `'${folderId}' in parents and trashed=false`;
  
  if (mediaType === 'image') {
    query += " and mimeType contains 'image/'";
  } else if (mediaType === 'video') {
    query += " and mimeType contains 'video/'";
  } else if (mediaType === 'all') {
    query += " and (mimeType contains 'image/' or mimeType contains 'video/')";
  }

  const response = await drive.files.list({
    q: query,
    fields: 'files(id,name,mimeType,size,webContentLink,webViewLink,thumbnailLink,videoMediaMetadata)',
    orderBy: 'name'
  });

  return response.data.files || [];
}

export function categorizeFileByMimeType(mimeType: string): 'image' | 'video' | null {
  if (mimeType.startsWith('image/')) {
    return 'image';
  } else if (mimeType.startsWith('video/')) {
    return 'video';
  }
  return null;
}
