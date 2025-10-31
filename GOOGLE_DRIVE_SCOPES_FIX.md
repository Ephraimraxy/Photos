# Google Drive Scopes Fix

## Problem
Your current Google Drive token only has **read-only** access (`drive.readonly` scope), but file uploads require **write** access (`https://www.googleapis.com/auth/drive` scope).

## Solution

You need to re-authorize and get a new refresh token with write permissions:

### Step 1: Generate OAuth URL
Visit this URL (replace `YOUR_CLIENT_ID` with your actual client ID):

```
https://accounts.google.com/o/oauth2/v2/auth?client_id=YOUR_CLIENT_ID&redirect_uri=urn:ietf:wg:oauth:2.0:oob&response_type=code&scope=https://www.googleapis.com/auth/drive&access_type=offline&prompt=consent
```

Or use the OAuth Playground:
1. Go to https://developers.google.com/oauthplayground/
2. On the left, find "Drive API v3"
3. Check these scopes:
   - `https://www.googleapis.com/auth/drive` (Full Drive access)
4. Click "Authorize APIs"
5. Click "Exchange authorization code for tokens"
6. Copy the **refresh_token** value

### Step 2: Update Your .env File
Replace `GOOGLE_DRIVE_REFRESH_TOKEN` with the new refresh token that has write permissions.

### Alternative: Use Service Account (Recommended for Production)
For production, consider using a Google Service Account which doesn't require user consent.

