import { STORAGE_BUCKET } from './constants';

interface ImageLoaderParams {
  src: string;
  width: number;
  quality?: number;
}

/**
 * Custom image loader for Next.js <Image> component.
 * Appends Supabase Storage transform params to serve optimized images
 * via Supabase's Smart CDN with automatic WebP conversion.
 */
export default function supabaseImageLoader({ src, width, quality }: ImageLoaderParams): string {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  // If src is already a full URL, just return it
  if (src.startsWith('http')) {
    return src;
  }

  // Build the transform URL
  return `${supabaseUrl}/storage/v1/render/image/public/${STORAGE_BUCKET}/${src}?width=${width}&quality=${quality || 80}`;
}

/**
 * Get the public URL for a storage path (no transforms, original file).
 */
export function getPublicUrl(storagePath: string): string {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return `${supabaseUrl}/storage/v1/object/public/${STORAGE_BUCKET}/${storagePath}`;
}

/**
 * Get a thumbnail URL for a storage path.
 */
export function getThumbnailUrl(storagePath: string, width = 400, quality = 80): string {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return `${supabaseUrl}/storage/v1/render/image/public/${STORAGE_BUCKET}/${storagePath}?width=${width}&quality=${quality}`;
}
