-- ============================================
-- Milan Brunch — RSVP + Check-in + Comms
-- ============================================

-- RSVPs --------------------------------------------------------------
CREATE TABLE IF NOT EXISTS milan_brunch_rsvps (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  full_name       TEXT NOT NULL,
  phone_e164      TEXT NOT NULL,
  email           TEXT NOT NULL,
  qr_token        UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  checked_in_at   TIMESTAMPTZ,
  checked_in_by   TEXT,
  source          TEXT NOT NULL DEFAULT 'public_form',
  UNIQUE (email),
  UNIQUE (phone_e164)
);

CREATE INDEX IF NOT EXISTS idx_mbrsvp_qr_token       ON milan_brunch_rsvps (qr_token);
CREATE INDEX IF NOT EXISTS idx_mbrsvp_checked_in_at  ON milan_brunch_rsvps (checked_in_at);
CREATE INDEX IF NOT EXISTS idx_mbrsvp_created_at     ON milan_brunch_rsvps (created_at DESC);

ALTER TABLE milan_brunch_rsvps ENABLE ROW LEVEL SECURITY;

-- Anonymous public can submit RSVPs through the form
DROP POLICY IF EXISTS "Anon can insert RSVPs" ON milan_brunch_rsvps;
CREATE POLICY "Anon can insert RSVPs"
  ON milan_brunch_rsvps FOR INSERT
  TO anon
  WITH CHECK (true);

-- Authenticated dashboard users can read / update / delete
DROP POLICY IF EXISTS "Authenticated can read RSVPs" ON milan_brunch_rsvps;
CREATE POLICY "Authenticated can read RSVPs"
  ON milan_brunch_rsvps FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated can update RSVPs" ON milan_brunch_rsvps;
CREATE POLICY "Authenticated can update RSVPs"
  ON milan_brunch_rsvps FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated can delete RSVPs" ON milan_brunch_rsvps;
CREATE POLICY "Authenticated can delete RSVPs"
  ON milan_brunch_rsvps FOR DELETE
  TO authenticated
  USING (true);


-- Messages (audit log of dashboard sends) -----------------------------
CREATE TABLE IF NOT EXISTS milan_brunch_messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_by         TEXT NOT NULL,
  channel         TEXT NOT NULL CHECK (channel IN ('email', 'sms')),
  subject         TEXT,
  body            TEXT NOT NULL,
  audience        TEXT NOT NULL CHECK (audience IN ('all', 'checked_in', 'not_checked_in')),
  recipient_count INT NOT NULL DEFAULT 0,
  status          TEXT NOT NULL DEFAULT 'sent'
);

CREATE INDEX IF NOT EXISTS idx_mbmsg_created_at ON milan_brunch_messages (created_at DESC);

ALTER TABLE milan_brunch_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can read messages" ON milan_brunch_messages;
CREATE POLICY "Authenticated can read messages"
  ON milan_brunch_messages FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated can insert messages" ON milan_brunch_messages;
CREATE POLICY "Authenticated can insert messages"
  ON milan_brunch_messages FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated can update messages" ON milan_brunch_messages;
CREATE POLICY "Authenticated can update messages"
  ON milan_brunch_messages FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated can delete messages" ON milan_brunch_messages;
CREATE POLICY "Authenticated can delete messages"
  ON milan_brunch_messages FOR DELETE
  TO authenticated
  USING (true);
