/**
 * NNN_descripcion.js — Template para nuevas migraciones
 *
 * INSTRUCCIONES:
 * 1. Copia este archivo y nómbralo con el siguiente número: 002_mi_cambio.js
 * 2. Implementa up() con los cambios que quieres aplicar
 * 3. Implementa down() para revertir (en dev)
 * 4. El runner lo ejecutará automáticamente en el próximo boot
 *
 * REGLAS:
 * - up() debe ser idempotente (usar IF NOT EXISTS, IF EXISTS, ON CONFLICT)
 * - No borrar datos en up() sin confirmación explícita
 * - down() solo funciona en dev (NODE_ENV !== 'production')
 */

export async function up(db) {
  // Ejemplo: agregar columna
  // await db.run(`ALTER TABLE users ADD COLUMN IF NOT EXISTS new_field TEXT`);
  
  // Ejemplo: crear tabla
  // await db.run(`
  //   CREATE TABLE IF NOT EXISTS my_table (
  //     id   SERIAL PRIMARY KEY,
  //     name TEXT NOT NULL,
  //     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  //   )
  // `);
  
  console.log('[MIGRATION NNN] ✅ Aplicada');
}

export async function down(db) {
  // Revertir los cambios de up()
  // await db.run(`ALTER TABLE users DROP COLUMN IF EXISTS new_field`);
  // await db.run(`DROP TABLE IF EXISTS my_table`);
  
  console.log('[MIGRATION NNN] ⏪ Revertida');
}
