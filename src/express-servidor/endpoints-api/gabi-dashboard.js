/**
 * 📊 API Endpoints - Gabi Financial Dashboard
 * 
 * Endpoints para métricas financieras y sistema de Gabi
 * 
 * @author Agente Copilot
 * @date 2026-01-12
 */

import express from 'express';
import gabiSystem from '../../servicios/gabi-financial-system.js';
import databaseService from '../../database/database.js';
import { enviarWhatsApp } from './wassenger.js';

const router = express.Router();

// ============================================================================
// MÉTRICAS FINANCIERAS
// ============================================================================

/**
 * GET /api/gabi/metrics/:period
 * Obtiene métricas financieras por período
 */
router.get('/metrics/:period?', async (req, res) => {
  try {
    const period = req.params.period || 'month'; // today, week, month, year
    
    if (!['today', 'week', 'month', 'year'].includes(period)) {
      return res.status(400).json({
        ok: false,
        error: 'Invalid period. Use: today, week, month, year'
      });
    }
    
    const metrics = await gabiSystem.getFinancialMetrics(period);
    
    return res.json({
      ok: true,
      data: metrics
    });
    
  } catch (error) {
    console.error('[GABI-API] Error en metrics:', error);
    return res.status(500).json({
      ok: false,
      error: error.message
    });
  }
});

/**
 * GET /api/gabi/top-users/:limit?
 * Obtiene ranking de usuarios más activos
 */
router.get('/top-users/:limit?', async (req, res) => {
  try {
    const limit = parseInt(req.params.limit) || 10;
    
    const topUsers = await gabiSystem.getTopGabiUsers(limit);
    
    return res.json({
      ok: true,
      data: topUsers,
      count: topUsers.length
    });
    
  } catch (error) {
    console.error('[GABI-API] Error en top-users:', error);
    return res.status(500).json({
      ok: false,
      error: error.message
    });
  }
});

/**
 * GET /api/gabi/meeting-metrics
 * Obtiene métricas de reuniones ofrecidas
 */
router.get('/meeting-metrics', async (req, res) => {
  try {
    const metrics = await gabiSystem.getMeetingMetrics();
    
    return res.json({
      ok: true,
      data: metrics
    });
    
  } catch (error) {
    console.error('[GABI-API] Error en meeting-metrics:', error);
    return res.status(500).json({
      ok: false,
      error: error.message
    });
  }
});

// ============================================================================
// INTERACCIONES INDIVIDUALES
// ============================================================================

/**
 * GET /api/gabi/user/:userId/interactions
 * Obtiene contador de interacciones de un usuario específico
 */
router.get('/user/:userId/interactions', async (req, res) => {
  try {
    const userId = req.params.userId;
    
    const count = await gabiSystem.getGabiInteractionCount(userId);
    const meetingStatus = await gabiSystem.shouldOfferMeeting(userId);
    
    return res.json({
      ok: true,
      data: {
        userId,
        interactionCount: count,
        meetingStatus
      }
    });
    
  } catch (error) {
    console.error('[GABI-API] Error en user interactions:', error);
    return res.status(500).json({
      ok: false,
      error: error.message
    });
  }
});

/**
 * POST /api/gabi/user/:userId/offer-meeting
 * Fuerza el ofrecimiento de reunión a un usuario
 */
router.post('/user/:userId/offer-meeting', async (req, res) => {
  try {
    const userId = req.params.userId;
    
    const count = await gabiSystem.getGabiInteractionCount(userId);
    const message = await gabiSystem.generateMeetingOffer(userId, count);
    
    // Solo genera el mensaje, no lo envía (para testing)
    return res.json({
      ok: true,
      data: {
        userId,
        interactionCount: count,
        message
      }
    });
    
  } catch (error) {
    console.error('[GABI-API] Error en offer-meeting:', error);
    return res.status(500).json({
      ok: false,
      error: error.message
    });
  }
});

// ============================================================================
// DASHBOARD COMPLETO
// ============================================================================

/**
 * GET /api/gabi/dashboard
 * Obtiene dashboard completo con todas las métricas
 */
router.get('/dashboard', async (req, res) => {
  try {
    const [
      metricsMonth,
      metricsWeek,
      topUsers,
      meetingMetrics
    ] = await Promise.all([
      gabiSystem.getFinancialMetrics('month'),
      gabiSystem.getFinancialMetrics('week'),
      gabiSystem.getTopGabiUsers(5),
      gabiSystem.getMeetingMetrics()
    ]);
    
    return res.json({
      ok: true,
      data: {
        month: metricsMonth,
        week: metricsWeek,
        topUsers,
        meetings: meetingMetrics,
        timestamp: Date.now()
      }
    });
    
  } catch (error) {
    console.error('[GABI-API] Error en dashboard:', error);
    return res.status(500).json({
      ok: false,
      error: error.message
    });
  }
});

// ============================================================================
// LEADS DE CONSULTORÍA (legal_leads)
// ============================================================================

/**
 * GET /api/gabi/leads
 * Lista completa de leads de consultoría con filtros opcionales
 *
 * Query params: status, consultationType, urgency, search, limit, offset
 */
router.get('/leads', async (req, res) => {
  try {
    await databaseService.initialize();

    const { status, consultationType, urgency, search, limit = 200, offset = 0 } = req.query;

    let query = `SELECT id, consultation_code, client_name, email, phone, company,
                        consultation_type, urgency, status, quote_amount, description,
                        meeting_scheduled, created_at, updated_at
                 FROM legal_leads WHERE 1=1`;
    const params = [];
    let i = 1;

    if (status) { query += ` AND status = $${i++}`; params.push(status); }
    if (consultationType) { query += ` AND consultation_type = $${i++}`; params.push(consultationType); }
    if (urgency) { query += ` AND urgency = $${i++}`; params.push(urgency); }
    if (search) {
      query += ` AND (client_name ILIKE $${i} OR email ILIKE $${i} OR company ILIKE $${i} OR consultation_code ILIKE $${i})`;
      params.push(`%${search}%`); i++;
    }

    query += ` ORDER BY created_at DESC LIMIT $${i++} OFFSET $${i++}`;
    params.push(parseInt(limit), parseInt(offset));

    const [leads, countRow] = await Promise.all([
      databaseService.all(query, params),
      databaseService.get(
        `SELECT COUNT(*) as total FROM legal_leads WHERE 1=1` +
        (status ? ` AND status = '${status.replace(/'/g,"''")}'` : '') +
        (consultationType ? ` AND consultation_type = '${consultationType.replace(/'/g,"''")}'` : '') +
        (urgency ? ` AND urgency = '${urgency.replace(/'/g,"''")}'` : ''),
        []
      ),
    ]);

    return res.json({ ok: true, data: leads || [], total: countRow?.total || 0 });

  } catch (error) {
    console.error('[GABI-API] Error en leads:', error);
    return res.status(500).json({ ok: false, error: error.message });
  }
});

// ── PATCH /api/gabi/leads/:code/status ────────────────────────────────────
router.patch('/leads/:code/status', async (req, res) => {
  try {
    await databaseService.initialize();
    const { code } = req.params;
    const { status } = req.body;
    if (!status) return res.status(400).json({ ok: false, error: 'status requerido' });
    await databaseService.run(
      `UPDATE legal_leads SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE consultation_code = $2`,
      [status, code]
    );
    return res.json({ ok: true });
  } catch (err) {
    console.error('[GABI-API] Error patch status:', err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// ── POST /api/gabi/leads/:code/send-wa ─────────────────────────────────────
router.post('/leads/:code/send-wa', async (req, res) => {
  try {
    await databaseService.initialize();
    const l = await databaseService.get(
      `SELECT consultation_code, client_name, phone, consultation_type, urgency, company
       FROM legal_leads WHERE consultation_code = $1`,
      [req.params.code]
    );
    if (!l || !l.phone) return res.status(404).json({ ok: false, error: 'Lead no encontrado o sin teléfono' });

    const _adminNorm = (process.env.ADMIN_PHONE || '').replace(/\D/g, '');
    if (_adminNorm && l.phone.replace(/\D/g, '') === _adminNorm) {
      return res.status(403).json({ ok: false, error: 'TEST_LEAD', message: 'No se envían mensajes del dashboard al teléfono de administrador' });
    }

    const name = (l.client_name || 'Hola').split(' ')[0];
    const tipo = l.consultation_type || 'consultoría';
    const empresa = l.company ? ` de *${l.company}*` : '';
    const msg  = `@gabi\nHola ${name} 👋\n\nSoy Gabi de GR Consulting. ¿Sigues interesado en la ${tipo.toLowerCase()}${empresa}?\n\nTengo espacio en agenda esta semana para retomar tu caso 📋`;

    await enviarWhatsApp(l.phone, msg);
    await databaseService.run(
      `UPDATE legal_leads SET updated_at = CURRENT_TIMESTAMP WHERE consultation_code = $1`,
      [req.params.code]
    );
    return res.json({ ok: true });
  } catch (err) {
    console.error('[GABI-API] Error send-wa:', err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

/**
 * GET /api/gabi/leads-stats
 * Estadísticas de consultoría desde legal_leads
 */
router.get('/leads-stats', async (req, res) => {
  try {
    await databaseService.initialize();

    const [total, byStatus, byType, revenueRow, thisMonth, thisWeek] = await Promise.all([
      databaseService.get(`SELECT COUNT(*) as total FROM legal_leads`),
      databaseService.all(`SELECT status, COUNT(*) as count FROM legal_leads GROUP BY status ORDER BY count DESC`),
      databaseService.all(`SELECT consultation_type, COUNT(*) as count FROM legal_leads GROUP BY consultation_type ORDER BY count DESC`),
      databaseService.get(
        `SELECT SUM(quote_amount) as total_revenue, AVG(quote_amount) as avg_fee
         FROM legal_leads WHERE status IN ('quote_sent','service_in_progress','completed') AND quote_amount IS NOT NULL`
      ),
      databaseService.get(
        `SELECT COUNT(*) as count FROM legal_leads WHERE TO_CHAR(created_at,'YYYY-MM') = TO_CHAR(NOW(),'YYYY-MM')`
      ),
      databaseService.get(
        `SELECT COUNT(*) as count FROM legal_leads WHERE created_at >= NOW() - INTERVAL '7 days'`
      ),
    ]);

    return res.json({
      ok: true,
      data: {
        total: total?.total || 0,
        thisMonth: thisMonth?.count || 0,
        thisWeek: thisWeek?.count || 0,
        byStatus: byStatus || [],
        byType: byType || [],
        revenue: {
          total: parseFloat(revenueRow?.total_revenue || 0),
          avg: parseFloat(revenueRow?.avg_fee || 0),
        },
      },
    });

  } catch (error) {
    console.error('[GABI-API] Error en leads-stats:', error);
    return res.status(500).json({ ok: false, error: error.message });
  }
});

export default router;
