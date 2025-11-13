# Netlify Environment Variables Setup for Supabase

## Quick Setup Guide

### Step 1: Get Your Supabase Credentials

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Go to **Settings** → **API**
4. Copy these two values:
   - **Project URL** (looks like: `https://xxxxxxxxxxxxx.supabase.co`)
   - **service_role key** (long string starting with `eyJ...`)

### Step 2: Add to Netlify

1. Go to **Netlify Dashboard**: https://app.netlify.com
2. Select your site: `sprightly-choux-060d8c` (or your site name)
3. Go to **Site settings** → **Environment variables**
4. Click **"Add a variable"** and add:

#### Variable 1: SUPABASE_URL
- **Key**: `SUPABASE_URL`
- **Value**: Your Supabase Project URL (e.g., `https://xxxxxxxxxxxxx.supabase.co`)
- **Scopes**: Select **"All scopes"** (or at least "Production" and "Deploy previews")

#### Variable 2: SUPABASE_SERVICE_ROLE_KEY
- **Key**: `SUPABASE_SERVICE_ROLE_KEY`
- **Value**: Your service_role key from Supabase
- **Scopes**: Select **"All scopes"** (or at least "Production" and "Deploy previews")

### Step 3: Verify Other Required Variables

Make sure you also have these set (if you were using them before):

- `DATABASE_URL` - Your Neon database URL
- `PAYSTACK_PUBLIC_KEY` - (if using payments)
- `PAYSTACK_SECRET_KEY` - (if using payments)

### Step 4: Redeploy

After adding the environment variables:

1. Go to **Deploys** tab in Netlify
2. Click **"Trigger deploy"** → **"Clear cache and deploy site"**
3. Wait for deployment to complete

### Step 5: Test

After deployment:
1. Go to your site's admin section
2. Try uploading a file
3. Check browser console - errors should be gone!

## Troubleshooting

### Still getting 400/500 errors?

1. **Check environment variables are set**:
   - Go to Netlify → Site settings → Environment variables
   - Verify both `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` exist
   - Make sure they're set for the right scopes (Production, Deploy previews, etc.)

2. **Check Supabase bucket exists**:
   - Go to Supabase → Storage
   - Verify you have a bucket named `content` (exactly, lowercase)
   - Make sure it's set to **Public**

3. **Check Supabase policies**:
   - Go to Supabase → Storage → `content` bucket → Policies
   - You should have:
     - Policy for INSERT (uploads)
     - Policy for SELECT (reads)

4. **Check server logs**:
   - Go to Netlify → Functions → View logs
   - Look for error messages that might give more details

### Common Errors

**Error: "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set"**
- ✅ Environment variables not set in Netlify
- ✅ Solution: Add them as shown above

**Error: "Failed to upload file to Supabase: Bucket not found"**
- ✅ Bucket named `content` doesn't exist
- ✅ Solution: Create bucket in Supabase Storage

**Error: "Failed to upload file to Supabase: new row violates row-level security policy"**
- ✅ Storage policies not set up
- ✅ Solution: Create INSERT and SELECT policies for the bucket

## Your Current Setup

Based on your errors, you need to:

1. ✅ **Database migration** - DONE (you ran the SQL successfully)
2. ⚠️ **Add Supabase credentials to Netlify** - DO THIS NOW
3. ⚠️ **Redeploy** - After adding credentials

Once you add the Supabase credentials and redeploy, the errors should be resolved!

