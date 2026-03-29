-- ============================================
-- Selfie — Brutal Fruit Event Gallery
-- Analytics Schema & Policies
-- ============================================

-- 1. Analytics Page Views
CREATE TABLE IF NOT EXISTS analytics_page_views (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  album_id        UUID REFERENCES albums(id) ON DELETE SET NULL,  -- nullable: null when on album list page
  page_path       TEXT NOT NULL,                                   -- e.g. "/", "/the-pink-table"
  visitor_hash    TEXT NOT NULL,                                   -- anonymous hash (IP + UA), no PII
  session_id      TEXT,                                            -- groups interactions within a single visit
  referrer        TEXT,                                            -- document.referrer
  utm_source      TEXT,
  utm_medium      TEXT,
  utm_campaign    TEXT,
  device_type     TEXT,                                            -- "mobile", "tablet", "desktop"
  screen_width    INTEGER,
  user_agent      TEXT,
  country         TEXT,                                            -- derived from request headers if available
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_apv_album_id ON analytics_page_views(album_id);
CREATE INDEX IF NOT EXISTS idx_apv_created_at ON analytics_page_views(created_at);
CREATE INDEX IF NOT EXISTS idx_apv_visitor_hash ON analytics_page_views(visitor_hash);
CREATE INDEX IF NOT EXISTS idx_apv_session_id ON analytics_page_views(session_id);

-- 2. Analytics Image Events
CREATE TABLE IF NOT EXISTS analytics_image_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  image_id        UUID NOT NULL REFERENCES images(id) ON DELETE CASCADE,
  album_id        UUID NOT NULL REFERENCES albums(id) ON DELETE CASCADE,
  event_type      TEXT NOT NULL CHECK (event_type IN ('view', 'click', 'download', 'share')),
  visitor_hash    TEXT NOT NULL,
  session_id      TEXT,
  device_type     TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_aie_image_id ON analytics_image_events(image_id);
CREATE INDEX IF NOT EXISTS idx_aie_album_id ON analytics_image_events(album_id);
CREATE INDEX IF NOT EXISTS idx_aie_event_type ON analytics_image_events(event_type);
CREATE INDEX IF NOT EXISTS idx_aie_created_at ON analytics_image_events(created_at);

-- ============================================
-- Row-Level Security
-- ============================================

-- Page views
ALTER TABLE analytics_page_views ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role can insert page views" ON analytics_page_views;
CREATE POLICY "Service role can insert page views"
  ON analytics_page_views FOR INSERT
  WITH CHECK (true);  -- inserts come through API route using service role key

DROP POLICY IF EXISTS "Admins can read page views" ON analytics_page_views;
CREATE POLICY "Admins can read page views"
  ON analytics_page_views FOR SELECT
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

DROP POLICY IF EXISTS "Admins can manage page views" ON analytics_page_views;
CREATE POLICY "Admins can manage page views"
  ON analytics_page_views FOR ALL
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- Image events
ALTER TABLE analytics_image_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role can insert image events" ON analytics_image_events;
CREATE POLICY "Service role can insert image events"
  ON analytics_image_events FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can read image events" ON analytics_image_events;
CREATE POLICY "Admins can read image events"
  ON analytics_image_events FOR SELECT
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

DROP POLICY IF EXISTS "Admins can manage image events" ON analytics_image_events;
CREATE POLICY "Admins can manage image events"
  ON analytics_image_events FOR ALL
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
