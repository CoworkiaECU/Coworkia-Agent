-- ============================================================
-- Migration 004: Agregar campos para validación PayPhone
-- ============================================================
-- Fecha: 2026-01-22
-- Propósito: Almacenar datos de comprobantes PayPhone para
--            validación detallada de pagos (transacción,
--            autorización, fecha real del pago)
-- ============================================================

-- Agregar campos para información detallada de PayPhone
ALTER TABLE reservations 
ADD COLUMN IF NOT EXISTS payment_transaction_number VARCHAR(50),
ADD COLUMN IF NOT EXISTS payment_authorization_code VARCHAR(50),
ADD COLUMN IF NOT EXISTS payment_date TIMESTAMP,
ADD COLUMN IF NOT EXISTS payment_receipt_url TEXT,
ADD COLUMN IF NOT EXISTS payment_verified_at TIMESTAMP;

-- Crear índices para búsquedas rápidas por número de transacción
CREATE INDEX IF NOT EXISTS idx_reservations_transaction_number 
ON reservations(payment_transaction_number) 
WHERE payment_transaction_number IS NOT NULL;

-- Crear índice para búsquedas por código de autorización
CREATE INDEX IF NOT EXISTS idx_reservations_authorization_code 
ON reservations(payment_authorization_code) 
WHERE payment_authorization_code IS NOT NULL;

-- Agregar comentarios a las columnas (solo PostgreSQL)
COMMENT ON COLUMN reservations.payment_transaction_number IS 'Número de transacción de PayPhone (ej: 70613140)';
COMMENT ON COLUMN reservations.payment_authorization_code IS 'Código de autorización de PayPhone (ej: W70613140)';
COMMENT ON COLUMN reservations.payment_date IS 'Fecha y hora real del pago según comprobante';
COMMENT ON COLUMN reservations.payment_receipt_url IS 'URL de la imagen del comprobante de pago';
COMMENT ON COLUMN reservations.payment_verified_at IS 'Timestamp cuando Aurora verificó el comprobante';

-- Validación: Evitar transacciones duplicadas
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_payphone_transaction 
ON reservations(payment_transaction_number, payment_authorization_code) 
WHERE payment_transaction_number IS NOT NULL 
  AND payment_authorization_code IS NOT NULL;

-- ============================================================
-- Fin de Migration 004
-- ============================================================
