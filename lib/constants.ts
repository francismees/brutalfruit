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
export const UPLOAD_URL_EXPIRY = 60; // seconds

/* ─── Adaptive Upload Pipeline ─── */
export const TUS_CHUNK_SIZE = 6 * 1024 * 1024; // 6MB — Supabase minimum for resumable
export const BATCH_INSERT_SIZE = 10;
export const MAX_RETRY_COUNT = 3;
export const RETRY_DELAYS = [1000, 3000, 5000]; // ms

// Adaptive concurrency thresholds (based on first file upload duration)
export const CONCURRENCY_FAST = 6;   // first upload < 3s
export const CONCURRENCY_MODERATE = 4; // first upload 3-8s
export const CONCURRENCY_SLOW = 3;   // first upload > 8s
export const SPEED_TEST_FAST_THRESHOLD = 3000;  // ms
export const SPEED_TEST_SLOW_THRESHOLD = 8000;  // ms

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
