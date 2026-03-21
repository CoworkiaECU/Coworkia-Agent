/**
 * 📊 API Endpoints — Adriana Seguros Dashboard
 * Rutas para métricas y tabla de insurance_leads
 */

import express from 'express';
import databaseService from '../../database/database.js';
import { enviarWhatsApp } from './wassenger.js';

const router = express.Router();

// ── GET /api/adriana/leads ────────────────────────────────────────────────────
router.get('/leads', async (req, res) => {
  try {
    await databaseService.ensureInitialized();
    const { status, insuranceType, search, limit = 200, offset = 0 } = req.query;

    let query = `SELECT id, quote_code, insurance_type, client_name, email, phone,
                        vehicle_brand, vehicle_model, vehicle_year,
                        city, quoted_premium, status,
                        quote_sent_at, created_at
                 FROM insurance_leads WHERE 1=1`;
    const params = [];
    let i = 1;

    if (status)       { query += ` AND status = $${i++}`;          params.push(status); }
    if (insuranceType){ query += ` AND insurance_type ILIKE $${i++}`; params.push(`%${insuranceType}%`); }
    if (search) {
      query += ` AND (client_name ILIKE $${i} OR email ILIKE $${i} OR phone ILIKE $${i} OR quote_code ILIKE $${i} OR vehicle_model ILIKE $${i})`;
      params.push(`%${search}%`); i++;
    }

    query += ` ORDER BY created_at DESC LIMIT $${i++} OFFSET $${i++}`;
    params.push(parseInt(limit), parseInt(offset));

    const leads = await databaseService.all(query, params);
    return res.json({ ok: true, data: leads || [] });
  } catch (err) {
    console.error('[ADRIANA-API] Error leads:', err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// ── GET /api/adriana/leads-stats ──────────────────────────────────────────────
router.get('/leads-stats', async (req, res) => {
  try {
    await databaseService.ensureInitialized();

    const [total, thisMonth, thisWeek, byStatus, premiumRow] = await Promise.all([
      databaseService.get(`SELECT COUNT(*) as total FROM insurance_leads`),
      databaseService.get(`SELECT COUNT(*) as count FROM insurance_leads WHERE TO_CHAR(created_at,'YYYY-MM') = TO_CHAR(NOW(),'YYYY-MM')`),
      databaseService.get(`SELECT COUNT(*) as count FROM insurance_leads WHERE created_at >= NOW() - INTERVAL '7 days'`),
      databaseService.all(`SELECT status, COUNT(*) as count FROM insurance_leads GROUP BY status ORDER BY count DESC`),
      databaseService.get(`SELECT AVG(quoted_premium) as avg_premium, SUM(quoted_premium) as total_premium FROM insurance_leads WHERE status IN ('accepted') AND quoted_premium IS NOT NULL`),
    ]);

    return res.json({
      ok: true,
      data: {
        total:        total?.total || 0,
        thisMonth:    thisMonth?.count || 0,
        thisWeek:     thisWeek?.count || 0,
        byStatus:     byStatus || [],
        avgPremium:   parseFloat(premiumRow?.avg_premium || 0),
        totalPremium: parseFloat(premiumRow?.total_premium || 0),
      },
    });
  } catch (err) {
    console.error('[ADRIANA-API] Error stats:', err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// ── PATCH /api/adriana/leads/:code/status ────────────────────────────────────
router.patch('/leads/:code/status', async (req, res) => {
  try {
    await databaseService.ensureInitialized();
    const { code } = req.params;
    const { status, notes } = req.body;
    if (!status) return res.status(400).json({ ok: false, error: 'status requerido' });

    let query = `UPDATE insurance_leads SET status = $1, updated_at = CURRENT_TIMESTAMP`;
    const params = [status, code];
    if (notes) { query += `, notes = $3`; params.push(notes); }
    query += ` WHERE quote_code = $2`;

    await databaseService.run(query, params);
    return res.json({ ok: true });
  } catch (err) {
    console.error('[ADRIANA-API] Error patch:', err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// ── POST /api/adriana/leads/:code/send-wa ────────────────────────────────────
router.post('/leads/:code/send-wa', async (req, res) => {
  try {
    await databaseService.ensureInitialized();
    const l = await databaseService.get(
      `SELECT quote_code, client_name, phone, insurance_type, vehicle_brand, vehicle_model, vehicle_year, quoted_premium
       FROM insurance_leads WHERE quote_code = $1`,
      [req.params.code]
    );
    if (!l || !l.phone) return res.status(404).json({ ok: false, error: 'Lead no encontrado o sin teléfono' });

    const name    = (l.client_name || 'Hola').split(' ')[0];
    const vehicle = [l.vehicle_brand, l.vehicle_model, l.vehicle_year].filter(Boolean).join(' ') || 'tu vehículo';
    const tipo    = l.insurance_type || 'seguro';
    const premium = l.quoted_premium ? ` La cotización por *$${parseFloat(l.quoted_premium).toFixed(2)}* sigue vigente.` : '';
    const msg     = `Hola ${name} 👋\n\nTe escribo de SegPopular sobre el ${tipo.toLowerCase()} para *${vehicle}*.${premium}\n\n¿Puedo ayudarte con algo más o aclarar alguna duda? 📋`;

    await enviarWhatsApp(l.phone, msg);
    await databaseService.run(
      `UPDATE insurance_leads SET updated_at = CURRENT_TIMESTAMP WHERE quote_code = $1`,
      [req.params.code]
    );
    return res.json({ ok: true });
  } catch (err) {
    console.error('[ADRIANA-API] Error send-wa:', err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

export default router;
