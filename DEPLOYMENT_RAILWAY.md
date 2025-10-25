# Railway Deployment Guide

## 🚀 Deploy Backend to Railway

### Step 1: Create Railway Account
1. Go to [railway.app](https://railway.app)
2. Sign up with GitHub
3. Connect your GitHub account

### Step 2: Deploy from GitHub
1. Click "New Project"
2. Select "Deploy from GitHub repo"
3. Choose your `Ephraimraxy/Photos` repository
4. Railway will automatically detect it's a Node.js project

### Step 3: Configure Environment Variables
In Railway dashboard, add these environment variables:

```bash
# Database (Neon)
DATABASE_URL=postgresql://neondb_owner:npg_NxEdBDm6Ajg0@ep-damp-lab-advdixzi-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require

# Paystack (Get from Paystack dashboard)
PAYSTACK_PUBLIC_KEY=pk_test_your_public_key
PAYSTACK_SECRET_KEY=sk_test_your_secret_key

# Google Drive (Get from Google Cloud Console)
GOOGLE_DRIVE_CLIENT_ID=your_google_client_id
GOOGLE_DRIVE_CLIENT_SECRET=your_google_client_secret
GOOGLE_DRIVE_ACCESS_TOKEN=your_google_access_token
GOOGLE_DRIVE_REFRESH_TOKEN=your_google_refresh_token

# Production Settings
NODE_ENV=production
PORT=5000
```

### Step 4: Update Frontend API URL
After Railway deploys, you'll get a URL like:
`https://photos-production-xxxx.up.railway.app`

Update your frontend to use this URL for API calls.

## 🔗 Connect Frontend to Backend

### Update API Base URL
In your React app, update the API calls to use your Railway backend URL.

### Environment Variables for Netlify
Add to Netlify environment variables:
```bash
VITE_API_URL=https://your-railway-app.up.railway.app
```

## 📊 Complete Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Netlify       │    │   Railway       │    │   Neon DB       │
│   Frontend      │◄──►│   Backend       │◄──►│   Database      │
│   React App     │    │   Node.js API   │    │   PostgreSQL    │
│   https://...   │    │   https://...   │    │   Cloud Hosted  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## ✅ Benefits of This Setup

- **Neon**: Handles database with automatic backups
- **Railway**: Handles backend with auto-scaling
- **Netlify**: Handles frontend with CDN
- **All connected**: Full-stack application working together

## 🛠️ Troubleshooting

### Backend Issues
- Check Railway logs for errors
- Verify environment variables
- Test API endpoints directly

### Frontend Issues
- Check Netlify build logs
- Verify API URL configuration
- Test API calls from browser console

### Database Issues
- Check Neon connection string
- Verify database is accessible
- Check Railway environment variables
