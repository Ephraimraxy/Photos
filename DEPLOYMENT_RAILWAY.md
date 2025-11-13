# Railway Full-Stack Deployment Guide

## 🚀 Deploy Complete App to Railway

Railway will host both your frontend (React) and backend (Node.js) in one deployment!

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
# Database (Neon - Already configured)
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

### Step 4: Railway Will Handle Everything!
- **Frontend**: Served from `/` (React app)
- **Backend**: API endpoints at `/api/*`
- **Database**: Connected to Neon
- **One URL**: Everything works together!

## 📊 Complete Architecture (Railway)

```
┌─────────────────────────────────────────────────────────────┐
│                    Railway Platform                        │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────┐ │
│  │   Frontend      │    │   Backend       │    │  Neon   │ │
│  │   React App     │◄──►│   Node.js API   │◄──►│   DB    │ │
│  │   Served at /   │    │   Served at     │    │External │ │
│  │                 │    │   /api/*        │    │         │ │
│  └─────────────────┘    └─────────────────┘    └─────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## ✅ Benefits of Railway Full-Stack

- **Single deployment**: Frontend + Backend together
- **Automatic builds**: Deploys on every git push
- **Environment variables**: Easy configuration
- **Auto-scaling**: Handles traffic spikes
- **Custom domain**: Add your own domain
- **SSL certificates**: Automatic HTTPS
- **Logs**: Real-time application logs

## 🔧 How It Works

### Build Process
1. Railway detects Node.js project
2. Runs `npm install` to install dependencies
3. Runs `npm run build` to build both frontend and backend
4. Starts server with `npm start`

### Runtime
1. Express server serves static React files at `/`
2. API routes handle requests to `/api/*`
3. Database connections use environment variables
4. Everything runs on one Railway service

## 🛠️ Troubleshooting

### Build Issues
- Check Railway build logs
- Verify all dependencies are in package.json
- Ensure build scripts are correct

### Runtime Issues
- Check Railway application logs
- Verify environment variables are set
- Test API endpoints directly

### Database Issues
- Check Neon connection string
- Verify database is accessible
- Check Railway environment variables

## 🚀 After Deployment

Your app will be available at:
`https://photos-production-xxxx.up.railway.app`

- **Frontend**: `https://your-app.up.railway.app/`
- **API**: `https://your-app.up.railway.app/api/`
- **Admin**: `https://your-app.up.railway.app/admin`

## 📝 Next Steps

1. **Deploy to Railway** (follow steps above)
2. **Test your app** (frontend + backend working together)
3. **Add custom domain** (optional)
4. **Set up monitoring** (optional)
5. **Configure webhooks** (for Paystack)

## 🎉 You're Done!

Railway handles everything - no need for separate frontend/backend deployments!
