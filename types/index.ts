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
  /** 'image' (default) or 'video'. Populated from the images.media_type column. */
  media_type?: 'image' | 'video';
  /** Video duration in whole seconds. NULL for images. */
  duration?: number | null;
  /** Storage path of the client-generated video poster thumbnail. NULL for images. */
  video_thumbnail_path?: string | null;
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
  /** 'image' (default) or 'video', derived from file MIME type. */
  media_type?: 'image' | 'video';
  /** Video duration in whole seconds, extracted client-side before upload. */
  duration?: number | null;
  /** Object URL of the generated thumbnail blob (for the queue list preview). Revoked on destroy. */
  videoThumbnailBlob?: Blob;
  /** Storage path of the uploaded video thumbnail, populated after thumbnail upload completes. */
  videoThumbnailStoragePath?: string;
}

export type ConnectionQuality = 'testing' | 'fast' | 'moderate' | 'slow';

export type UserRole = 'admin' | 'photographer' | 'public';
