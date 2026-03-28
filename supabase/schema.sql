-- ============================================
-- Selfie — Brutal Fruit Event Gallery
-- Database Schema & Row-Level Security
-- ============================================

-- Albums
CREATE TABLE IF NOT EXISTS albums (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  slug            TEXT UNIQUE NOT NULL,
  event_date      DATE,
  cover_image_url TEXT,
  is_published    BOOLEAN DEFAULT FALSE,
  bulk_download   BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Images
CREATE TABLE IF NOT EXISTS images (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  album_id        UUID NOT NULL REFERENCES albums(id) ON DELETE CASCADE,
  storage_path    TEXT NOT NULL,
  filename        TEXT NOT NULL,
  file_size       BIGINT,
  width           INTEGER,
  height          INTEGER,
  uploaded_by     UUID REFERENCES auth.users(id),
  sort_order      INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

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
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
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

DROP POLICY IF EXISTS "Admins can do everything with images" ON images;
CREATE POLICY "Admins can do everything with images"
  ON images FOR ALL
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );

-- Photographers
ALTER TABLE photographers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage photographers" ON photographers;
CREATE POLICY "Admins can manage photographers"
  ON photographers FOR ALL
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );

-- Album Photographers
ALTER TABLE album_photographers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage assignments" ON album_photographers;
CREATE POLICY "Admins can manage assignments"
  ON album_photographers FOR ALL
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );

DROP POLICY IF EXISTS "Photographers can view own assignments" ON album_photographers;
CREATE POLICY "Photographers can view own assignments"
  ON album_photographers FOR SELECT
  USING (photographer_id = auth.uid());

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
