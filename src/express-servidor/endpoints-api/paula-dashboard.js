/**
 * 📊 API Endpoints — Paula Inmobiliaria Dashboard
 * Rutas para métricas y tabla de real_estate_leads
 */

import express from 'express';
import databaseService from '../../database/database.js';
import { enviarWhatsApp } from './wassenger.js';

const router = express.Router();

// ── GET /api/paula/leads ──────────────────────────────────────────────────────
router.get('/leads', async (req, res) => {
  try {
    await databaseService.ensureInitialized();
    const { status, operationType, zone, search, limit = 200, offset = 0 } = req.query;

    let query = `SELECT id, operation_type, property_type, preferred_zone, budget_range,
                        client_name, email, phone, status, requirements,
                        viewing_scheduled, created_at, updated_at
                 FROM real_estate_leads WHERE 1=1`;
    const params = [];
    let i = 1;

    if (status)        { query += ` AND status = $${i++}`;           params.push(status); }
    if (operationType) { query += ` AND operation_type = $${i++}`;   params.push(operationType); }
    if (zone)          { query += ` AND preferred_zone ILIKE $${i++}`; params.push(`%${zone}%`); }
    if (search) {
      query += ` AND (client_name ILIKE $${i} OR email ILIKE $${i} OR phone ILIKE $${i} OR property_type ILIKE $${i})`;
      params.push(`%${search}%`); i++;
    }

    query += ` ORDER BY created_at DESC LIMIT $${i++} OFFSET $${i++}`;
    params.push(parseInt(limit), parseInt(offset));

    const leads = await databaseService.all(query, params);
    return res.json({ ok: true, data: leads || [] });
  } catch (err) {
    console.error('[PAULA-API] Error leads:', err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// ── GET /api/paula/leads-stats ────────────────────────────────────────────────
router.get('/leads-stats', async (req, res) => {
  try {
    await databaseService.ensureInitialized();

    const [total, thisMonth, thisWeek, byStatus, byOp] = await Promise.all([
      databaseService.get(`SELECT COUNT(*) as total FROM real_estate_leads`),
      databaseService.get(`SELECT COUNT(*) as count FROM real_estate_leads WHERE TO_CHAR(created_at,'YYYY-MM') = TO_CHAR(NOW(),'YYYY-MM')`),
      databaseService.get(`SELECT COUNT(*) as count FROM real_estate_leads WHERE created_at >= NOW() - INTERVAL '7 days'`),
      databaseService.all(`SELECT status, COUNT(*) as count FROM real_estate_leads GROUP BY status ORDER BY count DESC`),
      databaseService.all(`SELECT operation_type, COUNT(*) as count FROM real_estate_leads GROUP BY operation_type ORDER BY count DESC`),
    ]);

    return res.json({
      ok: true,
      data: {
        total:     total?.total || 0,
        thisMonth: thisMonth?.count || 0,
        thisWeek:  thisWeek?.count || 0,
        byStatus:  byStatus || [],
        byOp:      byOp || [],
      },
    });
  } catch (err) {
    console.error('[PAULA-API] Error stats:', err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// ── PATCH /api/paula/leads/:id/status ────────────────────────────────────────
router.patch('/leads/:id/status', async (req, res) => {
  try {
    await databaseService.ensureInitialized();
    const { id } = req.params;
    const { status, notes } = req.body;
    if (!status) return res.status(400).json({ ok: false, error: 'status requerido' });

    let query = `UPDATE real_estate_leads SET status = $1, updated_at = CURRENT_TIMESTAMP`;
    const params = [status, id];
    if (notes) { query += `, notes = $3`; params.push(notes); }
    query += ` WHERE id = $2`;

    await databaseService.run(query, params);
    return res.json({ ok: true });
  } catch (err) {
    console.error('[PAULA-API] Error patch:', err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// ── POST /api/paula/leads/:id/send-wa ─────────────────────────────────────────
router.post('/leads/:id/send-wa', async (req, res) => {
  try {
    await databaseService.ensureInitialized();
    const l = await databaseService.get(
      `SELECT id, client_name, phone, operation_type, property_type, preferred_zone, budget_range
       FROM real_estate_leads WHERE id = $1`,
      [req.params.id]
    );
    if (!l || !l.phone) return res.status(404).json({ ok: false, error: 'Lead no encontrado o sin teléfono' });

    const name = (l.client_name || 'Hola').split(' ')[0];
    const op   = l.operation_type || 'propiedad';
    const zone = l.preferred_zone || 'tu zona de interés';
    const msg  = `Hola ${name} 👋\n\n¿Seguimos buscando tu ${op.toLowerCase()} en *${zone}*?\n\nTengo algunas opciones nuevas que podrían interesarte 🏠`;

    await enviarWhatsApp(l.phone, msg);
    await databaseService.run(
      `UPDATE real_estate_leads SET updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [req.params.id]
    );
    return res.json({ ok: true });
  } catch (err) {
    console.error('[PAULA-API] Error send-wa:', err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

export default router;
