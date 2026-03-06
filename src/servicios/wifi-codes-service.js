/**
 * 📡 Servicio de Códigos WiFi — Coworkia Agent
 *
 * Aurora genera un código WiFi por cada reserva pagada (o gratuita).
 * El Mac Mini del Coworkia sincroniza estos códigos cada 5 min via API REST.
 *
 * Flujo completo:
 *   Reserva confirmada → generateWifiCode() → guarda en PostgreSQL
 *   → código enviado al usuario (WhatsApp + email)
 *   → Mac Mini llama GET /api/wifi-codes/pending → descarga códigos nuevos
 *   → Mac Mini llama POST /api/wifi-codes/confirm-sync → marca como 'synced'
 *   → Usuario llega, ingresa código en portal cautivo → Mac Mini valida
 *   → Cron 00:00 Ecuador → expireCodesForDate() limpia y genera frescos
 */

import { randomBytes } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import databaseService from '../database/database.js';

// ---------------------------------------------------------------------------
// 🔑 Generación de códigos — criptográficamente segura
// Formato: XXXX-XXXX  (solo caracteres no ambiguos)
// ---------------------------------------------------------------------------
const CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sin 0,1,O,I,l

function generateSingleCode() {
  const bytes = randomBytes(8); // 8 bytes de entropía real
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += CHARSET[bytes[i] % CHARSET.length];
  }
  return `${code.slice(0, 4)}-${code.slice(4)}`;
}

export function validateCodeFormat(code) {
  return /^[A-Z2-9]{4}-[A-Z2-9]{4}$/.test(String(code || '').toUpperCase());
}

// ---------------------------------------------------------------------------
// 🆙 Generar y guardar un código WiFi para una reserva
// ---------------------------------------------------------------------------
/**
 * Genera un código WiFi asociado a una reserva.
 *
 * @param {object} params
 * @param {string}  params.reservationId  - ID de la reserva
 * @param {string}  params.userPhone      - Teléfono del usuario (WhatsApp)
 * @param {number}  params.durationHours  - Horas de validez del código (≥ 2)
 * @param {string}  params.validForDate   - Fecha de la reserva 'YYYY-MM-DD'
 * @returns {Promise<{success: boolean, code?: string, id?: string, error?: string}>}
 */
export async function generateWifiCode({ reservationId, userPhone, durationHours = 2, validForDate }) {
  if (!userPhone || !validForDate) {
    return { success: false, error: 'Faltan parámetros requeridos (userPhone, validForDate)' };
  }

  // Intentar hasta 5 veces en caso de colisión de código (extremadamente raro)
  let attempts = 0;
  while (attempts < 5) {
    const code = generateSingleCode();
    const id = uuidv4();

    try {
      await databaseService.run(
        `INSERT INTO wifi_codes
           (id, code, reservation_id, user_phone, duration_hours, valid_for_date, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, 'available', CURRENT_TIMESTAMP)`,
        [id, code, reservationId || null, userPhone, Math.max(2, Number(durationHours)), validForDate]
      );

      console.log(`[WiFi-Codes] ✅ Código generado: ${code} (${durationHours}h, fecha: ${validForDate})`);
      return { success: true, code, id, durationHours, validForDate };

    } catch (err) {
      if (err?.code === '23505' || err?.message?.includes('unique') || err?.message?.includes('UNIQUE')) {
        // Colisión de código — intentar de nuevo
        attempts++;
        console.warn(`[WiFi-Codes] ⚠️ Colisión de código, reintentando (${attempts}/5)`);
        continue;
      }
      console.error('[WiFi-Codes] ❌ Error al guardar código WiFi:', err);
      return { success: false, error: err.message };
    }
  }

  return { success: false, error: 'No se pudo generar un código único después de 5 intentos' };
}

// ---------------------------------------------------------------------------
// 🔍 Obtener código existente para una reserva (evita duplicados)
// ---------------------------------------------------------------------------
export async function getWifiCodeForReservation(reservationId) {
  try {
    const row = await databaseService.get(
      `SELECT id, code, duration_hours, valid_for_date, status, created_at
       FROM wifi_codes
       WHERE reservation_id = ?
         AND status NOT IN ('cancelled', 'expired')
       ORDER BY created_at DESC
       LIMIT 1`,
      [reservationId]
    );
    return row || null;
  } catch (err) {
    console.error('[WiFi-Codes] Error buscando código por reserva:', err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// 📥 Obtener códigos pendientes de sincronización (para Mac Mini)
// Devuelve todos con status = 'available' (no sincronizados aún)
// ---------------------------------------------------------------------------
export async function getPendingCodes(sinceMinutes = 60) {
  try {
    const rows = await databaseService.all(
      `SELECT id, code, reservation_id, user_phone, duration_hours, valid_for_date, created_at
       FROM wifi_codes
       WHERE status = 'available'
         AND created_at >= (CURRENT_TIMESTAMP - INTERVAL '${parseInt(sinceMinutes)} minutes')
       ORDER BY created_at ASC`,
      []
    );
    return rows || [];
  } catch (err) {
    console.error('[WiFi-Codes] Error obteniendo códigos pendientes:', err);
    return [];
  }
}

// ---------------------------------------------------------------------------
// ✅ Marcar códigos como sincronizados (Mac Mini confirma descarga)
// ---------------------------------------------------------------------------
export async function markCodesAsSynced(codeIds) {
  if (!Array.isArray(codeIds) || codeIds.length === 0) return { updated: 0 };

  try {
    // Construir placeholders: $1, $2, ...
    const placeholders = codeIds.map((_, i) => `$${i + 1}`).join(', ');

    // databaseService usa ? como placeholder, así que usamos raw query
    // Para PostgreSQL necesitamos usar la sintaxis directa
    await databaseService.run(
      `UPDATE wifi_codes
       SET status = 'synced', synced_at = CURRENT_TIMESTAMP
       WHERE id IN (${placeholders})
         AND status = 'available'`,
      codeIds
    );

    console.log(`[WiFi-Codes] ✅ ${codeIds.length} códigos marcados como 'synced'`);
    return { updated: codeIds.length };
  } catch (err) {
    console.error('[WiFi-Codes] Error marcando códigos como sincronizados:', err);
    return { updated: 0, error: err.message };
  }
}

// ---------------------------------------------------------------------------
// 🌙 Limpieza nocturna — expira todos los códigos del día anterior
// Se ejecuta a las 00:00 Ecuador (cron-scheduler.js)
// ---------------------------------------------------------------------------
export async function expireCodesForDate(date) {
  try {
    const result = await databaseService.run(
      `UPDATE wifi_codes
       SET status = 'expired'
       WHERE valid_for_date = ?
         AND status IN ('available', 'synced')`,
      [date]
    );

    console.log(`[WiFi-Codes] 🌙 Códigos expirados para fecha ${date}`);
    return { success: true };
  } catch (err) {
    console.error('[WiFi-Codes] Error expirando códigos:', err);
    return { success: false, error: err.message };
  }
}

// ---------------------------------------------------------------------------
// ❌ Cancelar código de una reserva (si la reserva se cancela)
// ---------------------------------------------------------------------------
export async function cancelWifiCodeForReservation(reservationId) {
  if (!reservationId) return;
  try {
    await databaseService.run(
      `UPDATE wifi_codes
       SET status = 'cancelled'
       WHERE reservation_id = ?
         AND status IN ('available', 'synced')`,
      [reservationId]
    );
    console.log(`[WiFi-Codes] ❌ Código cancelado para reserva: ${reservationId}`);
  } catch (err) {
    console.error('[WiFi-Codes] Error cancelando código:', err);
  }
}

// ---------------------------------------------------------------------------
// 📊 Stats para admin / healthcheck
// ---------------------------------------------------------------------------
export async function getWifiCodesStats() {
  try {
    const rows = await databaseService.all(
      `SELECT status, COUNT(*) as count
       FROM wifi_codes
       GROUP BY status`,
      []
    );

    const stats = { available: 0, synced: 0, used: 0, expired: 0, cancelled: 0, total: 0 };
    for (const row of rows) {
      stats[row.status] = parseInt(row.count, 10);
      stats.total += parseInt(row.count, 10);
    }
    return stats;
  } catch (err) {
    return { error: err.message };
  }
}

export default {
  generateWifiCode,
  getWifiCodeForReservation,
  getPendingCodes,
  markCodesAsSynced,
  expireCodesForDate,
  cancelWifiCodeForReservation,
  getWifiCodesStats,
  validateCodeFormat
};
