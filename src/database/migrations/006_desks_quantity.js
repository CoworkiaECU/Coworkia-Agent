/**
 * 006_desks_quantity.js
 * 
 * Multi-hot-desk: Allow a single reservation to book N hot desks.
 * "somos 3 personas, necesitamos 3 hot desks"
 */

export const name = '006_desks_quantity';

export async function up(db) {
  await db.run(`ALTER TABLE reservations ADD COLUMN IF NOT EXISTS desks_quantity INTEGER DEFAULT 1`);
}

export async function down(db) {
  await db.run(`ALTER TABLE reservations DROP COLUMN IF EXISTS desks_quantity`);
}
