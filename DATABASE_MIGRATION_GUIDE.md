# Database Migration Guide - Add Supabase Columns

## Problem
You're seeing these errors:
- `api/content: 500` - Server error when fetching content
- `api/content/upload: 400` - Bad request when uploading

This is because the database schema hasn't been updated with the new Supabase columns.

## Solution: Run Database Migration

### Option 1: Using Neon Console (Easiest)

1. **Go to Neon Console**: https://console.neon.tech/
2. **Select your project** (the one with `neondb`)
3. **Click on "SQL Editor"** in the left sidebar
4. **Click "New query"**
5. **Copy and paste this SQL**:

```sql
-- Add Supabase columns
ALTER TABLE content 
ADD COLUMN IF NOT EXISTS supabase_path TEXT,
ADD COLUMN IF NOT EXISTS supabase_url TEXT;

-- Make Google Drive columns optional (if needed)
ALTER TABLE content 
ALTER COLUMN google_drive_id DROP NOT NULL,
ALTER COLUMN google_drive_url DROP NOT NULL;
```

6. **Click "Run"** to execute
7. **Verify**: You should see "Success" message

### Option 2: Using Drizzle CLI (Recommended)

If you have the project set up locally:

```bash
npm run db:push
```

This will automatically sync your schema with the database.

### Option 3: Using psql (Command Line)

If you have `psql` installed:

```bash
psql "postgresql://neondb_owner:npg_NxEdBDm6Ajg0@ep-damp-lab-advdixzi-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require"
```

Then run:
```sql
ALTER TABLE content 
ADD COLUMN IF NOT EXISTS supabase_path TEXT,
ADD COLUMN IF NOT EXISTS supabase_url TEXT;

ALTER TABLE content 
ALTER COLUMN google_drive_id DROP NOT NULL,
ALTER COLUMN google_drive_url DROP NOT NULL;
```

## Verify Migration

After running the migration, verify it worked:

```sql
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'content' 
ORDER BY ordinal_position;
```

You should see:
- `supabase_path` (text, nullable)
- `supabase_url` (text, nullable)
- `google_drive_id` (text, nullable)
- `google_drive_url` (text, nullable)

## After Migration

1. ✅ The `/api/content` endpoint should work (no more 500 errors)
2. ✅ You can now set Supabase credentials for uploads
3. ✅ Uploads will work once Supabase is configured

## Troubleshooting

### Error: "column already exists"
- This means the migration already ran
- You can ignore this error
- Check if columns exist using the verify query above

### Error: "cannot alter column because it is NOT NULL"
- You have existing data in the table
- You need to update existing rows first:

```sql
-- Update existing rows to have values (if needed)
UPDATE content 
SET google_drive_id = COALESCE(google_drive_id, ''),
    google_drive_url = COALESCE(google_drive_url, '')
WHERE google_drive_id IS NULL OR google_drive_url IS NULL;

-- Then make them nullable
ALTER TABLE content 
ALTER COLUMN google_drive_id DROP NOT NULL,
ALTER COLUMN google_drive_url DROP NOT NULL;
```

### Still getting 500 errors?
- Check server logs for the actual error message
- Verify DATABASE_URL is correct
- Make sure you're connected to the right database

