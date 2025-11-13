# Supabase Setup - Step by Step Guide

Follow these steps carefully to set up Supabase Storage for your photo uploads.

## Step 1: Create Supabase Account & Project

1. **Go to Supabase**: Visit [https://supabase.com](https://supabase.com)
2. **Sign Up/Login**: 
   - Click "Start your project" or "Sign in"
   - Sign up with GitHub, Google, or email
3. **Create New Project**:
   - Click "New Project"
   - Fill in:
     - **Name**: `Photos Store` (or any name you prefer)
     - **Database Password**: Create a strong password (save it!)
     - **Region**: Choose closest to your users
     - **Pricing Plan**: Free tier is fine to start
   - Click "Create new project"
   - Wait 2-3 minutes for project to initialize

## Step 2: Create Storage Bucket

1. **Navigate to Storage**:
   - In your project dashboard, click **"Storage"** in the left sidebar
   - You should see an empty storage section

2. **Create New Bucket**:
   - Click **"New bucket"** button
   - Fill in:
     - **Name**: `content` (must be exactly "content" - lowercase)
     - **Public bucket**: Toggle this ON (very important!)
   - Click **"Create bucket"**

3. **Verify Bucket**:
   - You should now see a bucket named "content" in your storage list
   - Make sure it shows as "Public"

## Step 3: Set Up Storage Policies (IMPORTANT!)

1. **Open Bucket Settings**:
   - Click on the **"content"** bucket you just created
   - Click on the **"Policies"** tab at the top

2. **Create Upload Policy**:
   - Click **"New Policy"**
   - Select **"Create a policy from scratch"**
   - Fill in:
     - **Policy name**: `Allow service role uploads`
     - **Allowed operation**: Select **INSERT**
     - **Policy definition**: 
       ```sql
       true
       ```
     - **Policy check**: Leave empty
   - Click **"Review"** then **"Save policy"**

3. **Create Read Policy**:
   - Click **"New Policy"** again
   - Select **"Create a policy from scratch"**
   - Fill in:
     - **Policy name**: `Allow public reads`
     - **Allowed operation**: Select **SELECT**
     - **Policy definition**: 
       ```sql
       true
       ```
     - **Policy check**: Leave empty
   - Click **"Review"** then **"Save policy"**

4. **Verify Policies**:
   - You should now see 2 policies:
     - Allow service role uploads (INSERT)
     - Allow public reads (SELECT)

## Step 4: Get Your Supabase Credentials

1. **Go to API Settings**:
   - Click **"Settings"** (gear icon) in the left sidebar
   - Click **"API"** under Project Settings

2. **Copy Your Credentials**:
   - **Project URL**: 
     - Find "Project URL" section
     - Copy the URL (looks like: `https://xxxxxxxxxxxxx.supabase.co`)
     - This is your `SUPABASE_URL`
   
   - **Service Role Key**:
     - Scroll down to "Project API keys" section
     - Find **"service_role"** key (NOT the anon key!)
     - Click the eye icon to reveal it
     - Click "Copy" to copy the key
     - ⚠️ **WARNING**: This key has admin access - keep it secret!
     - This is your `SUPABASE_SERVICE_ROLE_KEY`

## Step 5: Add Environment Variables

1. **Create/Update .env File**:
   - In your project root folder (`Photos`), create a file named `.env`
   - If you already have a `.env` file, open it

2. **Add Supabase Variables**:
   Add these two lines to your `.env` file:
   ```bash
   SUPABASE_URL=https://your-project-id.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
   ```
   
   Replace:
   - `https://your-project-id.supabase.co` with your actual Project URL
   - `your-service-role-key-here` with your actual service_role key

3. **Example .env file** (with other variables):
   ```bash
   # Database Configuration
   DATABASE_URL=postgresql://username:password@hostname:port/database
   
   # Supabase Storage Configuration
   SUPABASE_URL=https://abcdefghijklmnop.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoic2VydmljZV9yb2xlIiwiaWF0IjoxNjE2MjM5MDIyfQ.example_key_here
   
   # Paystack Configuration (if you have it)
   PAYSTACK_PUBLIC_KEY=your_paystack_public_key
   PAYSTACK_SECRET_KEY=your_paystack_secret_key
   
   # Google Drive Configuration (if you have it)
   GOOGLE_DRIVE_CLIENT_ID=your_google_drive_client_id
   GOOGLE_DRIVE_CLIENT_SECRET=your_google_drive_client_secret
   ```

## Step 6: Update Database Schema

Run this command to add the new Supabase columns to your database:

```bash
npm run db:push
```

This will:
- Add `supabase_path` column to store file paths
- Add `supabase_url` column to store public URLs
- Make `google_drive_id` and `google_drive_url` optional (for backward compatibility)

**Expected output**: You should see a success message about the schema being updated.

## Step 7: Test the Setup

1. **Start Your Server**:
   ```bash
   npm run dev
   ```

2. **Test Upload**:
   - Open your browser and go to the admin section
   - Click the **"Upload Files"** button
   - Select an image or video file
   - Enter a title
   - Click **"Upload"**

3. **Verify in Supabase**:
   - Go back to Supabase dashboard
   - Navigate to **Storage** → **content** bucket
   - You should see your uploaded file there!

## Troubleshooting

### ❌ "Failed to upload file to Supabase"
- ✅ Check that `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are correct in `.env`
- ✅ Verify the bucket name is exactly `content` (lowercase)
- ✅ Make sure the bucket is set to **Public**
- ✅ Check that storage policies are created (INSERT and SELECT)

### ❌ "Bucket not found"
- ✅ Make sure the bucket name is exactly `content` (case-sensitive)
- ✅ Verify the bucket exists in your Supabase dashboard

### ❌ "Permission denied"
- ✅ Check that you're using the **service_role** key, not the anon key
- ✅ Verify storage policies are set up correctly
- ✅ Make sure the bucket is public

### ❌ Database migration fails
- ✅ Check that `DATABASE_URL` is set correctly
- ✅ Verify database connection is working
- ✅ Make sure you have write permissions

## Storage Limits

- **Free Tier**: 1 GB storage (good for testing)
- **Pro Tier**: 100 GB storage ($25/month) - recommended for 1000 images
- **Team Tier**: 200 GB storage ($599/month)

For 1000 images (assuming 2-5 MB each), you'll need about 2-5 GB, so the Pro tier is recommended.

## Security Notes

⚠️ **IMPORTANT**:
- Never commit your `.env` file to Git
- Never share your `SUPABASE_SERVICE_ROLE_KEY` publicly
- The service_role key bypasses all security - keep it secret!
- Only use it in server-side code (which we've already done)

## Next Steps

Once everything is working:
1. ✅ Test uploading multiple files
2. ✅ Verify previews work correctly
3. ✅ Test downloads work
4. ✅ Monitor storage usage in Supabase dashboard
5. ✅ Set up automatic backups if needed

## Need Help?

If you encounter any issues:
1. Check the browser console for errors
2. Check the server logs for detailed error messages
3. Verify all environment variables are set correctly
4. Make sure the Supabase bucket and policies are configured properly

