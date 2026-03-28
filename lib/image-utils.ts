/**
 * Utility for generating lightweight browser-side WebP thumbnails 
 * before uploading them to Supabase to bypass heavy backend Next.js Image Optimization.
 */
export async function generateClientThumbnail(file: File, maxDimension = 800): Promise<Blob | null> {
  // We only attempt to generate a thumbnail for raster images that the browser natively understands
  const isBrowserSupportedImage = file.type.match(/image\/(jpeg|png|webp|gif)/i);
  if (!isBrowserSupportedImage) return null;

  try {
    const bitmap = await createImageBitmap(file);
    let { width, height } = bitmap;
    
    // Scale proportionally if image is larger than max dimension
    if (width > maxDimension || height > maxDimension) {
      const ratio = Math.min(maxDimension / width, maxDimension / height);
      width = Math.round(width * ratio);
      height = Math.round(height * ratio);
    }
    
    // Draw to an offscreen canvas
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      bitmap.close();
      return null;
    }
    
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();
    
    // Convert directly to a WebP blob at 80% quality
    return await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((blob) => resolve(blob), 'image/webp', 0.8);
    });
  } catch (err) {
    console.warn("Client thumbnail generation failed for", file.name, err);
    return null; // Graceful fallback
  }
}
