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
    await databaseService.initialize();
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
    await databaseService.initialize();

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
    await databaseService.initialize();
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
    await databaseService.initialize();
    const l = await databaseService.get(
      `SELECT id, client_name, phone, operation_type, property_type, preferred_zone, budget_range
       FROM real_estate_leads WHERE id = $1`,
      [req.params.id]
    );
    if (!l || !l.phone) return res.status(404).json({ ok: false, error: 'Lead no encontrado o sin teléfono' });

    const _adminNorm = (process.env.ADMIN_PHONE || '').replace(/\D/g, '');
    if (_adminNorm && l.phone.replace(/\D/g, '') === _adminNorm) {
      return res.status(403).json({ ok: false, error: 'TEST_LEAD', message: 'No se envían mensajes del dashboard al teléfono de administrador' });
    }

    const name = (l.client_name || 'Hola').split(' ')[0];
    const op   = l.operation_type || 'propiedad';
    const zone = l.preferred_zone || 'tu zona de interés';
    const msg  = `@paula\nHola ${name} 👋\n\n¿Seguimos buscando tu ${op.toLowerCase()} en *${zone}*?\n\nTengo algunas opciones nuevas que podrían interesarte 🏠`;

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

// ── GET /api/paula/seed-demo ──────────────────────────────────────────────────
router.get('/seed-demo', async (req, res) => {
  try {
    await databaseService.initialize();
    console.log('🎭 [PAULA] Iniciando seed de leads demo...');

    const DEMO_LEADS = [
      { id: 'RE-DEMO-001', phone: '+593980001001', name: 'Fernanda Gavilánez',    email: 'fernanda.gavilanez@gmail.com',    op: 'Compra',   type: 'Casa',            zone: 'Cumbayá',         budget: '$120,000 - $180,000', status: 'pending',           daysAgo: 1  },
      { id: 'RE-DEMO-002', phone: '+593980001002', name: 'Paúl Gavilánez',        email: 'paul.gavilanez@gmail.com',         op: 'Arriendo', type: 'Departamento',    zone: 'La Carolina',     budget: '$700 - $1,000/mes',   status: 'pending',           daysAgo: 2  },
      { id: 'RE-DEMO-003', phone: '+593980001003', name: 'Camila Torres',          email: 'camila.torres@hotmail.com',        op: 'Compra',   type: 'Departamento',    zone: 'González Suárez', budget: '$90,000 - $130,000',  status: 'searching',         daysAgo: 5  },
      { id: 'RE-DEMO-004', phone: '+593980001004', name: 'Andrés Méndez',          email: 'andres.mendez@outlook.com',        op: 'Compra',   type: 'Terreno',         zone: 'Tumbaco',         budget: '$40,000 - $70,000',   status: 'searching',         daysAgo: 7  },
      { id: 'RE-DEMO-005', phone: '+593980001005', name: 'Valeria Ríos',           email: 'valeria.rios@yahoo.com',           op: 'Arriendo', type: 'Oficina',         zone: 'Iñaquito',        budget: '$800 - $1,200/mes',   status: 'viewing_scheduled', daysAgo: 3  },
      { id: 'RE-DEMO-006', phone: '+593980001006', name: 'Santiago Vargas',        email: 'santiago.vargas@live.com',         op: 'Compra',   type: 'Casa',            zone: 'Los Chillos',     budget: '$85,000 - $120,000',  status: 'viewing_scheduled', daysAgo: 4  },
      { id: 'RE-DEMO-007', phone: '+593980001007', name: 'Isabella Paredes',       email: 'isabella.paredes@gmail.com',       op: 'Compra',   type: 'Departamento',    zone: 'Quito Norte',     budget: '$95,000 - $140,000',  status: 'negotiating',       daysAgo: 9  },
      { id: 'RE-DEMO-008', phone: '+593980001008', name: 'Joaquín Herrera',        email: 'joaquin.herrera@icloud.com',       op: 'Compra',   type: 'Local comercial', zone: 'Centro Norte',    budget: '$200,000 - $400,000', status: 'negotiating',       daysAgo: 12 },
      { id: 'RE-DEMO-009', phone: '+593980001009', name: 'Mariana Castillo',       email: 'mariana.castillo@gmail.com',       op: 'Compra',   type: 'Casa Jardín #6',  zone: 'El Morenal',      budget: '$320,000 - $360,000', status: 'offer_made',        daysAgo: 15 },
      { id: 'RE-DEMO-010', phone: '+593980001010', name: 'Rodrigo Salazar',        email: 'rodrigo.salazar@hotmail.com',      op: 'Arriendo', type: 'Casa',            zone: 'Conocoto',        budget: '$400 - $600/mes',     status: 'closed',            daysAgo: 25 },
    ];

    let inserted = 0;
    for (const l of DEMO_LEADS) {
      const createdAt = new Date();
      createdAt.setDate(createdAt.getDate() - l.daysAgo);

      // FK: ensure user exists
      await databaseService.run(
        `INSERT INTO users (phone_number, name, email, first_visit, free_trial_used)
         VALUES ($1, $2, $3, false, false)
         ON CONFLICT (phone_number) DO UPDATE SET name = EXCLUDED.name, email = EXCLUDED.email`,
        [l.phone, l.name, l.email]
      );

      const result = await databaseService.run(
        `INSERT INTO real_estate_leads
           (id, user_phone, client_name, email, phone, operation_type, property_type, preferred_zone, budget_range, status, notes, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         ON CONFLICT (id) DO NOTHING`,
        [l.id, l.phone, l.name, l.email, l.phone, l.op, l.type, l.zone, l.budget, l.status, 'DEMO SEED', createdAt.toISOString()]
      );
      if (result?.rowCount > 0 || result?.changes > 0) inserted++;
    }

    console.log(`✅ [PAULA] ${inserted} leads demo insertados`);
    return res.json({ ok: true, inserted, total: DEMO_LEADS.length });
  } catch (err) {
    console.error('[PAULA-API] Error seed-demo:', err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

export default router;
