/**
 * 009_hot_desk_numbers.js
 *
 * Multi-hotdesk: persist assigned desk numbers as JSON.
 * Keeps hot_desk_number as the primary/fallback desk for compatibility.
 */

export const name = '009_hot_desk_numbers';

export async function up(db) {
  await db.run(`ALTER TABLE reservations ADD COLUMN IF NOT EXISTS hot_desk_numbers TEXT`);
}

export async function down(db) {
  await db.run(`ALTER TABLE reservations DROP COLUMN IF EXISTS hot_desk_numbers`);
}
