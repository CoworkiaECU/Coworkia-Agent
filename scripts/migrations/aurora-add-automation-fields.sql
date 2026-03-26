-- Migración: Agregar campos tracking para automatizaciones Aurora
-- Fecha: 26 Mar 2026
-- Plan: plan-vuelo-aurora-automatizaciones-perfectas.md Bloque A1

-- Follow-ups post-reserva
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS followup_d1_sent_at TIMESTAMP;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS followup_d3_sent_at TIMESTAMP;

-- Recordatorios pre-reserva
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS reminder_24h_sent_at TIMESTAMP;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS reminder_2h_sent_at TIMESTAMP;

-- Pago automatizado
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS payment_reminder_sent_at TIMESTAMP;

-- No-show detection
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS no_show_detected_at TIMESTAMP;

-- Upselling Aluna
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS upsell_aluna_sent_at TIMESTAMP;

-- Comentarios
COMMENT ON COLUMN reservations.followup_d1_sent_at IS 'Timestamp envío follow-up D+1 (engagement)';
COMMENT ON COLUMN reservations.followup_d3_sent_at IS 'Timestamp envío follow-up D+3 (FOMO)';
COMMENT ON COLUMN reservations.reminder_24h_sent_at IS 'Timestamp envío recordatorio 24h antes';
COMMENT ON COLUMN reservations.reminder_2h_sent_at IS 'Timestamp envío recordatorio 2h antes';
COMMENT ON COLUMN reservations.payment_reminder_sent_at IS 'Timestamp recordatorio pago pendiente';
COMMENT ON COLUMN reservations.no_show_detected_at IS 'Timestamp detección no-show';
COMMENT ON COLUMN reservations.upsell_aluna_sent_at IS 'Timestamp propuesta membresía Aluna';

-- Crear índices para queries de crons
CREATE INDEX IF NOT EXISTS idx_reservations_followup_d1 ON reservations(followup_d1_sent_at) WHERE followup_d1_sent_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_reservations_followup_d3 ON reservations(followup_d3_sent_at) WHERE followup_d3_sent_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_reservations_reminder_24h ON reservations(reminder_24h_sent_at) WHERE reminder_24h_sent_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_reservations_reminder_2h ON reservations(reminder_2h_sent_at) WHERE reminder_2h_sent_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_reservations_no_show ON reservations(no_show_detected_at) WHERE no_show_detected_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_reservations_upsell_aluna ON reservations(upsell_aluna_sent_at) WHERE upsell_aluna_sent_at IS NULL;

-- Verificación
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'reservations' 
  AND column_name IN ('followup_d1_sent_at', 'followup_d3_sent_at', 'reminder_24h_sent_at', 
                       'reminder_2h_sent_at', 'payment_reminder_sent_at', 'no_show_detected_at', 'upsell_aluna_sent_at')
ORDER BY column_name;
