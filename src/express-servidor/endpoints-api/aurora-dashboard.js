/**
 * 📊 API Endpoints - Aurora Reservations Dashboard
 * 
 * Endpoints para visualizar historial de reservas gestionadas por Aurora
 * 
 * @author Aurora Core
 * @date 2026-03-09
 */

import express from 'express';
import databaseService from '../../database/database.js';

const router = express.Router();

// ============================================================================
// RESERVAS
// ============================================================================

/**
 * GET /api/aurora/reservations
 * Obtiene lista completa de reservas
 * 
 * Query params:
 * - status: Filtrar por estado (confirmed, pending, cancelled, etc.)
 * - serviceType: Filtrar por tipo (hotDesk, meetingRoom)
 * - date: Filtrar por fecha específica
 * - limit: Número de resultados (default: 100)
 * - offset: Para paginación (default: 0)
 */
router.get('/reservations', async (req, res) => {
  try {
    await databaseService.ensureInitialized();
    
    const { status, serviceType, date, limit = 100, offset = 0 } = req.query;
    
    let query = `
      SELECT 
        r.id,
        r.user_phone,
        u.name as user_name,
        r.service_type,
        r.date,
        r.start_time,
        r.end_time,
        r.duration_hours,
        r.guest_count,
        r.total_price,
        r.was_free,
        r.status,
        r.payment_status,
        r.payment_method,
        r.hot_desk_number,
        r.created_at,
        r.confirmed_at
      FROM reservations r
      LEFT JOIN users u ON r.user_phone = u.phone_number
      WHERE 1=1
    `;
    
    const params = [];
    let paramIndex = 1;
    
    if (status) {
      query += ` AND r.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }
    
    if (serviceType) {
      query += ` AND r.service_type = $${paramIndex}`;
      params.push(serviceType);
      paramIndex++;
    }
    
    if (date) {
      query += ` AND r.date = $${paramIndex}`;
      params.push(date);
      paramIndex++;
    }
    
    query += ` ORDER BY r.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(parseInt(limit), parseInt(offset));
    
    const reservations = await databaseService.all(query, params);
    
    // Total count para paginación
    let countQuery = 'SELECT COUNT(*) as total FROM reservations WHERE 1=1';
    const countParams = [];
    let countParamIndex = 1;
    
    if (status) {
      countQuery += ` AND status = $${countParamIndex}`;
      countParams.push(status);
      countParamIndex++;
    }
    
    if (serviceType) {
      countQuery += ` AND service_type = $${countParamIndex}`;
      countParams.push(serviceType);
      countParamIndex++;
    }
    
    if (date) {
      countQuery += ` AND date = $${countParamIndex}`;
      countParams.push(date);
    }
    
    const countResult = await databaseService.get(countQuery, countParams);
    
    return res.json({
      ok: true,
      data: reservations,
      total: countResult?.total || 0,
      showing: reservations.length,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
    
  } catch (error) {
    console.error('[AURORA-API] Error en reservations:', error);
    return res.status(500).json({
      ok: false,
      error: error.message
    });
  }
});

/**
 * GET /api/aurora/stats
 * Obtiene estadísticas generales de reservas
 */
router.get('/stats', async (req, res) => {
  try {
    await databaseService.ensureInitialized();
    
    // Total reservas
    const totalResult = await databaseService.get(
      `SELECT COUNT(*) as total FROM reservations`
    );
    
    // Por estado
    const byStatus = await databaseService.all(
      `SELECT status, COUNT(*) as count 
       FROM reservations 
       GROUP BY status 
       ORDER BY count DESC`
    );
    
    // Por tipo de servicio
    const byType = await databaseService.all(
      `SELECT service_type, COUNT(*) as count 
       FROM reservations 
       GROUP BY service_type 
       ORDER BY count DESC`
    );
    
    // Revenue
    const revenueResult = await databaseService.get(
      `SELECT 
        SUM(total_price) as total,
        AVG(total_price) as average,
        SUM(CASE WHEN was_free = true THEN 1 ELSE 0 END) as free_count,
        SUM(CASE WHEN was_free = false THEN 1 ELSE 0 END) as paid_count
       FROM reservations 
       WHERE status IN ('confirmed', 'completed')`
    );
    
    // Reservas recientes (últimos 7 días)
    const recentResult = await databaseService.get(
      `SELECT COUNT(*) as count 
       FROM reservations 
       WHERE created_at >= NOW() - INTERVAL '7 days'`
    );
    
    // Reservas este mes
    const thisMonthResult = await databaseService.get(
      `SELECT COUNT(*) as count 
       FROM reservations 
       WHERE TO_CHAR(created_at, 'YYYY-MM') = TO_CHAR(NOW(), 'YYYY-MM')`
    );
    
    // Próximas reservas confirmadas
    const upcomingResult = await databaseService.get(
      `SELECT COUNT(*) as count 
       FROM reservations 
       WHERE status = 'confirmed' 
       AND date >= CURRENT_DATE`
    );
    
    return res.json({
      ok: true,
      data: {
        total: totalResult?.total || '0',
        byStatus: byStatus || [],
        byType: byType || [],
        revenue: {
          total: parseFloat(revenueResult?.total || 0),
          average: parseFloat(revenueResult?.average || 0),
          freeCount: parseInt(revenueResult?.free_count || 0),
          paidCount: parseInt(revenueResult?.paid_count || 0)
        },
        recent: {
          last7Days: recentResult?.count || '0',
          thisMonth: thisMonthResult?.count || '0',
          upcoming: upcomingResult?.count || '0'
        }
      }
    });
    
  } catch (error) {
    console.error('[AURORA-API] Error en stats:', error);
    return res.status(500).json({
      ok: false,
      error: error.message
    });
  }
});

/**
 * GET /api/aurora/prospects/abandoned
 * Usuarios que interactuaron con Aurora pero nunca concretaron una reserva.
 * Ordenados por cantidad de mensajes (más interacción = mayor prioridad de seguimiento).
 */
router.get('/prospects/abandoned', async (req, res) => {
  try {
    await databaseService.ensureInitialized();

    const prospects = await databaseService.all(`
      SELECT
        i.user_phone,
        u.name              AS user_name,
        COUNT(i.id)         AS interaction_count,
        MAX(i.timestamp)    AS last_interaction,
        MIN(i.timestamp)    AS first_interaction,
        EXTRACT(DAY FROM NOW() - MAX(i.timestamp)) AS days_since_last,
        CASE
          WHEN COUNT(i.id) >= 5 THEN 'hot'
          WHEN COUNT(i.id) >= 3 THEN 'warm'
          ELSE 'cold'
        END                 AS engagement
      FROM interactions i
      LEFT JOIN users u ON u.phone_number = i.user_phone
      WHERE i.agent = 'AURORA'
        AND i.user_phone NOT IN (
          SELECT DISTINCT user_phone FROM reservations
          WHERE status IN ('confirmed', 'completed', 'active')
        )
      GROUP BY i.user_phone, u.name
      HAVING COUNT(i.id) >= 1
      ORDER BY interaction_count DESC, last_interaction DESC
      LIMIT 100
    `);

    const total   = prospects.length;
    const hot     = prospects.filter(p => p.engagement === 'hot').length;
    const warm    = prospects.filter(p => p.engagement === 'warm').length;
    const cold    = prospects.filter(p => p.engagement === 'cold').length;

    return res.json({ ok: true, data: prospects, stats: { total, hot, warm, cold } });
  } catch (error) {
    console.error('[AURORA-API] Error en abandoned prospects:', error);
    return res.status(500).json({ ok: false, error: error.message });
  }
});

/**
 * GET /api/aurora/reservations/:reservationId
 * Obtiene detalle de una reserva específica
 */
router.get('/reservations/:reservationId', async (req, res) => {
  try {
    await databaseService.ensureInitialized();
    
    const { reservationId } = req.params;
    
    const reservation = await databaseService.get(
      `SELECT r.*, u.name as user_name, u.email as user_email
       FROM reservations r
       LEFT JOIN users u ON r.user_phone = u.phone_number
       WHERE r.id = $1`,
      [reservationId]
    );
    
    if (!reservation) {
      return res.status(404).json({
        ok: false,
        error: 'Reserva no encontrada'
      });
    }
    
    return res.json({
      ok: true,
      data: reservation
    });
    
  } catch (error) {
    console.error('[AURORA-API] Error en reservation detail:', error);
    return res.status(500).json({
      ok: false,
      error: error.message
    });
  }
});

/**
 * GET /api/aurora/conversations
 * Retorna resumen de conversaciones agrupadas por usuario.
 * Con ?phone=XXXXXX retorna el hilo completo de mensajes de ese usuario.
 */
router.get('/conversations', async (req, res) => {
  try {
    await databaseService.ensureInitialized();

    const { phone, limit = 100 } = req.query;

    if (phone) {
      const messages = await databaseService.all(
        `SELECT role, content, agent, timestamp
         FROM conversation_history
         WHERE user_phone = $1
         ORDER BY timestamp ASC`,
        [phone]
      );
      return res.json({ ok: true, data: messages });
    }

    const summaries = await databaseService.all(
      `SELECT
         ch.user_phone,
         u.name            AS user_name,
         COUNT(ch.id)      AS message_count,
         MAX(ch.timestamp) AS last_message,
         MIN(ch.timestamp) AS first_message,
         array_agg(DISTINCT ch.agent) FILTER (WHERE ch.agent IS NOT NULL) AS agents,
         (SELECT content FROM conversation_history c2
          WHERE c2.user_phone = ch.user_phone
          ORDER BY timestamp DESC LIMIT 1) AS last_content
       FROM conversation_history ch
       LEFT JOIN users u ON u.phone_number = ch.user_phone
       GROUP BY ch.user_phone, u.name
       ORDER BY last_message DESC
       LIMIT $1`,
      [parseInt(limit)]
    );

    return res.json({ ok: true, data: summaries, total: summaries.length });
  } catch (error) {
    console.error('[AURORA-API] Error en conversations:', error);
    return res.status(500).json({ ok: false, error: error.message });
  }
});

export default router;
