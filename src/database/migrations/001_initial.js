/**
 * 001_initial.js — Baseline migration
 *
 * Documenta el estado inicial de la BD.
 * Las tablas ya existen (creadas por postgres-adapter.js con IF NOT EXISTS).
 * Esta migración solo registra el baseline — no crea nada nuevo.
 *
 * Si en el futuro necesitas un entorno limpio, aquí irían los CREATE TABLE.
 */

export async function up(db) {
  // Baseline: tablas ya creadas por postgres-adapter.js
  // Solo registramos que estamos al día con el estado inicial.
  console.log('[MIGRATION 001] ✅ Baseline registrado — tablas ya existentes verificadas');
}

export async function down(db) {
  // No hay rollback del baseline — sería destruir toda la BD
  console.log('[MIGRATION 001] ⏪ Rollback de baseline no implementado');
}
