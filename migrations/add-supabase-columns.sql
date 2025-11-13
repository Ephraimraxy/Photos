-- Migration: Add Supabase Storage columns to content table
-- Run this SQL in your Neon database to add the new columns

-- Add Supabase columns (nullable for backward compatibility)
ALTER TABLE content 
ADD COLUMN IF NOT EXISTS supabase_path TEXT,
ADD COLUMN IF NOT EXISTS supabase_url TEXT;

-- Make Google Drive columns optional (if they're currently NOT NULL)
-- Note: This might fail if you have existing data and columns are NOT NULL
-- If it fails, you'll need to handle existing data first

-- Check current column constraints first
-- If google_drive_id and google_drive_url are NOT NULL, you may need to:
-- 1. Set default values for existing rows, OR
-- 2. Make them nullable first

-- Try to make them nullable (will fail if they're NOT NULL and have no default)
DO $$ 
BEGIN
    -- Only alter if column exists and is NOT NULL
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'content' 
        AND column_name = 'google_drive_id' 
        AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE content ALTER COLUMN google_drive_id DROP NOT NULL;
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'content' 
        AND column_name = 'google_drive_url' 
        AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE content ALTER COLUMN google_drive_url DROP NOT NULL;
    END IF;
END $$;

-- Verify the changes
SELECT 
    column_name, 
    data_type, 
    is_nullable 
FROM information_schema.columns 
WHERE table_name = 'content' 
ORDER BY ordinal_position;

