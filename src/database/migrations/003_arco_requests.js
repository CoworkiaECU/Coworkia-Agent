/**
 * 003_arco_requests.js — Tabla LOPDP para solicitudes de derechos ARCO
 *
 * Crea la tabla arco_requests para registrar solicitudes de:
 *  - Acceso: el titular quiere saber qué datos tiene Coworkia sobre él
 *  - Rectificación: corregir datos incorrectos
 *  - Cancelación: borrar datos (derecho al olvido)
 *  - Oposición: oponerse al tratamiento de sus datos
 *
 * Cumplimiento: Ley Orgánica de Protección de Datos Personales (LOPDP) Ecuador
 * Plazo legal de respuesta: 15 días hábiles
 */

export async function up(db) {
  await db.run(`
    CREATE TABLE IF NOT EXISTS arco_requests (
      id             SERIAL PRIMARY KEY,
      request_type   VARCHAR(20) NOT NULL CHECK (request_type IN ('acceso','rectificacion','cancelacion','oposicion')),
      full_name      VARCHAR(200) NOT NULL,
      email          VARCHAR(200) NOT NULL,
      phone          VARCHAR(50),
      description    TEXT,
      status         VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','resolved')),
      resolved_at    TIMESTAMPTZ,
      notes          TEXT,
      created_at     TIMESTAMPTZ DEFAULT NOW(),
      updated_at     TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await db.run(`
    CREATE INDEX IF NOT EXISTS idx_arco_requests_email ON arco_requests (email);
  `);

  await db.run(`
    CREATE INDEX IF NOT EXISTS idx_arco_requests_status ON arco_requests (status);
  `);

  console.log('[MIGRATION 003] ✅ Tabla arco_requests creada (LOPDP compliance)');
}

export async function down(db) {
  await db.run(`DROP TABLE IF EXISTS arco_requests`);
  console.log('[MIGRATION 003] ⬇️ Tabla arco_requests eliminada');
}
