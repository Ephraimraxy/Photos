# Production Deployment Guide

## 🚀 Complete Production Setup

Your Photos digital content store is now ready for production deployment. Follow this guide to go live.

## 📋 What You Need to Do

### 1. **Google Drive OAuth Setup** (Required for content import)

**Step 1: Create Google Cloud Project**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google Drive API

**Step 2: Create OAuth Credentials**
1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth 2.0 Client ID"
3. Application type: "Web application"
4. Authorized redirect URIs: `https://yourdomain.com/auth/google/callback`
5. Copy Client ID and Client Secret

**Step 3: Get Access Token**
1. Go to [Google OAuth Playground](https://developers.google.com/oauthplayground/)
2. Select Google Drive API v3
3. Authorize and get access token
4. Add to your `.env` file

### 2. **Paystack Production Setup** (Required for payments)

**Step 1: Get Live Keys**
1. Go to [Paystack Dashboard](https://dashboard.paystack.com/)
2. Switch to Live Mode (not test mode)
3. Go to Settings > API Keys & Webhooks
4. Copy your Live Secret Key and Live Public Key

**Step 2: Configure Webhook**
1. Webhook URL: `https://yourdomain.com/api/payment/webhook`
2. Events: `charge.success`
3. Test the webhook

### 3. **Update Environment Variables**

Replace the placeholder values in your `.env` file:

```bash
# Database (Already configured)
DATABASE_URL=postgresql://neondb_owner:npg_NxEdBDm6Ajg0@ep-damp-lab-advdixzi-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require

# Paystack Production Keys (REQUIRED)
PAYSTACK_SECRET_KEY=sk_live_your_actual_live_secret_key
PAYSTACK_PUBLIC_KEY=pk_live_your_actual_live_public_key

# Google Drive OAuth (REQUIRED)
GOOGLE_DRIVE_CLIENT_ID=your_actual_google_client_id
GOOGLE_DRIVE_CLIENT_SECRET=your_actual_google_client_secret
GOOGLE_DRIVE_ACCESS_TOKEN=your_actual_google_access_token

# Production Settings
NODE_ENV=production
PORT=5000
```

### 4. **Domain and SSL Setup**

**Required for production:**
1. Purchase domain (e.g., yourdomain.com)
2. Set up SSL certificate (Let's Encrypt recommended)
3. Configure DNS to point to your server
4. Update webhook URLs in Paystack dashboard

### 5. **Server Deployment**

**Deploy to production server:**
1. Set up server (VPS, AWS, DigitalOcean, etc.)
2. Install Node.js (version 18+)
3. Clone your repository
4. Install dependencies: `npm install`
5. Set up environment variables
6. Build the application: `npm run build`
7. Start the server: `npm start`

## 🔐 Security Features Already Implemented

Your application includes enterprise-grade security:

- ✅ **HMAC signature verification** for Paystack webhooks
- ✅ **Constant-time comparison** to prevent timing attacks
- ✅ **User-Agent verification** for webhook security
- ✅ **Content-Type validation** for all endpoints
- ✅ **Database connection security** with SSL
- ✅ **Watermark protection** for preview images
- ✅ **Time-limited download tokens**
- ✅ **One-time use token validation**

## 📊 Production Monitoring

### Essential Monitoring Setup

1. **Server monitoring** (CPU, memory, disk usage)
2. **Application monitoring** (error tracking, performance)
3. **Payment monitoring** (failed transactions, webhook failures)
4. **Database monitoring** (connection health, query performance)

### Recommended Tools

- **Uptime monitoring:** UptimeRobot, Pingdom
- **Error tracking:** Sentry, Bugsnag
- **Performance:** New Relic, DataDog
- **Logs:** LogRocket, Papertrail

## 🚀 Deployment Commands

### Build and Deploy

```bash
# Install dependencies
npm install

# Build the application
npm run build

# Start production server
npm start
```

### Environment Setup

```bash
# Set production environment
export NODE_ENV=production

# Set port (if different)
export PORT=5000
```

## 🎯 Go-Live Checklist

### Pre-Launch Checklist

- [ ] All environment variables configured
- [ ] Google Drive OAuth working
- [ ] Paystack webhooks tested
- [ ] SSL certificate installed
- [ ] Domain DNS configured
- [ ] Database migrations run
- [ ] Content imported and tested
- [ ] Payment flow tested
- [ ] Security scan completed
- [ ] Performance testing done

### Post-Launch Monitoring

- [ ] Monitor server performance
- [ ] Track payment success rates
- [ ] Monitor webhook delivery
- [ ] Check content delivery
- [ ] Monitor user experience
- [ ] Track error rates

## 🆘 Troubleshooting

### Common Issues

1. **Google Drive authentication fails**
   - Check OAuth credentials
   - Verify access token validity
   - Ensure API is enabled

2. **Paystack webhooks not working**
   - Verify webhook URL is HTTPS
   - Check signature verification
   - Test with Paystack's webhook testing tool

3. **Database connection issues**
   - Verify DATABASE_URL
   - Check SSL requirements
   - Test connection from server

## 📈 Performance Optimization

### Production Optimizations

1. **Enable gzip compression**
2. **Set up CDN** for static assets
3. **Configure caching headers**
4. **Optimize database queries**
5. **Set up load balancing** (if needed)

### Database Optimization

- **Connection pooling** (already configured with Neon)
- **Query optimization**
- **Index optimization**
- **Regular backups**

## 🔄 Backup Strategy

### Essential Backups

1. **Database backups** (automated with Neon)
2. **Code repository** (Git)
3. **Environment variables** (secure storage)
4. **SSL certificates** (backup keys)

## 📞 Support and Maintenance

### Regular Maintenance Tasks

- **Security updates** (monthly)
- **Dependency updates** (quarterly)
- **Performance monitoring** (ongoing)
- **Backup verification** (weekly)

### Emergency Procedures

- **Server failure** recovery
- **Database failure** recovery
- **Payment system** troubleshooting
- **Content delivery** issues

Your application is now ready for production deployment with enterprise-grade security and payment processing!
