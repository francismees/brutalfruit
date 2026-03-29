/* ─── Database Types ─── */

export interface Album {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  event_date: string | null;
  cover_image_url: string | null;
  is_published: boolean;
  bulk_download: boolean;
  created_at: string;
  updated_at: string;
}

export interface GalleryImage {
  id: string;
  album_id: string;
  storage_path: string;
  thumbnail_path?: string | null;
  filename: string;
  file_size: number | null;
  width: number | null;
  height: number | null;
  uploaded_by: string | null;
  sort_order: number;
  created_at: string;
}

export interface Photographer {
  id: string;
  display_name: string;
  is_active: boolean;
  created_at: string;
}

export interface AlbumPhotographer {
  album_id: string;
  photographer_id: string;
}

/* ─── Frontend Types ─── */

export interface AlbumWithCount extends Album {
  image_count: number;
}

/** @deprecated Use QueueItem instead */
export interface UploadFile {
  id: string;
  file: File;
  name: string;
  size: number;
  progress: number;
  status: 'pending' | 'uploading' | 'complete' | 'error';
  error?: string;
  previewUrl?: string;
}

export type UploadStatus = 'queued' | 'uploading' | 'complete' | 'failed' | 'retrying' | 'cancelled';

export interface QueueItem {
  id: string;
  file: File;
  name: string;
  size: number;
  status: UploadStatus;
  progress: number;       // 0-100, real TUS progress
  retryCount: number;     // 0 to MAX_RETRY_COUNT
  error?: string;
  previewUrl?: string;
  storagePath?: string;   // set once upload begins
  width?: number | null;
  height?: number | null;
}

export type ConnectionQuality = 'testing' | 'fast' | 'moderate' | 'slow';

export type UserRole = 'admin' | 'photographer' | 'public';
