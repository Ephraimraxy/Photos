# Production Setup Guide

## 🚀 Complete Production Configuration

This guide will help you set up your Photos digital content store for production use.

## 📋 Prerequisites

1. **Domain name** (e.g., yourdomain.com)
2. **SSL certificate** (HTTPS required for payments)
3. **Google Cloud Console account**
4. **Paystack account** (for payments)
5. **Neon database** (already configured)

## 🔐 Required Environment Variables

Create a `.env` file with these production variables:

```bash
# Database (Already configured)
DATABASE_URL=postgresql://neondb_owner:npg_NxEdBDm6Ajg0@ep-damp-lab-advdixzi-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require

# Paystack Production Keys
PAYSTACK_SECRET_KEY=sk_live_your_live_secret_key_here
PAYSTACK_PUBLIC_KEY=pk_live_your_live_public_key_here

# Google Drive OAuth (Required for content import)
GOOGLE_DRIVE_CLIENT_ID=your_google_oauth_client_id
GOOGLE_DRIVE_CLIENT_SECRET=your_google_oauth_client_secret
GOOGLE_DRIVE_ACCESS_TOKEN=your_google_access_token

# Production Settings
NODE_ENV=production
PORT=5000
```

## 🔧 Step-by-Step Production Setup

### 1. Google Drive OAuth Setup

**Required for content import functionality:**

1. **Go to [Google Cloud Console](https://console.cloud.google.com/)**
2. **Create a new project** or select existing
3. **Enable Google Drive API:**
   - Go to "APIs & Services" > "Library"
   - Search for "Google Drive API"
   - Click "Enable"

4. **Create OAuth 2.0 credentials:**
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth 2.0 Client ID"
   - Application type: "Web application"
   - Authorized redirect URIs: `https://yourdomain.com/auth/google/callback`
   - Copy Client ID and Client Secret

5. **Get Access Token:**
   - Use Google OAuth Playground: https://developers.google.com/oauthplayground/
   - Select Google Drive API v3
   - Authorize and get access token
   - Add to your `.env` file

### 2. Paystack Production Setup

**Required for payment processing:**

1. **Go to [Paystack Dashboard](https://dashboard.paystack.com/)**
2. **Switch to Live Mode** (not test mode)
3. **Get your live keys:**
   - Go to Settings > API Keys & Webhooks
   - Copy your Live Secret Key and Live Public Key
   - Add to your `.env` file

4. **Configure Webhook:**
   - Webhook URL: `https://yourdomain.com/api/payment/webhook`
   - Events: `charge.success`
   - Test the webhook to ensure it's working

### 3. Domain and SSL Setup

**Required for production:**

1. **Purchase domain** (e.g., yourdomain.com)
2. **Set up SSL certificate** (Let's Encrypt recommended)
3. **Configure DNS** to point to your server
4. **Update webhook URLs** in Paystack dashboard

### 4. Server Deployment

**Deploy to production server:**

1. **Set up server** (VPS, AWS, DigitalOcean, etc.)
2. **Install Node.js** (version 18+)
3. **Clone your repository**
4. **Install dependencies:** `npm install`
5. **Set up environment variables**
6. **Build the application:** `npm run build`
7. **Start the server:** `npm start`

## 🛡️ Security Checklist

### ✅ Production Security Requirements

- [ ] **HTTPS enabled** (SSL certificate installed)
- [ ] **Environment variables secured** (never commit to git)
- [ ] **Database credentials protected**
- [ ] **Paystack webhook signature verification** (already implemented)
- [ ] **Google Drive OAuth properly configured**
- [ ] **Server firewall configured**
- [ ] **Regular security updates**

### 🔒 Security Features Already Implemented

- ✅ **HMAC signature verification** for Paystack webhooks
- ✅ **Constant-time comparison** to prevent timing attacks
- ✅ **User-Agent verification** for webhook security
- ✅ **Content-Type validation** for all endpoints
- ✅ **Database connection security** with SSL
- ✅ **Watermark protection** for preview images

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

Your application is now ready for production deployment with enterprise-grade security and payment processing!
