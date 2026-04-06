/**
 * 📡 API Endpoints — Portal Cautivo WiFi Dashboard
 *
 * Endpoints públicos (admin dashboard) para visualizar y gestionar códigos WiFi.
 * Separados de wifi-codes.js que es API de sincronización con Mac Mini (auth-gated).
 */

import express from 'express';
import databaseService from '../../database/database.js';
import { generateWifiCode, generateMembershipWifiCode } from '../../servicios/wifi-codes-service.js';

const router = express.Router();

// ============================================================================
// GET /api/portalwifi/stats
// Stats generales para las cards del dashboard
// ============================================================================
router.get('/api/portalwifi/stats', async (req, res) => {
  try {
    await databaseService.initialize();

    // Stats por status
    const statusRows = await databaseService.all(
      `SELECT status, COUNT(*)::int AS count FROM wifi_codes GROUP BY status`,
      []
    );
    const byStatus = {};
    let total = 0;
    for (const r of statusRows) {
      byStatus[r.status] = r.count;
      total += r.count;
    }

    // Códigos generados hoy
    const todayRow = await databaseService.get(
      `SELECT COUNT(*)::int AS count FROM wifi_codes
       WHERE created_at::date = CURRENT_DATE`,
      []
    );

    // Códigos válidos para hoy (disponibles o sincronizados)
    const activeRow = await databaseService.get(
      `SELECT COUNT(*)::int AS count FROM wifi_codes
       WHERE valid_for_date = CURRENT_DATE
         AND status IN ('available', 'synced')`,
      []
    );

    // Expirados hoy
    const expiredTodayRow = await databaseService.get(
      `SELECT COUNT(*)::int AS count FROM wifi_codes
       WHERE status = 'expired'
         AND valid_for_date = CURRENT_DATE`,
      []
    );

    return res.json({
      ok: true,
      stats: {
        byStatus,
        total,
        generatedToday: todayRow?.count || 0,
        activeToday: activeRow?.count || 0,
        expiredToday: expiredTodayRow?.count || 0
      }
    });
  } catch (err) {
    console.error('[PortalWiFi-API] ❌ Error en GET /stats:', err.message);
    return res.status(500).json({ ok: false, error: 'Error interno' });
  }
});

// ============================================================================
// GET /api/portalwifi/sessions
// Lista de códigos/sesiones WiFi con filtros
// Query: ?status=available&date=2026-04-06&limit=50&offset=0
// ============================================================================
router.get('/api/portalwifi/sessions', async (req, res) => {
  try {
    await databaseService.initialize();

    const status = req.query.status || null;
    const date = req.query.date || null;
    const limit = Math.min(Math.max(parseInt(req.query.limit || '50', 10), 1), 200);
    const offset = Math.max(parseInt(req.query.offset || '0', 10), 0);

    const conditions = [];
    const params = [];
    let paramIdx = 1;

    if (status) {
      conditions.push(`wc.status = $${paramIdx++}`);
      params.push(status);
    }
    if (date) {
      conditions.push(`wc.valid_for_date = $${paramIdx++}`);
      params.push(date);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const rows = await databaseService.all(
      `SELECT wc.id, wc.code, wc.user_phone, wc.duration_hours, wc.valid_for_date,
              wc.status, wc.created_at, wc.synced_at, wc.used_at,
              wc.reservation_id, wc.membership_code,
              u.name AS user_name
       FROM wifi_codes wc
       LEFT JOIN users u ON u.phone_number = wc.user_phone
       ${where}
       ORDER BY wc.created_at DESC
       LIMIT $${paramIdx++} OFFSET $${paramIdx++}`,
      [...params, limit, offset]
    );

    const countRow = await databaseService.get(
      `SELECT COUNT(*)::int AS count FROM wifi_codes wc ${where}`,
      params
    );

    return res.json({
      ok: true,
      sessions: rows || [],
      total: countRow?.count || 0,
      limit,
      offset
    });
  } catch (err) {
    console.error('[PortalWiFi-API] ❌ Error en GET /sessions:', err.message);
    return res.status(500).json({ ok: false, error: 'Error interno' });
  }
});

// ============================================================================
// POST /api/portalwifi/generate
// Generar código WiFi manual desde dashboard admin
// Body: { user_phone, duration_hours, valid_for_date?, reservation_id?, membership_code? }
// ============================================================================
router.post('/api/portalwifi/generate', async (req, res) => {
  try {
    await databaseService.initialize();

    const { user_phone, duration_hours, valid_for_date, reservation_id, membership_code } = req.body || {};

    if (!user_phone) {
      return res.status(400).json({ ok: false, error: 'user_phone es requerido' });
    }

    const dateStr = valid_for_date || new Date().toISOString().split('T')[0];
    const hours = Math.max(1, Math.min(parseInt(duration_hours || '8', 10), 744));

    let result;
    if (membership_code) {
      result = await generateMembershipWifiCode({
        membershipCode: membership_code,
        userPhone: user_phone,
        membershipType: 'Plan Full',
        startDate: dateStr
      });
    } else {
      result = await generateWifiCode({
        reservationId: reservation_id || null,
        userPhone: user_phone,
        durationHours: hours,
        validForDate: dateStr
      });
    }

    if (!result.success) {
      return res.status(400).json({ ok: false, error: result.error });
    }

    console.log(`[PortalWiFi-API] ✅ Código generado manualmente: ${result.code} para ${user_phone}`);
    return res.json({ ok: true, ...result });
  } catch (err) {
    console.error('[PortalWiFi-API] ❌ Error en POST /generate:', err.message);
    return res.status(500).json({ ok: false, error: 'Error interno' });
  }
});

// ============================================================================
// PATCH /api/portalwifi/revoke/:id
// Revocar/cancelar un código WiFi desde dashboard admin
// ============================================================================
router.patch('/api/portalwifi/revoke/:id', async (req, res) => {
  try {
    await databaseService.initialize();

    const { id } = req.params;
    if (!id) return res.status(400).json({ ok: false, error: 'id requerido' });

    const existing = await databaseService.get(
      `SELECT id, status FROM wifi_codes WHERE id = $1`,
      [id]
    );

    if (!existing) {
      return res.status(404).json({ ok: false, error: 'Código no encontrado' });
    }
    if (existing.status === 'cancelled' || existing.status === 'expired') {
      return res.status(400).json({ ok: false, error: `Código ya está ${existing.status}` });
    }

    await databaseService.run(
      `UPDATE wifi_codes SET status = 'cancelled' WHERE id = $1`,
      [id]
    );

    console.log(`[PortalWiFi-API] ❌ Código ${id} revocado desde dashboard`);
    return res.json({ ok: true, revoked: id });
  } catch (err) {
    console.error('[PortalWiFi-API] ❌ Error en PATCH /revoke:', err.message);
    return res.status(500).json({ ok: false, error: 'Error interno' });
  }
});

export default router;
