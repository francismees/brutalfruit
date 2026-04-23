-- Migration: Add video support to images table
ALTER TABLE images ADD COLUMN IF NOT EXISTS media_type TEXT DEFAULT 'image' 
  CHECK (media_type IN ('image', 'video'));

ALTER TABLE images ADD COLUMN IF NOT EXISTS duration INTEGER;

ALTER TABLE images ADD COLUMN IF NOT EXISTS video_thumbnail_path TEXT;
