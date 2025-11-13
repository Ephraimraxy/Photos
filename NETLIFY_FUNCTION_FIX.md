# Netlify Function "Invalid AWS Lambda parameters" Error - Fix Guide

## Problem
The Netlify function deployment is failing with:
```
Failed to create function: invalid parameter for function creation: Invalid AWS Lambda parameters used in this request.
```

## Root Cause
This error typically occurs when:
1. **Function bundle is too large** (most likely)
2. **Invalid function configuration** (timeout/memory values)
3. **Dependency issues** (large packages like @supabase/supabase-js)

## Solutions

### Solution 1: Check Function Bundle Size
The function might be exceeding Netlify's size limits. Check the bundled function size:
- Netlify Functions have a **50MB limit** for the zipped bundle
- The function includes many dependencies (express, googleapis, drizzle, postgres, sharp, busboy, @supabase/supabase-js)

### Solution 2: Use Netlify Edge Functions (Recommended)
Consider splitting the function or using Netlify Edge Functions for lighter operations.

### Solution 3: Optimize Dependencies
1. Remove unused dependencies
2. Use lighter alternatives
3. Lazy load heavy dependencies (already done for Supabase)

### Solution 4: Split the Function
Split the large `api.js` function into smaller functions:
- `api-content.js` - Content management
- `api-payment.js` - Payment processing
- `api-upload.js` - File uploads

### Solution 5: Check Netlify Account Tier
Free tier has stricter limits. If you're on free tier:
- Function timeout: Max 10 seconds
- Function memory: Max 1024 MB
- Bundle size: 50 MB limit

## Immediate Workaround

If the function is too large, you can:

1. **Remove Supabase temporarily** to test if that's the issue
2. **Use external API** for uploads instead of bundling Supabase
3. **Contact Netlify Support** to check your account limits

## Next Steps

1. Check Netlify dashboard → Functions → View function size
2. Try deploying without Supabase to isolate the issue
3. Consider using Supabase's REST API directly instead of the SDK
4. Split the function into smaller pieces

## Alternative: Use Supabase REST API

Instead of bundling `@supabase/supabase-js`, you could use Supabase's REST API directly with `fetch`:

```javascript
// Instead of: const { createClient } = require('@supabase/supabase-js');
// Use: Direct REST API calls

async function uploadFileToSupabase(fileBuffer, fileName, mimeType) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucketName = 'content';
  
  // Generate unique file name
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 15);
  const fileExtension = fileName.split('.').pop() || '';
  const uniqueFileName = `${timestamp}-${randomString}.${fileExtension}`;
  
  // Upload using REST API
  const response = await fetch(`${supabaseUrl}/storage/v1/object/${bucketName}/${uniqueFileName}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${supabaseKey}`,
      'Content-Type': mimeType,
      'x-upsert': 'false'
    },
    body: fileBuffer
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to upload: ${error.message}`);
  }
  
  // Get public URL
  const publicUrl = `${supabaseUrl}/storage/v1/object/public/${bucketName}/${uniqueFileName}`;
  
  return {
    path: uniqueFileName,
    url: publicUrl
  };
}
```

This avoids bundling the entire Supabase SDK, which should significantly reduce the function size.

