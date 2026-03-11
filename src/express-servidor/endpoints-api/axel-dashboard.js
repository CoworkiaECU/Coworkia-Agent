/**
 * 📊 API Endpoints — Axel Colisiones Dashboard
 * Rutas para métricas y tabla de collision_quotes
 */

import express from 'express';
import databaseService from '../../database/database.js';

const router = express.Router();

// ── GET /api/axel/quotes ──────────────────────────────────────────────────────
router.get('/quotes', async (req, res) => {
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

export default router;
