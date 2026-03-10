/**
 * 🎯 ENZO Dashboard API - MarketingLab Proyectos
 * Endpoints para visualización de proyectos de marketing
 */

import express from 'express';
import enzoRepository from '../../database/enzoRepository.js';
import databaseService from '../../database/database.js';

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

export default router;
