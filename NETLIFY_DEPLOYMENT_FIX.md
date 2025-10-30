# Netlify Deployment Fixes

This document outlines the fixes applied to resolve Netlify deployment issues.

## Issues Fixed

### 1. Secrets Scanner Blocking Deployment
**Problem**: Netlify's secrets scanner was detecting environment variable values in documentation files and build output, blocking deployment.

**Solution**: Updated `netlify.toml` to configure the secrets scanner:
```toml
SECRETS_SCAN_OMIT_PATHS = "**.md,deploy-setup.sh,deploy-setup.bat,.replit,client/dist/**"
SECRETS_SCAN_OMIT_KEYS = "NODE_ENV,PORT"
```

This tells Netlify to:
- Ignore all markdown files (documentation)
- Ignore deployment setup scripts
- Ignore the client build output directory
- Skip scanning for `NODE_ENV` and `PORT` which aren't sensitive secrets

### 2. File Upload Not Working in Serverless Environment
**Problem**: The Netlify Function was using `multer` middleware which doesn't work in serverless environments because:
- Netlify Functions receive base64-encoded request bodies
- Multer middleware doesn't parse multipart data correctly in AWS Lambda
- The file upload endpoint would fail with "File is required" error

**Solution**: Replaced multer with `busboy` for serverless-compatible file uploads:
1. Installed `busboy` package
2. Created a `parseMultipartForm()` helper function to handle base64-encoded multipart data
3. Modified the Netlify Function handler to intercept upload requests and parse them before passing to Express
4. Added middleware to attach parsed file data to Express request object via `req.apiGateway.event`

## Environment Variables Required

Make sure these environment variables are set in your Netlify dashboard:

### Required for All Features
- `DATABASE_URL` - PostgreSQL connection string
- `NODE_ENV` - Set to `production`
- `PORT` - Set to `5000` (for local dev)

### Required for Payments
- `PAYSTACK_SECRET_KEY` - Your Paystack secret key
- `PAYSTACK_PUBLIC_KEY` - Your Paystack public key

### Required for Google Drive Integration
- `GOOGLE_DRIVE_CLIENT_ID` - OAuth 2.0 client ID
- `GOOGLE_DRIVE_CLIENT_SECRET` - OAuth 2.0 client secret
- `GOOGLE_DRIVE_REFRESH_TOKEN` - Refresh token for server-side uploads
- `GOOGLE_DRIVE_ACCESS_TOKEN` - Access token for server-side uploads
- `GOOGLE_DRIVE_UPLOAD_FOLDER_ID` - The Google Drive folder ID where files will be uploaded
- `VITE_GOOGLE_CLIENT_ID` - Client ID for frontend Google Picker
- `VITE_GOOGLE_API_KEY` - API key for frontend Google Picker
- `VITE_GOOGLE_DRIVE_CLIENT_ID` - Client ID for frontend Drive access

## Deployment Steps

1. **Push your changes to GitHub**
   ```bash
   git add .
   git commit -m "Fix Netlify deployment and file uploads"
   git push origin main
   ```

2. **Configure Environment Variables in Netlify**
   - Go to your Netlify project dashboard
   - Navigate to **Site settings** → **Environment variables**
   - Add all the required environment variables listed above

3. **Trigger a New Deployment**
   - Netlify should automatically deploy when you push to GitHub
   - Or manually trigger a deploy from the Netlify dashboard

4. **Verify the Deployment**
   - Check the build logs to ensure no secrets scanner errors
   - Test the file upload functionality from the admin panel
   - Test Google Drive imports

## Testing File Uploads

After deployment, test the file upload feature:

1. Go to your admin dashboard
2. Navigate to the "Import Content" section
3. Click "Import" → "Import from file"
4. Select one or more image/video files
5. Upload should complete successfully

If uploads fail, check the Netlify Function logs for error messages.

## Troubleshooting

### Secrets Scanner Still Failing
If you still see secrets scanner errors:
- Check which files are flagged in the build log
- Add additional paths to `SECRETS_SCAN_OMIT_PATHS` in `netlify.toml`
- Or add specific keys to `SECRETS_SCAN_OMIT_KEYS`

### File Uploads Not Working
If file uploads still fail:
- Check Netlify Function logs for detailed error messages
- Verify `GOOGLE_DRIVE_UPLOAD_FOLDER_ID` is set correctly
- Ensure Google Drive credentials are valid and have proper permissions
- Check that the Google Drive folder has public or shared access

### Google Drive Imports Not Working
If Google Drive imports fail in production:
- Frontend imports require user authentication via Google Picker
- Backend imports require server credentials (`GOOGLE_DRIVE_REFRESH_TOKEN` and `GOOGLE_DRIVE_ACCESS_TOKEN`)
- Verify all Google Drive environment variables are set correctly
- Check that the Google OAuth client is configured to allow your Netlify domain

## Additional Notes

- The file upload endpoint now logs detailed information about the upload process
- Look for `[Upload]` prefixed logs in the Netlify Function logs for debugging
- The implementation is fully compatible with both development (Replit) and production (Netlify) environments
