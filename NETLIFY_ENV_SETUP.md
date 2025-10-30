# Netlify Environment Variables Setup Guide

## Step-by-Step Instructions

### 1. Access Your Netlify Dashboard
1. Go to https://app.netlify.com
2. Sign in to your account
3. Select your site (Photos project)

### 2. Navigate to Environment Variables
1. Click on **Site settings**
2. Scroll down to find **Environment variables** in the left sidebar
3. Click on **Environment variables**

### 3. Add Each Variable
Click **Add a variable** and add each variable with its value:

#### Required Variables:

**DATABASE_URL**
```
postgresql://username:password@hostname:port/database?sslmode=require&channel_binding=require
```
⚠️ **Get your value from your local .env file**

**PAYSTACK_PUBLIC_KEY**
```
pk_live_YOUR_PAYSTACK_PUBLIC_KEY
```
⚠️ **Get your value from your local .env file**

**PAYSTACK_SECRET_KEY**
```
sk_live_YOUR_PAYSTACK_SECRET_KEY
```
⚠️ **Get your value from your local .env file**

**GOOGLE_DRIVE_CLIENT_ID**
```
YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com
```
⚠️ **Get your value from your local .env file**

**GOOGLE_DRIVE_CLIENT_SECRET**
```
YOUR_GOOGLE_CLIENT_SECRET
```
⚠️ **Get your value from your local .env file**

**GOOGLE_DRIVE_ACCESS_TOKEN**
```
YOUR_GOOGLE_ACCESS_TOKEN
```
⚠️ **Get your value from your local .env file**

**GOOGLE_DRIVE_REFRESH_TOKEN**
```
YOUR_GOOGLE_REFRESH_TOKEN
```
⚠️ **Get your value from your local .env file**

**NODE_VERSION**
```
20
```

**PORT**
```
5000
```

### 4. Set Variable Scopes (Optional)
For each variable, you can set which contexts it should be available in:

- **All contexts** (recommended) - Available in build and runtime
- **Builds only** - Only available during build (use for NODE_VERSION)
- **Runtime only** - Only available at runtime (use for tokens)

For **NODE_VERSION**, set scope to **Builds only** since it's only needed during the build process.

### 5. Save and Redeploy
1. Click **Save** after adding all variables
2. Go back to **Deploys** tab
3. Click **Trigger deploy** → **Clear cache and deploy site**

## Important Security Notes

⚠️ **Never commit these values to Git!**
- They are already in your `.gitignore` file
- Keep them secure in Netlify's environment variables only
- Anyone with access to your GitHub repo will be able to see committed secrets

## Verifying the Setup

After setting up the environment variables and deploying:

1. Check the build logs in Netlify to ensure there are no environment variable errors
2. Test your payment functionality to ensure Paystack keys are working
3. Try importing content to verify Google Drive credentials are working
4. Check that database operations are working properly

## Troubleshooting

### Build fails with "DATABASE_URL must be set"
- Verify the variable is set in Netlify dashboard
- Make sure it's set for "All contexts" or "Builds only"
- Redeploy after adding variables

### Payment initialization fails
- Check that PAYSTACK_PUBLIC_KEY and PAYSTACK_SECRET_KEY are set
- Verify the keys are correct and from the right environment (live vs test)

### Google Drive import fails
- Verify all GOOGLE_DRIVE_* variables are set
- Check that tokens are not expired
- Regenerate tokens if needed

## Need Help?

If you encounter issues:
1. Check Netlify build logs for specific error messages
2. Verify all environment variables are set correctly
3. Make sure variable names match exactly (case-sensitive!)
4. Clear cache and redeploy

