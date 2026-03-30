/**
 * 005_duration_hours_decimal.js
 * 
 * Fix: duration_hours was INTEGER but meeting room reservations can have
 * fractional hours (e.g. 5.5h). Change to NUMERIC(4,1) to support decimals.
 * 
 * Bug: "Error guardando la reserva" — PostgreSQL rejected 5.5 for INTEGER column.
 */

export async function up(db) {
  await db.run(`ALTER TABLE reservations ALTER COLUMN duration_hours TYPE NUMERIC(4,1)`);
}

export async function down(db) {
  await db.run(`ALTER TABLE reservations ALTER COLUMN duration_hours TYPE INTEGER USING ROUND(duration_hours)::INTEGER`);
}
