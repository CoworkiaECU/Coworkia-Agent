/**
 * 📊 API Endpoints - Aluna Proformas Dashboard
 * 
 * Endpoints para visualizar historial de proformas de membresías enviadas
 * 
 * @author Aurora Core
 * @date 2026-03-09
 */

import express from 'express';
import databaseService from '../../database/database.js';

const router = express.Router();

// ============================================================================
// PROFORMAS DE MEMBRESÍAS
// ============================================================================

/**
 * GET /api/aluna/proformas
 * Obtiene lista completa de proformas enviadas
 * 
 * Query params:
 * - status: Filtrar por estado (quoted, pending, active, cancelled, etc.)
 * - limit: Número de resultados (default: 100)
 * - offset: Para paginación (default: 0)
 */
router.get('/proformas', async (req, res) => {
  try {
    await databaseService.ensureInitialized();
    
    const { status, limit = 100, offset = 0 } = req.query;
    
    let query = `
      SELECT 
        id,
        membership_code,
        user_phone,
        membership_type,
        start_date,
        client_name,
        email,
        phone,
        company_name,
        monthly_fee,
        status,
        special_requirements,
        quote_sent_at,
        created_at,
        updated_at
      FROM membership_leads
    `;
    
    const params = [];
    
    // Filtrar por status si se proporciona
    if (status) {
      query += ` WHERE status = $1`;
      params.push(status);
    }
    
    // Ordenar por más recientes primero
    query += ` ORDER BY created_at DESC`;
    
    // Limitar resultados
    query += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(parseInt(limit), parseInt(offset));
    
    const proformas = await databaseService.all(query, params);
    
    // Obtener total count
    const countQuery = status 
      ? `SELECT COUNT(*) as total FROM membership_leads WHERE status = $1`
      : `SELECT COUNT(*) as total FROM membership_leads`;
    const countParams = status ? [status] : [];
    const countResult = await databaseService.get(countQuery, countParams);
    
    return res.json({
      ok: true,
      data: proformas,
      total: countResult?.total || 0,
      showing: proformas.length,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
    
  } catch (error) {
    console.error('[ALUNA-API] Error en proformas:', error);
    return res.status(500).json({
      ok: false,
      error: error.message
    });
  }
});

/**
 * GET /api/aluna/proformas/:membershipCode
 * Obtiene detalle de una proforma específica
 */
router.get('/proformas/:membershipCode', async (req, res) => {
  try {
    await databaseService.ensureInitialized();
    
    const { membershipCode } = req.params;
    
    const proforma = await databaseService.get(
      `SELECT * FROM membership_leads WHERE membership_code = $1`,
      [membershipCode]
    );
    
    if (!proforma) {
      return res.status(404).json({
        ok: false,
        error: 'Proforma no encontrada'
      });
    }
    
    return res.json({
      ok: true,
      data: proforma
    });
    
  } catch (error) {
    console.error('[ALUNA-API] Error en proforma detail:', error);
    return res.status(500).json({
      ok: false,
      error: error.message
    });
  }
});

/**
 * GET /api/aluna/stats
 * Obtiene estadísticas generales de proformas
 */
router.get('/stats', async (req, res) => {
  try {
    await databaseService.ensureInitialized();
    
    // Total proformas enviadas
    const totalResult = await databaseService.get(
      `SELECT COUNT(*) as total FROM membership_leads`
    );
    
    // Por estado
    const byStatus = await databaseService.all(
      `SELECT status, COUNT(*) as count FROM membership_leads GROUP BY status ORDER BY count DESC`
    );
    
    // Por tipo de membresía
    const byType = await databaseService.all(
      `SELECT membership_type, COUNT(*) as count FROM membership_leads GROUP BY membership_type ORDER BY count DESC`
    );
    
    // Revenue potencial (suma de monthly_fee de proformas activas)
    const revenueResult = await databaseService.get(
      `SELECT 
        SUM(monthly_fee) as total_potential,
        AVG(monthly_fee) as avg_fee
      FROM membership_leads 
      WHERE status IN ('quoted', 'pending', 'active')`
    );
    
    // Proformas de últimos 7 días
    const recent = await databaseService.get(
      `SELECT COUNT(*) as count FROM membership_leads 
       WHERE created_at >= NOW() - INTERVAL '7 days'`
    );
    
    // Proformas del mes actual
    const thisMonth = await databaseService.get(
      `SELECT COUNT(*) as count FROM membership_leads 
       WHERE TO_CHAR(created_at, 'YYYY-MM') = TO_CHAR(NOW(), 'YYYY-MM')`
    );
    
    return res.json({
      ok: true,
      data: {
        total: totalResult?.total || 0,
        byStatus: byStatus || [],
        byType: byType || [],
        revenue: {
          potential: parseFloat(revenueResult?.total_potential || 0),
          avgFee: parseFloat(revenueResult?.avg_fee || 0)
        },
        recent: {
          last7Days: recent?.count || 0,
          thisMonth: thisMonth?.count || 0
        }
      }
    });
    
  } catch (error) {
    console.error('[ALUNA-API] Error en stats:', error);
    return res.status(500).json({
      ok: false,
      error: error.message
    });
  }
});

/**
 * GET /api/aluna/dashboard
 * Dashboard completo con todas las métricas y últimas proformas
 */
router.get('/dashboard', async (req, res) => {
  try {
    await databaseService.ensureInitialized();
    
    // Obtener estadísticas
    const statsResponse = await router.handle({ 
      query: {}, 
      params: {}, 
      path: '/stats' 
    }, {
      json: (data) => data,
      status: () => ({ json: (data) => data })
    });
    
    // Últimas 20 proformas
    const recentProformas = await databaseService.all(
      `SELECT 
        id,
        membership_code,
        client_name,
        email,
        membership_type,
        monthly_fee,
        status,
        created_at
      FROM membership_leads
      ORDER BY created_at DESC
      LIMIT 20`
    );
    
    return res.json({
      ok: true,
      data: {
        stats: statsResponse?.data || {},
        recentProformas: recentProformas || [],
        timestamp: Date.now()
      }
    });
    
  } catch (error) {
    console.error('[ALUNA-API] Error en dashboard:', error);
    return res.status(500).json({
      ok: false,
      error: error.message
    });
  }
});

export default router;
