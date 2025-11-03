import { supabase } from '@/lib/supabase';
import imageCompression from 'browser-image-compression';

export interface ClassificationResult {
  type: 'identity_document' | 'property_document' | 'certificate' | 'contract' | 'technical_document' | 'property_photo' | 'unknown';
  category: string;
  room_type: string | null;
  confidence: number;
  reasoning: string;
  alt: string;
}

export interface UploadResult {
  success: boolean;
  url?: string;          // Signed URL for original/display version
  path?: string;         // Path to original file
  aiUrl?: string;        // Signed URL for AI version (768px)
  aiPath?: string;       // Path to AI version
  thumbUrl?: string;     // Signed URL for thumbnail (400px)
  thumbPath?: string;    // Path to thumbnail
  error?: string;
  classification?: ClassificationResult;
  // Legacy support
  category?: string;
}

export interface UploadConfig {
  tenantId: string;
  entityType: 'properties' | 'personas';
  entityId: string;
}

/**
 * Verify a bucket exists for a tenant
 * Uses a database function to check bucket existence based on authenticated user
 */
export async function ensureTenantBucket(tenantId: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Call the database function to get user's bucket info
    const { data, error } = await supabase.rpc('get_user_bucket');

    if (error) {
      return {
        success: false,
        error: `Failed to verify bucket: ${error.message}`,
      };
    }

    if (!data || data.length === 0) {
      return {
        success: false,
        error: 'No tenant found for current user. Please contact support.',
      };
    }

    const bucketInfo = data[0];

    // Check if bucket exists
    if (!bucketInfo.bucket_exists) {
      return {
        success: false,
        error: `Bucket '${bucketInfo.bucket_name}' does not exist. It should have been created automatically on signup. Please contact support.`,
      };
    }

    // Verify the bucket name matches what we expect
    if (bucketInfo.bucket_name !== tenantId) {
      return {
        success: false,
        error: `Bucket name mismatch. Expected '${tenantId}', got '${bucketInfo.bucket_name}'.`,
      };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Resize image to specific size
 */
async function resizeImage(file: File, maxSize: number, quality: number = 0.85): Promise<File> {
  try {
    const options = {
      maxWidthOrHeight: maxSize,
      useWebWorker: true,
      fileType: file.type,
      initialQuality: quality,
    };

    const compressedFile = await imageCompression(file, options);
    return compressedFile;
  } catch (error) {
    console.warn(`Failed to resize image to ${maxSize}px, using original:`, error);
    return file;
  }
}

/**
 * Create all image versions: original (4K max), AI (768px), thumbnail (400px)
 */
async function createImageVersions(file: File) {
  console.log(`Original file size: ${(file.size / 1024).toFixed(2)} KB`);

  const [original, ai, thumbnail] = await Promise.all([
    resizeImage(file, 3840, 0.90),  // 4K max, high quality
    resizeImage(file, 768, 0.85),   // AI processing, good quality
    resizeImage(file, 400, 0.80),   // Thumbnail, acceptable quality
  ]);

  console.log(`Versions created:
    - Original/4K: ${(original.size / 1024).toFixed(2)} KB
    - AI (768px): ${(ai.size / 1024).toFixed(2)} KB (${((1 - ai.size / file.size) * 100).toFixed(1)}% reduction)
    - Thumbnail (400px): ${(thumbnail.size / 1024).toFixed(2)} KB (${((1 - thumbnail.size / file.size) * 100).toFixed(1)}% reduction)`
  );

  return { original, ai, thumbnail };
}

/**
 * Upload an image or PDF file to Supabase Storage and classify it
 * Now with tenant/entity structure and AI-optimized resizing for images
 */
export async function uploadAndClassifyImage(
  file: File,
  config: UploadConfig
): Promise<UploadResult> {
  try {
    // Ensure bucket exists
    const bucketResult = await ensureTenantBucket(config.tenantId);
    if (!bucketResult.success) {
      return {
        success: false,
        error: `Failed to create/access bucket: ${bucketResult.error}`,
      };
    }

    // Check if file is a PDF
    const isPDF = file.type === 'application/pdf';

    // Create image versions only for images, not for PDFs
    let versions;
    if (isPDF) {
      console.log(`PDF file detected: ${file.name} (${(file.size / 1024).toFixed(2)} KB) - Skipping image resizing`);
      versions = { original: file, ai: file, thumbnail: file };
    } else {
      versions = await createImageVersions(file);
    }

    // Generate unique base name
    const fileExt = file.name.split('.').pop();
    const baseName = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const baseFolder = `${config.entityType}/${config.entityId}`;

    // Define file paths
    const originalPath = `${baseFolder}/${baseName}.${fileExt}`;
    const aiPath = `${baseFolder}/${baseName}-ai.${fileExt}`;
    const thumbPath = `${baseFolder}/${baseName}-thumb.${fileExt}`;

    // Upload all versions in parallel
    const [originalUpload, aiUpload, thumbUpload] = await Promise.all([
      supabase.storage.from(config.tenantId).upload(originalPath, versions.original, {
        cacheControl: '3600',
        upsert: false,
      }),
      supabase.storage.from(config.tenantId).upload(aiPath, versions.ai, {
        cacheControl: '3600',
        upsert: false,
      }),
      supabase.storage.from(config.tenantId).upload(thumbPath, versions.thumbnail, {
        cacheControl: '3600',
        upsert: false,
      }),
    ]);

    // Check for upload errors
    if (originalUpload.error || aiUpload.error || thumbUpload.error) {
      const errors = [originalUpload.error, aiUpload.error, thumbUpload.error].filter(Boolean);
      console.error('Upload errors:', errors);
      return {
        success: false,
        error: `Error uploading files: ${errors.map(e => e?.message).join(', ')}`,
      };
    }

    // Generate signed URLs with appropriate expiry times
    const [originalUrlData, aiUrlData, thumbUrlData] = await Promise.all([
      supabase.storage.from(config.tenantId).createSignedUrl(originalPath, 900),  // 15 min for display
      supabase.storage.from(config.tenantId).createSignedUrl(aiPath, 300),        // 5 min for AI processing
      supabase.storage.from(config.tenantId).createSignedUrl(thumbPath, 600),     // 10 min for thumbnails
    ]);

    if (originalUrlData.error || aiUrlData.error || thumbUrlData.error) {
      const errors = [originalUrlData.error, aiUrlData.error, thumbUrlData.error].filter(Boolean);
      return {
        success: false,
        error: `Failed to generate signed URLs: ${errors.map(e => e?.message).join(', ')}`,
      };
    }

    const originalUrl = originalUrlData.data!.signedUrl;
    const aiUrl = aiUrlData.data!.signedUrl;
    const thumbUrl = thumbUrlData.data!.signedUrl;

    // Call classification API using AI version (768px - optimal for Gemini)
    try {
      const classifyResponse = await fetch('http://localhost:3001/api/ai/classify-and-enrich', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageUrl: aiUrl, // Use AI-optimized version for classification
        }),
      });

      if (classifyResponse.ok) {
        const classifyData = await classifyResponse.json();

        // Extract classification data
        const classification: ClassificationResult = {
          type: classifyData.type,
          category: classifyData.category,
          room_type: classifyData.room_type,
          confidence: classifyData.confidence,
          reasoning: classifyData.reasoning,
          alt: classifyData.alt,
        };

        return {
          success: true,
          url: originalUrl,      // Original/4K for display
          path: originalPath,
          aiUrl: aiUrl,          // AI version for processing
          aiPath: aiPath,
          thumbUrl: thumbUrl,    // Thumbnail for galleries
          thumbPath: thumbPath,
          classification,
          // Legacy support - keep old category field
          category: classifyData.room_type || classifyData.category,
        };
      } else {
        // Classification failed, but upload succeeded
        console.warn('Classification failed, but upload succeeded');
        return {
          success: true,
          url: originalUrl,
          path: originalPath,
          aiUrl: aiUrl,
          aiPath: aiPath,
          thumbUrl: thumbUrl,
          thumbPath: thumbPath,
          category: 'Otros',
        };
      }
    } catch (classifyError) {
      // Classification failed, but upload succeeded
      console.warn('Classification error:', classifyError);
      return {
        success: true,
        url: originalUrl,
        path: originalPath,
        aiUrl: aiUrl,
        aiPath: aiPath,
        thumbUrl: thumbUrl,
        thumbPath: thumbPath,
        category: 'Otros',
      };
    }
  } catch (error) {
    console.error('Unexpected error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Delete an image from Supabase Storage
 */
export async function deleteImage(
  tenantId: string,
  path: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.storage.from(tenantId).remove([path]);

    if (error) {
      return {
        success: false,
        error: error.message,
      };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get a signed URL for a file in private bucket
 * Use this to display/download files from private buckets
 */
export async function getSignedUrl(
  tenantId: string,
  filePath: string,
  expiresIn: number = 900 // Default: 15 minutes (reasonable for display)
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const { data, error } = await supabase.storage
      .from(tenantId)
      .createSignedUrl(filePath, expiresIn);

    if (error || !data) {
      return {
        success: false,
        error: error?.message || 'Failed to generate signed URL',
      };
    }

    return {
      success: true,
      url: data.signedUrl,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get list of documents for an entity (property or client)
 */
export async function listEntityDocuments(
  config: UploadConfig
): Promise<{ success: boolean; files?: any[]; error?: string }> {
  try {
    const folder = `${config.entityType}/${config.entityId}`;
    const { data, error } = await supabase.storage
      .from(config.tenantId)
      .list(folder, {
        limit: 100,
        offset: 0,
        sortBy: { column: 'created_at', order: 'desc' },
      });

    if (error) {
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: true,
      files: data,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
