# Supabase Storage Setup Guide

This guide will help you set up Supabase Storage for uploading images and videos to your content store.

## Prerequisites

1. A Supabase account (sign up at [supabase.com](https://supabase.com))
2. A Supabase project created

## Step 1: Create a Storage Bucket

1. Go to your Supabase project dashboard
2. Navigate to **Storage** in the left sidebar
3. Click **New bucket**
4. Name it `content` (this is the bucket name used in the code)
5. Make it **Public** (so files can be accessed via public URLs)
6. Click **Create bucket**

## Step 2: Set Up Storage Policies

1. In the Storage section, click on the `content` bucket
2. Go to **Policies** tab
3. Create a policy to allow uploads (for service role):
   - Policy name: `Allow service role uploads`
   - Allowed operation: `INSERT`
   - Policy definition: `true` (service role bypasses RLS)
   
4. Create a policy to allow public reads:
   - Policy name: `Allow public reads`
   - Allowed operation: `SELECT`
   - Policy definition: `true` (since bucket is public)

## Step 3: Get Your Supabase Credentials

1. Go to **Settings** → **API** in your Supabase dashboard
2. Copy the following:
   - **Project URL** (this is your `SUPABASE_URL`)
   - **service_role key** (this is your `SUPABASE_SERVICE_ROLE_KEY`) - **Important**: Use the service_role key, not the anon key

## Step 4: Add Environment Variables

Add these to your `.env` file:

```bash
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

**Important Security Note**: 
- Never expose the `SUPABASE_SERVICE_ROLE_KEY` in client-side code
- Only use it in server-side code (which is already done in this implementation)
- The service role key bypasses Row Level Security (RLS), so keep it secure

## Step 5: Update Database Schema

Run the database migration to add the new Supabase columns:

```bash
npm run db:push
```

This will add the following columns to the `content` table:
- `supabase_path` (text, nullable)
- `supabase_url` (text, nullable)

The existing `google_drive_id` and `google_drive_url` columns are now optional to support legacy content.

## Step 6: Test the Upload

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Navigate to the admin content section
3. Click the **Upload Files** button
4. Select one or more image/video files
5. Provide titles for each file
6. Click **Upload**

Files should now be uploaded to Supabase Storage and stored in the `content` bucket.

## Storage Capacity

Supabase offers:
- **Free tier**: 1 GB storage
- **Pro tier**: 100 GB storage (and more with higher plans)

For 1000 images, assuming an average of 2-5 MB per image, you'll need approximately 2-5 GB of storage. The Pro tier should be sufficient for your needs.

## Troubleshooting

### Upload fails with "Failed to upload file to Supabase"
- Check that your `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are correct
- Verify the bucket name is exactly `content`
- Ensure the bucket is set to public
- Check that storage policies allow uploads

### Files upload but preview doesn't work
- Verify the bucket is public
- Check that the `supabase_url` is being saved correctly in the database
- Ensure storage policies allow public reads

### Database migration fails
- Make sure your `DATABASE_URL` is set correctly
- Check that you have write permissions on the database
- Verify the database connection is working

## Next Steps

- Monitor your storage usage in the Supabase dashboard
- Set up storage lifecycle policies if needed (auto-delete old files)
- Consider implementing image optimization before upload to save storage space
- Set up CDN for faster file delivery (Supabase provides CDN URLs automatically)

