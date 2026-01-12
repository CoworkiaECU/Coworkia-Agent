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

export default router;
