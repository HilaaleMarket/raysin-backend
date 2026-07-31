import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

// Standard base URL oo aan lahayn /rest/v1/
const rawUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://anaxksomjoxmfxmmqcat.supabase.co';
// Haddii dhamaadka uu ku jiro /rest/v1/ ka bixi
const supabaseUrl = rawUrl.replace(/\/rest\/v1\/?$/, '');

const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFuYXhrc29tam94bWZ4bW1xY2F0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQxODczNzUsImV4cCI6MjA5OTc2MzM3NX0.98iuPquxI3eiUkb2cdPl3d58i8F8KUMPXaRzmyHxAV8';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("❌ DHIBAATO: SUPABASE_URL ama SUPABASE_ANON_KEY ma joogaan .env file-ka!");
} else {
  console.log("✅ Supabase Client si sax ah ayaa loo xidhiidhiyay.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Upload Image Function for Backend Express Controller / Service
 * @param fileBuffer - Buffer-ka faylka ka yimid Multer/Formidable
 * @param originalName - Magaca faylka ama extension-ka (.jpg, .png)
 * @param mimeType - type-ka faylka (e.g. 'image/png')
 */
export async function uploadVendorProductImage(fileBuffer: Buffer, originalName: string, mimeType: string): Promise<string | null> {
  try {
    const fileExt = originalName.split('.').pop() || 'png';
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `products/${fileName}`;

    // 1. Upload Buffer to Supabase Storage
    const { data, error: uploadError } = await supabase.storage
      .from('product-images')
      .upload(filePath, fileBuffer, {
        contentType: mimeType,
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('❌ Supabase upload error:', uploadError.message);
      return null;
    }

    // 2. Get Public URL
    const { data: { publicUrl } } = supabase.storage
      .from('product-images')
      .getPublicUrl(filePath);

    console.log("✅ Uploaded Image Public URL:", publicUrl);
    return publicUrl;

  } catch (error) {
    console.error('❌ Error in uploadVendorProductImage:', error);
    return null;
  }
}