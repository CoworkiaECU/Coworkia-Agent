-- Migration 008: Aluna prospect follow-up email tracking
-- Añade: membership_code (referencia proforma), email del prospecto,
-- y timestamps de envío de email 24h y 7d para visibilidad en dashboard.

ALTER TABLE aluna_prospect_followups
  ADD COLUMN IF NOT EXISTS membership_code        VARCHAR(50),
  ADD COLUMN IF NOT EXISTS email                  VARCHAR(255),
  ADD COLUMN IF NOT EXISTS followup_24h_email_sent_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS followup_3d_email_sent_at  TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_aluna_prospects_membership_code
  ON aluna_prospect_followups(membership_code)
  WHERE membership_code IS NOT NULL;
