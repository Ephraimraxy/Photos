# Production Setup Guide

## Environment Variables Setup

Create a `.env` file in your project root with the following variables:

```bash
# Database Configuration
DATABASE_URL=postgresql://username:password@host:port/database?sslmode=require

# Paystack Configuration (Production Keys)
PAYSTACK_PUBLIC_KEY=pk_live_your_public_key_here
PAYSTACK_SECRET_KEY=sk_live_your_secret_key_here

# Google Drive Configuration
GOOGLE_DRIVE_CLIENT_ID=your_google_client_id
GOOGLE_DRIVE_CLIENT_SECRET=your_google_client_secret
GOOGLE_DRIVE_ACCESS_TOKEN=your_access_token
GOOGLE_DRIVE_REFRESH_TOKEN=your_refresh_token

# Application Settings
NODE_ENV=production
PORT=5000
```

## Automatic Caching Configuration

The application already has built-in caching mechanisms:

### 1. Google Drive Token Caching
- **Automatic token refresh**: The app automatically refreshes Google Drive tokens when they expire
- **Persistent cache**: Tokens are saved to `.token-cache.json` file
- **55-minute cache duration**: Tokens are cached for 55 minutes (tokens expire in 1 hour)

### 2. Database Connection Caching
- **Connection pooling**: Uses Neon's connection pooling for optimal performance
- **Automatic reconnection**: Handles connection drops gracefully

### 3. Content Preview Caching
- **304 Not Modified**: Returns cached responses when content hasn't changed
- **Watermark caching**: Applied watermarks are cached for performance

## Deployment Options

### Option 1: Railway Deployment
1. Connect your GitHub repository to Railway
2. Set environment variables in Railway dashboard
3. Railway will automatically build and deploy

### Option 2: Vercel Deployment
1. Install Vercel CLI: `npm i -g vercel`
2. Run `vercel` in your project directory
3. Set environment variables in Vercel dashboard

### Option 3: Heroku Deployment
1. Install Heroku CLI
2. Create Heroku app: `heroku create your-app-name`
3. Set environment variables: `heroku config:set DATABASE_URL=...`
4. Deploy: `git push heroku main`

### Option 4: DigitalOcean App Platform
1. Connect GitHub repository
2. Set environment variables in dashboard
3. Deploy automatically

## Environment Variables for Hosting

When deploying to any hosting platform, make sure to set these environment variables:

```bash
DATABASE_URL=your_database_url
PAYSTACK_PUBLIC_KEY=your_paystack_public_key
PAYSTACK_SECRET_KEY=your_paystack_secret_key
GOOGLE_DRIVE_CLIENT_ID=your_google_client_id
GOOGLE_DRIVE_CLIENT_SECRET=your_google_client_secret
GOOGLE_DRIVE_ACCESS_TOKEN=your_access_token
GOOGLE_DRIVE_REFRESH_TOKEN=your_refresh_token
NODE_ENV=production
PORT=5000
```

## Caching Benefits

✅ **Automatic token management** - No manual intervention needed  
✅ **Improved performance** - Reduced API calls to Google Drive  
✅ **Better user experience** - Faster content loading  
✅ **Cost optimization** - Fewer API requests = lower costs  
✅ **Reliability** - Automatic fallback mechanisms  

## Monitoring

The application logs show caching status:
- `✅ Using cached Google Drive token` - Using cached token
- `💾 Token saved to persistent cache` - Token cached successfully
- `✅ Google Drive token refreshed and cached successfully` - Token refreshed

## Troubleshooting

If caching issues occur:
1. Check environment variables are set correctly
2. Verify Google Drive credentials are valid
3. Check database connection
4. Review server logs for error messages

The application will automatically handle token refresh and caching without any manual intervention.