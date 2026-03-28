/* ─── Image Transform Sizes ─── */
export const IMAGE_SIZES = {
  thumbnail: { width: 400, quality: 80 },
  swipe: { width: 1200, quality: 85 },
  // original: served directly from storage
} as const;

/* ─── Pagination ─── */
export const DEFAULT_PAGE_SIZE = 40;
export const PAGE_SIZE_OPTIONS = [20, 40, 60, 80] as const;

/* ─── Upload Constraints ─── */
export const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
export const ACCEPTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/tiff',
  'image/x-adobe-dng',
] as const;
export const ACCEPTED_EXTENSIONS = '.jpg,.jpeg,.png,.tiff,.tif,.dng,.arw,.cr2,.nef,.raw';
export const MAX_CONCURRENT_UPLOADS = 3;
export const UPLOAD_URL_EXPIRY = 60; // seconds

/* ─── Supabase Storage ─── */
export const STORAGE_BUCKET = 'event-photos';

/* ─── Breakpoints (for reference, Tailwind handles these) ─── */
export const BREAKPOINTS = {
  mobile: 375,
  tablet: 768,
  desktop: 1280,
} as const;

/* ─── Gallery Grid Columns ─── */
export const GRID_COLUMNS = {
  mobile: 2,
  tablet: 3,
  desktop: 4,
} as const;

/* ─── Age Gate ─── */
export const AGE_GATE_STORAGE_KEY = 'bf_age_verified';
