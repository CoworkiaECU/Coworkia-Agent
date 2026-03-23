/**
 * 002_adriana_kyc.js — KYC columns + competitor_quotes en insurance_leads
 *
 * Agrega campos para:
 *  - Datos KYC del asegurado (cédula, matrícula, etc.)
 *  - Cotización de competidores (monto + aseguradora)
 *
 * NOTA: El repositorio adrianaRepository.js ya aplica estas columnas
 * inline vía ALTER TABLE IF NOT EXISTS. Esta migración formaliza ese
 * cambio en el sistema de migraciones versionado.
 */

export async function up(db) {
  await db.run(`
    ALTER TABLE insurance_leads
      ADD COLUMN IF NOT EXISTS kyc_cedula               VARCHAR(20),
      ADD COLUMN IF NOT EXISTS kyc_matricula             VARCHAR(20),
      ADD COLUMN IF NOT EXISTS kyc_fecha_nacimiento      DATE,
      ADD COLUMN IF NOT EXISTS kyc_estado_civil          VARCHAR(50),
      ADD COLUMN IF NOT EXISTS kyc_direccion             TEXT,
      ADD COLUMN IF NOT EXISTS kyc_ciudad                VARCHAR(100),
      ADD COLUMN IF NOT EXISTS competitor_quotes         JSONB,
      ADD COLUMN IF NOT EXISTS competitor_quote_amount   NUMERIC(10,2),
      ADD COLUMN IF NOT EXISTS competitor_insurer        VARCHAR(100),
      ADD COLUMN IF NOT EXISTS quote_sent_at             TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS accepted_at               TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS emitted_at                TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS policy_number             VARCHAR(100)
  `);

  console.log('[MIGRATION 002] ✅ KYC columns + competitor_quotes aplicados en insurance_leads');
}

export async function down(db) {
  await db.run(`
    ALTER TABLE insurance_leads
      DROP COLUMN IF EXISTS kyc_cedula,
      DROP COLUMN IF EXISTS kyc_matricula,
      DROP COLUMN IF EXISTS kyc_fecha_nacimiento,
      DROP COLUMN IF EXISTS kyc_estado_civil,
      DROP COLUMN IF EXISTS kyc_direccion,
      DROP COLUMN IF EXISTS kyc_ciudad,
      DROP COLUMN IF EXISTS competitor_quotes,
      DROP COLUMN IF EXISTS competitor_quote_amount,
      DROP COLUMN IF EXISTS competitor_insurer,
      DROP COLUMN IF EXISTS quote_sent_at,
      DROP COLUMN IF EXISTS accepted_at,
      DROP COLUMN IF EXISTS emitted_at,
      DROP COLUMN IF EXISTS policy_number
  `);

  console.log('[MIGRATION 002] ⏪ KYC columns + competitor_quotes revertidos');
}
