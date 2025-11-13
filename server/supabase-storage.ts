import { createClient } from '@supabase/supabase-js';

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error(
    "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in environment variables"
  );
}

// Create Supabase client with service role key for admin operations
export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

const BUCKET_NAME = 'content'; // Storage bucket name

/**
 * Upload a file to Supabase Storage
 * @param fileBuffer - The file buffer to upload
 * @param fileName - The name of the file
 * @param mimeType - The MIME type of the file
 * @returns The public URL of the uploaded file
 */
export async function uploadFileToSupabase(
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string
): Promise<{ path: string; url: string }> {
  // Generate unique file name to avoid conflicts
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 15);
  const fileExtension = fileName.split('.').pop() || '';
  const uniqueFileName = `${timestamp}-${randomString}.${fileExtension}`;
  const filePath = `${uniqueFileName}`;

  // Upload file to Supabase Storage
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(filePath, fileBuffer, {
      contentType: mimeType,
      upsert: false, // Don't overwrite existing files
    });

  if (error) {
    throw new Error(`Failed to upload file to Supabase: ${error.message}`);
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(filePath);

  return {
    path: filePath,
    url: urlData.publicUrl,
  };
}

/**
 * Delete a file from Supabase Storage
 * @param filePath - The path of the file to delete
 */
export async function deleteFileFromSupabase(filePath: string): Promise<void> {
  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .remove([filePath]);

  if (error) {
    console.error(`Failed to delete file from Supabase: ${error.message}`);
    // Don't throw - allow deletion to continue even if file deletion fails
  }
}

/**
 * Get file buffer from Supabase Storage
 * @param filePath - The path of the file to download
 * @returns The file buffer
 */
export async function getFileFromSupabase(filePath: string): Promise<Buffer> {
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .download(filePath);

  if (error) {
    throw new Error(`Failed to download file from Supabase: ${error.message}`);
  }

  // Convert Blob to Buffer
  const arrayBuffer = await data.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Get public URL for a file in Supabase Storage
 * @param filePath - The path of the file
 * @returns The public URL
 */
export function getPublicUrl(filePath: string): string {
  const { data } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(filePath);
  
  return data.publicUrl;
}

