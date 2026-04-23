/**
 * Video Upload Utilities
 *
 * Client-side helpers for video files:
 *  - Thumbnail generation (frame grab → webp blob)
 *  - Duration extraction
 *  - Duration formatting for UI display
 *
 * All functions create temporary object URLs that are revoked internally.
 * No server-side processing required.
 */

/**
 * Generate a poster thumbnail from a video file.
 *
 * Seeks to 1s (or 25% of duration for very short clips), draws the frame
 * onto a canvas, and returns a WebP blob at 400px width.
 *
 * @param file - The video File object
 * @returns A WebP Blob suitable for uploading as a poster image
 */
export function generateVideoThumbnail(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;

    video.onloadeddata = () => {
      // Seek to 1s, or 25% of duration for clips shorter than 4s
      video.currentTime = Math.min(1, video.duration * 0.25);
    };

    video.onseeked = () => {
      const canvas = document.createElement('canvas');
      const targetWidth = 400;
      canvas.width = targetWidth;
      canvas.height = Math.round((targetWidth / video.videoWidth) * video.videoHeight);

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(video.src);
        reject(new Error('Canvas 2D context unavailable'));
        return;
      }

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => {
          URL.revokeObjectURL(video.src);
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to generate thumbnail blob'));
          }
        },
        'image/webp',
        0.8
      );
    };

    video.onerror = () => {
      URL.revokeObjectURL(video.src);
      reject(new Error('Failed to load video for thumbnail generation'));
    };

    video.src = URL.createObjectURL(file);
  });
}

/**
 * Extract the duration of a video file in whole seconds.
 *
 * @param file - The video File object
 * @returns Duration in seconds, rounded to the nearest integer
 */
export function getVideoDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';

    video.onloadedmetadata = () => {
      const duration = Math.round(video.duration);
      URL.revokeObjectURL(video.src);
      resolve(duration);
    };

    video.onerror = () => {
      URL.revokeObjectURL(video.src);
      // Resolve with 0 rather than rejecting — duration is non-critical
      resolve(0);
    };

    video.src = URL.createObjectURL(file);
  });
}

/**
 * Format a duration value (in seconds) as a human-readable M:SS string.
 *
 * @example formatDuration(92) // "1:32"
 * @example formatDuration(null) // "0:00"
 */
export function formatDuration(seconds: number | null | undefined): string {
  if (!seconds || seconds <= 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
