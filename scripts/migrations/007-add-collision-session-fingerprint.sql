-- Adds session_fingerprint to collision_quotes and unique index for dedupe per session
ALTER TABLE collision_quotes ADD COLUMN IF NOT EXISTS session_fingerprint TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS ux_collision_quotes_fingerprint
  ON collision_quotes(session_fingerprint)
  WHERE session_fingerprint IS NOT NULL;
