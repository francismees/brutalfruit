/* ─── Database Types ─── */

export interface Album {
  id: string;
  name: string;
  slug: string;
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

export type UserRole = 'admin' | 'photographer' | 'public';
