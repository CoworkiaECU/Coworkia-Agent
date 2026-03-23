/**
 * 🎯 ENZO Dashboard API - MarketingLab Proyectos
 * Endpoints para visualización de proyectos de marketing
 */

import express from 'express';
import enzoRepository from '../../database/enzoRepository.js';
import databaseService from '../../database/database.js';
import { enviarWhatsApp } from './wassenger.js';

const router = express.Router();

// ═══════════════════════════════════════════════════════════════════════════
// 📊 GET /api/enzo/dashboard — Dashboard completo
// ═══════════════════════════════════════════════════════════════════════════
router.get('/dashboard', async (req, res) => {
  try {
    await databaseService.ensureInitialized();

    // ─── MÉTRICAS DEL MES ───────────────────────────────────────────────────
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const monthProjects = await databaseService.all(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
        COUNT(CASE WHEN status = 'meeting_scheduled' THEN 1 END) as meetings,
        COUNT(CASE WHEN status = 'proposal_sent' THEN 1 END) as proposals,
        COUNT(CASE WHEN status = 'accepted' THEN 1 END) as accepted,
        SUM(CASE WHEN proposal_amount IS NOT NULL THEN proposal_amount ELSE 0 END) as revenue
      FROM marketing_leads
      WHERE created_at >= $1
    `, [monthStart.toISOString()]);

    // ─── MÉTRICAS DE LA SEMANA ──────────────────────────────────────────────
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 7);
    weekStart.setHours(0, 0, 0, 0);

    const weekProjects = await databaseService.all(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'accepted' THEN 1 END) as accepted
      FROM marketing_leads
      WHERE created_at >= $1
    `, [weekStart.toISOString()]);

    // ─── TOP PROYECTOS RECIENTES ────────────────────────────────────────────
    const topProjects = await databaseService.all(`
      SELECT 
        project_code,
        project_type,
        company,
        client_name,
        email,
        phone,
        budget_range,
        urgency,
        status,
        proposal_amount,
        created_at,
        updated_at
      FROM marketing_leads
      ORDER BY created_at DESC
      LIMIT 10
    `);

    // ─── PROYECTOS POR TIPO ─────────────────────────────────────────────────
    const projectsByType = await databaseService.all(`
      SELECT 
        project_type,
        COUNT(*) as count
      FROM marketing_leads
      GROUP BY project_type
      ORDER BY count DESC
    `);

    // ─── Top clientes con múltiples proyectos ────────────────────────────────
    const topClients = await databaseService.all(`
      SELECT 
        company,
        client_name,
        user_phone,
        COUNT(*) as project_count,
        MAX(created_at) as last_project
      FROM marketing_leads
      WHERE company IS NOT NULL
      GROUP BY company, client_name, user_phone
      HAVING COUNT(*) > 1
      ORDER BY project_count DESC, last_project DESC
      LIMIT 5
    `);

    // ─── RESPONSE ───────────────────────────────────────────────────────────
    res.json({
      success: true,
      data: {
        month: {
          totalProjects: monthProjects[0]?.total || 0,
          pending: monthProjects[0]?.pending || 0,
          meetings: monthProjects[0]?.meetings || 0,
          proposals: monthProjects[0]?.proposals || 0,
          accepted: monthProjects[0]?.accepted || 0,
          revenue: monthProjects[0]?.revenue || 0
        },
        week: {
          totalProjects: weekProjects[0]?.total || 0,
          accepted: weekProjects[0]?.accepted || 0
        },
        topProjects,
        projectsByType,
        topClients
      }
    });

  } catch (error) {
    console.error('[ENZO-DASHBOARD] ❌ Error:', error);
    res.status(500).json({
      success: false,
      error: 'Error al cargar dashboard de Enzo'
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// 📋 GET /api/enzo/projects — Todos los proyectos (con filtros)
// ═══════════════════════════════════════════════════════════════════════════
router.get('/projects', async (req, res) => {
  try {
    await databaseService.ensureInitialized();

    const { status, projectType, urgency, search } = req.query;
    
    let query = `SELECT * FROM marketing_leads WHERE 1=1`;
    const params = [];
    let paramIndex = 1;

    if (status) {
      query += ` AND status = $${paramIndex++}`;
      params.push(status);
    }

    if (projectType) {
      query += ` AND project_type = $${paramIndex++}`;
      params.push(projectType);
    }

    if (urgency) {
      query += ` AND urgency = $${paramIndex++}`;
      params.push(urgency);
    }

    if (search) {
      query += ` AND (company ILIKE $${paramIndex} OR client_name ILIKE $${paramIndex} OR email ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    query += ` ORDER BY created_at DESC`;

    const projects = await databaseService.all(query, params);

    res.json({
      success: true,
      data: projects
    });

  } catch (error) {
    console.error('[ENZO-PROJECTS] ❌ Error:', error);
    res.status(500).json({
      success: false,
      error: 'Error al cargar proyectos'
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// 📊 GET /api/enzo/stats — Estadísticas generales
// ═══════════════════════════════════════════════════════════════════════════
router.get('/stats', async (req, res) => {
  try {
    const stats = await enzoRepository.getMarketingLeadsStats();
    
    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('[ENZO-STATS] ❌ Error:', error);
    res.status(500).json({
      success: false,
      error: 'Error al cargar estadísticas'
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// PATCH /api/enzo/projects/:code/status
// ═══════════════════════════════════════════════════════════════════════════
router.patch('/projects/:code/status', async (req, res) => {
  try {
    await databaseService.ensureInitialized();
    const { code } = req.params;
    const { status } = req.body;
    if (!status) return res.status(400).json({ ok: false, error: 'status requerido' });
    await databaseService.run(
      `UPDATE marketing_leads SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE project_code = $2`,
      [status, code]
    );
    return res.json({ ok: true });
  } catch (err) {
    console.error('[ENZO-API] Error patch status:', err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// POST /api/enzo/projects/:code/send-reminder
// ═══════════════════════════════════════════════════════════════════════════
router.post('/projects/:code/send-reminder', async (req, res) => {
  try {
    await databaseService.ensureInitialized();
    const p = await databaseService.get(
      `SELECT project_code, client_name, user_phone, phone, project_type, company, proposal_amount
       FROM marketing_leads WHERE project_code = $1`,
      [req.params.code]
    );
    if (!p) return res.status(404).json({ ok: false, error: 'Proyecto no encontrado' });

    // phone = número real del cliente; user_phone = creador (puede ser ADMIN para boss quotes)
    const targetPhone = p.phone || p.user_phone;
    if (!targetPhone) return res.status(404).json({ ok: false, error: 'Lead sin teléfono de cliente' });

    const _adminNorm = (process.env.ADMIN_PHONE || '').replace(/\D/g, '');
    if (_adminNorm && targetPhone.replace(/\D/g, '') === _adminNorm) {
      return res.status(403).json({ ok: false, error: 'TEST_LEAD', message: 'Lead creado con teléfono de prueba — proporciona el teléfono del cliente en la cotización' });
    }

    const name    = (p.client_name || 'Hola').split(' ')[0];
    const tipo    = p.project_type || 'proyecto de marketing';
    const empresa = p.company ? ` para *${p.company}*` : '';
    const propuesta = p.proposal_amount ? `\n\nLa propuesta por *$${parseFloat(p.proposal_amount).toFixed(2)}* sigue en pie.` : '';
    const msg = `@enzo\nHola ${name} 👋\n\n¿Seguimos adelante con el ${tipo.toLowerCase()}${empresa}?${propuesta}\n\nCuando quieras coordinamos — 20 minutos y definimos los próximos pasos 🚀`;

    await enviarWhatsApp(targetPhone, msg);
    await databaseService.run(
      `UPDATE marketing_leads SET updated_at = CURRENT_TIMESTAMP WHERE project_code = $1`,
      [req.params.code]
    );
    return res.json({ ok: true });
  } catch (err) {
    console.error('[ENZO-API] Error send-reminder:', err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// POST /api/enzo/leads/:code/send-followup
// Disparar manualmente el follow-up D+1, D+3 o D+7 para un lead específico
// Body: { day: 'd1' | 'd3' | 'd7' }
// ═══════════════════════════════════════════════════════════════════════════
router.post('/leads/:code/send-followup', async (req, res) => {
  try {
    await databaseService.ensureInitialized();
    const { day: dayParam } = req.body;
    const leadForDay = await databaseService.get(
      `SELECT followup_d1_sent_at, followup_d3_sent_at, followup_d7_sent_at FROM marketing_leads WHERE project_code = $1`,
      [req.params.code]
    );
    const day = dayParam || (!leadForDay?.followup_d1_sent_at ? 'd1' : !leadForDay?.followup_d3_sent_at ? 'd3' : 'd7');
    if (!['d1', 'd3', 'd7'].includes(day)) {
      return res.status(400).json({ ok: false, error: 'day debe ser d1, d3 o d7' });
    }

    const lead = await databaseService.get(
      `SELECT project_code, client_name, user_phone, phone, email, project_type,
              company, proposal_amount, followup_d1_sent_at, followup_d3_sent_at,
              followup_d7_sent_at
       FROM marketing_leads WHERE project_code = $1`,
      [req.params.code]
    );
    if (!lead) return res.status(404).json({ ok: false, error: 'Lead no encontrado' });

    // phone = número real del cliente; user_phone = creador de sesión (puede ser ADMIN en boss quotes)
    const targetPhone = lead.phone || lead.user_phone;
    if (!targetPhone) return res.status(422).json({ ok: false, error: 'NO_CLIENT_PHONE', message: 'Este lead no tiene teléfono de cliente registrado' });

    const _adminNorm = (process.env.ADMIN_PHONE || '').replace(/\D/g, '');
    if (_adminNorm && targetPhone.replace(/\D/g, '') === _adminNorm) {
      return res.status(403).json({ ok: false, error: 'TEST_LEAD', message: 'Lead creado con teléfono de prueba — proporciona el teléfono del cliente en la cotización' });
    }

    const name    = (lead.client_name || 'Hola').split(' ')[0];
    const tipo    = lead.project_type || 'proyecto digital';

    const waMessages = {
      d1: `@enzo\nHola ${name} 👋\n\nQuería hacer seguimiento de tu *${tipo}* con MarketingLab.\n\n¿Tienes alguna pregunta sobre la propuesta? Estoy aquí para ayudarte.\n\n_Enzo — MarketingLab_`,
      d3: `@enzo\n${name}, tenemos una oferta especial *SOLO HOY*:\n\n🎁 *15% de descuento* en tu primer proyecto con MarketingLab.\n\nEsta oferta vence hoy a las 23:59. ¿Te interesa?\n\nResponde *SI* y te mando los detalles al instante 🚀`,
      d7: `@enzo\n${name}, ¿sabías que una empresa similar a la tuya creció *300% en 3 meses* con nuestra estrategia digital? 📈\n\nMe encantaría contarte cómo lo logramos.\n\n¿Tienes 15 minutos esta semana para una llamada rápida?`,
    };

    await enviarWhatsApp(targetPhone, waMessages[day]);
    const col = `followup_${day}_sent_at`;
    await databaseService.run(
      `UPDATE marketing_leads SET ${col} = NOW(), updated_at = NOW() WHERE project_code = $1`,
      [lead.project_code]
    );

    return res.json({ ok: true, day, phone: lead.user_phone });
  } catch (err) {
    console.error('[ENZO-API] Error send-followup:', err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

export default router;
