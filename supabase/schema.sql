-- ============================================
-- Selfie — Brutal Fruit Event Gallery
-- Database Schema & Row-Level Security
-- ============================================

-- Albums
CREATE TABLE IF NOT EXISTS albums (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  slug            TEXT NOT NULL UNIQUE,
  description     TEXT,
  event_date      DATE,
  cover_image_url TEXT,
  is_published    BOOLEAN DEFAULT false,
  bulk_download   BOOLEAN DEFAULT false,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Images
CREATE TABLE IF NOT EXISTS images (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  album_id        UUID NOT NULL REFERENCES albums(id) ON DELETE CASCADE,
  storage_path    TEXT NOT NULL,
  thumbnail_path  TEXT,
  filename        TEXT NOT NULL,
  file_size       BIGINT,
  width           INTEGER,
  height          INTEGER,
  uploaded_by     UUID DEFAULT auth.uid() REFERENCES auth.users(id),
  sort_order      INTEGER DEFAULT 0,
  media_type      TEXT DEFAULT 'image' CHECK (media_type IN ('image', 'video')),
  duration        INTEGER,
  video_thumbnail_path TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Force add the column if it doesn't exist to avoid tearing down the MVP testing data
ALTER TABLE images ADD COLUMN IF NOT EXISTS thumbnail_path TEXT;

-- Photographers
CREATE TABLE IF NOT EXISTS photographers (
  id              UUID PRIMARY KEY REFERENCES auth.users(id),
  display_name    TEXT NOT NULL,
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Album-Photographer assignments
CREATE TABLE IF NOT EXISTS album_photographers (
  album_id        UUID REFERENCES albums(id) ON DELETE CASCADE,
  photographer_id UUID REFERENCES photographers(id) ON DELETE CASCADE,
  PRIMARY KEY (album_id, photographer_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_images_album_id ON images(album_id);
CREATE INDEX IF NOT EXISTS idx_images_uploaded_by ON images(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_albums_slug ON albums(slug);
CREATE INDEX IF NOT EXISTS idx_albums_is_published ON albums(is_published);

-- ============================================
-- Row-Level Security
-- ============================================

-- Albums
ALTER TABLE albums ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view published albums" ON albums;
CREATE POLICY "Public can view published albums"
  ON albums FOR SELECT
  USING (is_published = true);

DROP POLICY IF EXISTS "Admins can do everything with albums" ON albums;
CREATE POLICY "Admins can do everything with albums"
  ON albums FOR ALL
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

-- Photographers can update albums they are assigned to (e.g. to set cover image)
DROP POLICY IF EXISTS "Photographers can update assigned albums" ON albums;
CREATE POLICY "Photographers can update assigned albums"
  ON albums FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM album_photographers
      WHERE album_photographers.album_id = albums.id
      AND album_photographers.photographer_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM album_photographers
      WHERE album_photographers.album_id = albums.id
      AND album_photographers.photographer_id = auth.uid()
    )
  );

-- Images
ALTER TABLE images ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view images in published albums" ON images;
CREATE POLICY "Public can view images in published albums"
  ON images FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM albums
      WHERE albums.id = images.album_id
      AND albums.is_published = true
    )
  );

DROP POLICY IF EXISTS "Photographers can upload to assigned albums" ON images;
CREATE POLICY "Photographers can upload to assigned albums"
  ON images FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM album_photographers
      WHERE album_photographers.album_id = images.album_id
      AND album_photographers.photographer_id = auth.uid()
    )
  );

-- Photographers can view images in albums they are assigned to
DROP POLICY IF EXISTS "Photographers can view assigned album images" ON images;
CREATE POLICY "Photographers can view assigned album images"
  ON images FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM album_photographers
      WHERE album_photographers.album_id = images.album_id
      AND album_photographers.photographer_id = auth.uid()
    )
  );

-- Photographers can reorder images in their assigned albums
DROP POLICY IF EXISTS "Photographers can reorder assigned album images" ON images;
CREATE POLICY "Photographers can reorder assigned album images"
  ON images FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM album_photographers
      WHERE album_photographers.album_id = images.album_id
      AND album_photographers.photographer_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM album_photographers
      WHERE album_photographers.album_id = images.album_id
      AND album_photographers.photographer_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins can do everything with images" ON images;
CREATE POLICY "Admins can do everything with images"
  ON images FOR ALL
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

-- Photographers
ALTER TABLE photographers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage photographers" ON photographers;
CREATE POLICY "Admins can manage photographers"
  ON photographers FOR ALL
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

-- Album Photographers
ALTER TABLE album_photographers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage assignments" ON album_photographers;
CREATE POLICY "Admins can manage assignments"
  ON album_photographers FOR ALL
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

DROP POLICY IF EXISTS "Photographers can view own assignments" ON album_photographers;
CREATE POLICY "Photographers can view own assignments"
  ON album_photographers FOR SELECT
  USING (photographer_id = auth.uid());

-- Photographers can read albums they are assigned to (even unpublished)
DROP POLICY IF EXISTS "Photographers can view assigned albums" ON albums;
CREATE POLICY "Photographers can view assigned albums"
  ON albums FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM album_photographers
      WHERE album_photographers.album_id = albums.id
      AND album_photographers.photographer_id = auth.uid()
    )
  );

-- Photographers can view their own profile
DROP POLICY IF EXISTS "Photographers can view own profile" ON photographers;
CREATE POLICY "Photographers can view own profile"
  ON photographers FOR SELECT
  USING (id = auth.uid());

-- ============================================
-- Updated_at trigger
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER albums_updated_at
  BEFORE UPDATE ON albums
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Force add columns if they don't exist
ALTER TABLE albums ADD COLUMN IF NOT EXISTS description TEXT;

-- ============================================
-- Photographers Delete Policy
-- ============================================
DROP POLICY IF EXISTS "Photographers can delete own images" ON images;
DROP POLICY IF EXISTS "Photographers can delete assigned images" ON images;
CREATE POLICY "Photographers can delete assigned images"
  ON images FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM album_photographers
      WHERE album_photographers.album_id = images.album_id
      AND album_photographers.photographer_id = auth.uid()
    )
  );

-- ============================================
-- Storage Policies (bucket_id: 'event-photos')
-- ============================================

-- Allow public read access to the bucket
DROP POLICY IF EXISTS "Public can view event photos" ON storage.objects;
CREATE POLICY "Public can view event photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'event-photos');

-- Allow authenticated users (photographers/admins) to upload
DROP POLICY IF EXISTS "Authenticated can upload event photos" ON storage.objects;
CREATE POLICY "Authenticated can upload event photos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'event-photos');

-- Allow photographers to update their own files (essential for TUS resumable uploads > 6MB)
DROP POLICY IF EXISTS "Users can update own event photos" ON storage.objects;
CREATE POLICY "Users can update own event photos"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'event-photos' AND auth.uid() = owner);

-- Allow photographers/admins to delete files
DROP POLICY IF EXISTS "Users can delete own event photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete event photos" ON storage.objects;
CREATE POLICY "Users can delete event photos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'event-photos');

-- Allow admins full control over the bucket
DROP POLICY IF EXISTS "Admins have full control of event photos" ON storage.objects;
CREATE POLICY "Admins have full control of event photos"
  ON storage.objects FOR ALL
  TO authenticated
  USING (bucket_id = 'event-photos' AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
