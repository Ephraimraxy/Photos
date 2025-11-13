# Supabase Storage Policies - Visual Guide

## Current Status
You have:
- ✅ Bucket named `content` created
- ⚠️ Need to create policies for the bucket

## Step-by-Step: Creating Policies

### Policy 1: Allow Uploads (INSERT)

1. **Click "New policy"** button (under the `content` bucket section)

2. **Select Policy Type**:
   - Choose **"Create a policy from scratch"** or **"For full customization"**
   - (NOT "Enable read access for all users" - that's a template)

3. **Fill in Policy Details**:
   ```
   Policy name: Allow service role uploads
   
   Allowed operation: INSERT
   
   Policy definition (SQL): 
   true
   
   Policy check (SQL): 
   (leave empty)
   ```

4. **Save**: Click "Review" → "Save policy"

### Policy 2: Allow Public Reads (SELECT)

1. **Click "New policy"** button again

2. **Select Policy Type**:
   - Choose **"Create a policy from scratch"**

3. **Fill in Policy Details**:
   ```
   Policy name: Allow public reads
   
   Allowed operation: SELECT
   
   Policy definition (SQL): 
   true
   
   Policy check (SQL): 
   (leave empty)
   ```

4. **Save**: Click "Review" → "Save policy"

## Expected Result

After creating both policies, you should see:

```
Policies under storage.objects

Name                          Command    Applied to    Actions
─────────────────────────────────────────────────────────────
Allow service role uploads    INSERT     public        ...
Allow public reads            SELECT     public        ...
```

## Alternative: Using SQL Editor

If the UI is confusing, you can also create policies using SQL:

1. Go to **SQL Editor** in Supabase dashboard
2. Click **"New query"**
3. Paste this SQL:

```sql
-- Policy for uploads (INSERT)
CREATE POLICY "Allow service role uploads"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (bucket_id = 'content');

-- Policy for reads (SELECT)
CREATE POLICY "Allow public reads"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'content');
```

4. Click **"Run"** to execute

## Verify Bucket is Public

1. Go to **"Buckets"** tab (not Policies)
2. Find your `content` bucket
3. Make sure it shows as **"Public"**
4. If it's not public:
   - Click on the bucket
   - Toggle **"Public bucket"** to ON
   - Save

## Troubleshooting

### Can't find "New policy" button?
- Make sure you're in the **Policies** tab
- Make sure you're looking under the `content` bucket section
- Refresh the page if needed

### Policy creation fails?
- Make sure the bucket name is exactly `content` (lowercase)
- Try using the SQL Editor method instead
- Check that you have admin access to the project

### Still having issues?
- Try the SQL Editor method (shown above)
- Make sure your bucket is set to Public first
- Check Supabase documentation: https://supabase.com/docs/guides/storage

