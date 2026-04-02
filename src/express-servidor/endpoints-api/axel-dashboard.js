/**
 * 📊 API Endpoints — Axel Colisiones Dashboard
 * Rutas para métricas y tabla de collision_quotes
 */

import express from 'express';
import databaseService from '../../database/database.js';
import { enviarWhatsApp } from './wassenger.js';

const router = express.Router();

// ── GET /api/axel/quotes ──────────────────────────────────────────────────────
router.get('/quotes', async (req, res) => {
  res.set('Cache-Control', 'no-store');
  try {
    await databaseService.ensureInitialized();
    const { status, damageType, search, limit = 200, offset = 0 } = req.query;

    let query = `SELECT id, quote_code, damage_type, client_name, email, phone,
                        vehicle_brand, vehicle_model, vehicle_year,
                        price_min, price_max, currency, status,
                        quote_sent_at, created_at
                 FROM collision_quotes WHERE 1=1`;
    const params = [];
    let i = 1;

    if (status)     { query += ` AND status = $${i++}`;       params.push(status); }
    if (damageType) { query += ` AND damage_type ILIKE $${i++}`; params.push(`%${damageType}%`); }
    if (search) {
      query += ` AND (client_name ILIKE $${i} OR email ILIKE $${i} OR phone ILIKE $${i} OR quote_code ILIKE $${i} OR vehicle_brand ILIKE $${i} OR vehicle_model ILIKE $${i})`;
      params.push(`%${search}%`); i++;
    }

    query += ` ORDER BY created_at DESC LIMIT $${i++} OFFSET $${i++}`;
    params.push(parseInt(limit), parseInt(offset));

    const quotes = await databaseService.all(query, params);
    return res.json({ ok: true, data: quotes || [] });
  } catch (err) {
    console.error('[AXEL-API] Error quotes:', err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// ── GET /api/axel/quotes-stats ────────────────────────────────────────────────
router.get('/quotes-stats', async (req, res) => {
  res.set('Cache-Control', 'no-store');
  try {
    await databaseService.ensureInitialized();

    const [total, thisMonth, thisWeek, byStatus, avgRow] = await Promise.all([
      databaseService.get(`SELECT COUNT(*) as total FROM collision_quotes`),
      databaseService.get(`SELECT COUNT(*) as count FROM collision_quotes WHERE TO_CHAR(created_at,'YYYY-MM') = TO_CHAR(NOW(),'YYYY-MM')`),
      databaseService.get(`SELECT COUNT(*) as count FROM collision_quotes WHERE created_at >= NOW() - INTERVAL '7 days'`),
      databaseService.all(`SELECT status, COUNT(*) as count FROM collision_quotes GROUP BY status ORDER BY count DESC`),
      databaseService.get(`SELECT AVG((price_min + price_max) / 2.0) as avg_quote, SUM((price_min + price_max) / 2.0) as total_revenue FROM collision_quotes WHERE status IN ('accepted','in_progress','completed')`),
    ]);

    return res.json({
      ok: true,
      data: {
        total:     total?.total || 0,
        thisMonth: thisMonth?.count || 0,
        thisWeek:  thisWeek?.count || 0,
        byStatus:  byStatus || [],
        avgQuote:  parseFloat(avgRow?.avg_quote || 0),
        totalRevenue: parseFloat(avgRow?.total_revenue || 0),
      },
    });
  } catch (err) {
    console.error('[AXEL-API] Error stats:', err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// ── PATCH /api/axel/quotes/:code/status ──────────────────────────────────────
router.patch('/quotes/:code/status', async (req, res) => {
  try {
    await databaseService.ensureInitialized();
    const { code } = req.params;
    const { status, notes } = req.body;
    if (!status) return res.status(400).json({ ok: false, error: 'status requerido' });

    let query = `UPDATE collision_quotes SET status = $1, updated_at = CURRENT_TIMESTAMP`;
    const params = [status, code];
    if (notes) { query += `, notes = $3`; params.push(notes); }
    query += ` WHERE quote_code = $2`;

    await databaseService.run(query, params);
    return res.json({ ok: true });
  } catch (err) {
    console.error('[AXEL-API] Error patch:', err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// ── POST /api/axel/quotes/:code/send-reminder ─────────────────────────────────
router.post('/quotes/:code/send-reminder', async (req, res) => {
  try {
    await databaseService.ensureInitialized();
    const q = await databaseService.get(
      `SELECT quote_code, user_phone, phone, client_name, vehicle_brand, vehicle_model, vehicle_year, price_min, price_max
       FROM collision_quotes WHERE quote_code = $1`,
      [req.params.code]
    );
    if (!q) return res.status(404).json({ ok: false, error: 'Cotización no encontrada' });

    // phone = número real del cliente (boss quotes lo llenan desde quoteData.telefono)
    // user_phone = quién inició la sesión WA (puede ser ADMIN para boss quotes)
    const targetPhone = q.phone || q.user_phone;
    if (!targetPhone) return res.status(404).json({ ok: false, error: 'Lead sin teléfono de cliente' });

    const _adminNorm = (process.env.ADMIN_PHONE || '').replace(/\D/g, '');
    const _diegoNorm = (process.env.DIEGO_PERSONAL_PHONE || '').replace(/\D/g, '');
    const _targetNorm = targetPhone.replace(/\D/g, '');
    if ((_adminNorm && _targetNorm === _adminNorm) || (_diegoNorm && _targetNorm === _diegoNorm)) {
      return res.status(403).json({ ok: false, error: 'TEST_LEAD', message: 'Lead creado con teléfono de prueba — proporciona el teléfono del cliente en la cotización' });
    }

    const name = (q.client_name || 'Hola').split(' ')[0];
    const vehicle = [q.vehicle_brand, q.vehicle_model, q.vehicle_year].filter(Boolean).join(' ') || 'tu vehículo';
    const msg = `@axel\nHola ${name} 👋\n\n¿Quedó alguna duda sobre la cotización de *${vehicle}*?\n\nCuando quieras seguimos — 20 minutos y cerramos todo 📅`;

    await enviarWhatsApp(targetPhone, msg);
    await databaseService.run(
      `UPDATE collision_quotes SET reminder_1_sent_at = COALESCE(reminder_1_sent_at, CURRENT_TIMESTAMP), updated_at = CURRENT_TIMESTAMP WHERE quote_code = $1`,
      [req.params.code]
    );
    return res.json({ ok: true });
  } catch (err) {
    console.error('[AXEL-API] Error send-reminder:', err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

export default router;
