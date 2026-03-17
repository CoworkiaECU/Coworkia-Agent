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

    // ── Stats (inline, same logic as /stats) ───────────────────────────────
    const [totalResult, byStatus, byType, revenueResult, recent, thisMonth, recentProformas] =
      await Promise.all([
        databaseService.get(`SELECT COUNT(*) as total FROM membership_leads`),
        databaseService.all(
          `SELECT status, COUNT(*) as count FROM membership_leads GROUP BY status ORDER BY count DESC`
        ),
        databaseService.all(
          `SELECT membership_type, COUNT(*) as count FROM membership_leads GROUP BY membership_type ORDER BY count DESC`
        ),
        databaseService.get(
          `SELECT SUM(monthly_fee) as total_potential, AVG(monthly_fee) as avg_fee
           FROM membership_leads WHERE status IN ('quoted', 'pending', 'active')`
        ),
        databaseService.get(
          `SELECT COUNT(*) as count FROM membership_leads WHERE created_at >= NOW() - INTERVAL '7 days'`
        ),
        databaseService.get(
          `SELECT COUNT(*) as count FROM membership_leads WHERE TO_CHAR(created_at,'YYYY-MM') = TO_CHAR(NOW(),'YYYY-MM')`
        ),
        databaseService.all(
          `SELECT id, membership_code, client_name, email, membership_type, monthly_fee, status, created_at
           FROM membership_leads ORDER BY created_at DESC LIMIT 20`
        ),
      ]);

    return res.json({
      ok: true,
      data: {
        stats: {
          total: totalResult?.total || 0,
          byStatus: byStatus || [],
          byType: byType || [],
          revenue: {
            potential: parseFloat(revenueResult?.total_potential || 0),
            avgFee: parseFloat(revenueResult?.avg_fee || 0),
          },
          recent: {
            last7Days: recent?.count || 0,
            thisMonth: thisMonth?.count || 0,
          },
        },
        recentProformas: recentProformas || [],
        timestamp: Date.now(),
      },
    });

  } catch (error) {
    console.error('[ALUNA-API] Error en dashboard:', error);
    return res.status(500).json({
      ok: false,
      error: error.message
    });
  }
});

/**
 * GET /api/aluna/pipeline
 * Pipeline de seguimiento de prospectos (24h, 3d, convertidos)
 */
router.get('/pipeline', async (req, res) => {
  try {
    await databaseService.ensureInitialized();

    const [total, pending24h, pending3d, converted, recent] = await Promise.all([
      databaseService.get(`SELECT COUNT(*) as total FROM aluna_prospect_followups WHERE converted_at IS NULL`),
      databaseService.get(`SELECT COUNT(*) as total FROM aluna_prospect_followups
        WHERE followup_24h_sent_at IS NULL AND converted_at IS NULL
          AND interest_at <= NOW() - INTERVAL '24 hours'`),
      databaseService.get(`SELECT COUNT(*) as total FROM aluna_prospect_followups
        WHERE followup_24h_sent_at IS NOT NULL AND followup_3d_sent_at IS NULL AND converted_at IS NULL
          AND followup_24h_sent_at <= NOW() - INTERVAL '72 hours'`),
      databaseService.get(`SELECT COUNT(*) as total FROM aluna_prospect_followups WHERE converted_at IS NOT NULL`),
      databaseService.all(`
        SELECT user_phone, user_name, membership_type, membership_code, email,
               interest_at, followup_24h_sent_at, followup_3d_sent_at,
               followup_24h_email_sent_at, followup_3d_email_sent_at, converted_at
        FROM aluna_prospect_followups
        ORDER BY interest_at DESC LIMIT 50
      `)
    ]);

    // Classify each prospect by temperature
    const classified = (recent || []).map(p => {
      let temperature = 'cold';
      if (p.converted_at) {
        temperature = 'hot';
      } else if (p.followup_3d_sent_at && !p.converted_at) {
        temperature = 'cold';
      } else if (p.followup_24h_sent_at && !p.followup_3d_sent_at) {
        temperature = 'warm';
      } else if (!p.followup_24h_sent_at) {
        const hoursSince = (Date.now() - new Date(p.interest_at).getTime()) / (1000 * 3600);
        temperature = hoursSince < 24 ? 'hot' : 'warm';
      }
      return { ...p, temperature };
    });

    return res.json({
      ok: true,
      data: {
        activeProspects: parseInt(total?.total || 0),
        readyFor24h: parseInt(pending24h?.total || 0),
        readyFor3d: parseInt(pending3d?.total || 0),
        converted: parseInt(converted?.total || 0),
        prospects: classified
      }
    });

  } catch (error) {
    console.error('[ALUNA-API] Error en pipeline:', error);
    return res.status(500).json({ ok: false, error: error.message });
  }
});

/**
 * POST /api/aluna/prospect/:phone/convert
 * Marca un prospecto como convertido manualmente desde el dashboard
 */
router.post('/prospect/:phone/convert', async (req, res) => {
  try {
    await databaseService.ensureInitialized();
    const { phone } = req.params;
    const result = await databaseService.run(
      `UPDATE aluna_prospect_followups
          SET converted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE user_phone = $1 AND converted_at IS NULL`,
      [phone]
    );
    return res.json({ ok: true, message: 'Prospecto marcado como convertido' });
  } catch (error) {
    console.error('[ALUNA-API] Error convirtiendo prospecto:', error);
    return res.status(500).json({ ok: false, error: error.message });
  }
});

/**
 * POST /api/aluna/prospect/:phone/sendwa
 * Envía el WA de seguimiento correspondiente de inmediato (acción manual)
 * Envía mensaje 24h si no se ha enviado aún, o mensaje 3d si ya pasó el 24h
 */
router.post('/prospect/:phone/sendwa', async (req, res) => {
  try {
    await databaseService.ensureInitialized();
    const { phone } = req.params;

    const prospect = await databaseService.get(
      `SELECT * FROM aluna_prospect_followups WHERE user_phone = $1`,
      [phone]
    );
    if (!prospect) {
      return res.status(404).json({ ok: false, error: 'Prospecto no encontrado' });
    }

    const WASSENGER_TOKEN = process.env.WASSENGER_TOKEN;
    const WASSENGER_DEVICE_ID = process.env.WASSENGER_DEVICE_ID;
    if (!WASSENGER_TOKEN || !WASSENGER_DEVICE_ID) {
      return res.status(500).json({ ok: false, error: 'Credenciales Wassenger no configuradas' });
    }

    const name = (prospect.user_name || '').split(' ')[0] || 'Hola';
    const plan = prospect.membership_type ? `*${prospect.membership_type}*` : 'los planes de membresía';

    let message, followUpType;
    if (!prospect.followup_24h_sent_at) {
      followUpType = '24h_manual';
      message = `Hola ${name} 🌙\n\nQuería hacer seguimiento sobre ${plan} que estuviste revisando 😊\n\n¿Tienes alguna duda o necesitas más detalles?\n\nY si quieres conocer el espacio antes de decidir, *te invito a venir un día completo sin ningún costo* — de *8am a 7pm*, usas todo como si ya fuera tu oficina 🏢✨\n\nSin compromiso. ¿Cuándo te quedaría bien?`;
    } else {
      followUpType = '3d_manual';
      message = `Hola ${name} 👋\n\n¿Cómo estás? Hace unos días charlamos sobre ${plan} y quería hacer un último acercamiento 😊\n\n*Mi propuesta:* ven a Coworkia un día completo, completamente gratis.\n\n📍 Sin costo, de *8am a 7pm* — WiFi, café, hot desk, sala de reuniones.\nSolo di en recepción que eres invitada/o de Aluna 🏢\n\n¿Qué día de esta semana te queda bien? 🗓️`;
    }

    const waResponse = await fetch('https://api.wassenger.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Token': WASSENGER_TOKEN },
      body: JSON.stringify({ phone, message, device: WASSENGER_DEVICE_ID })
    });
    if (!waResponse.ok) throw new Error(`Wassenger error: ${waResponse.status}`);

    const updateField = followUpType === '24h_manual' ? 'followup_24h_sent_at' : 'followup_3d_sent_at';
    await databaseService.run(
      `UPDATE aluna_prospect_followups SET ${updateField} = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE user_phone = $1`,
      [phone]
    );

    return res.json({ ok: true, message: `WA enviado (${followUpType})`, type: followUpType });
  } catch (error) {
    console.error('[ALUNA-API] Error enviando WA manual:', error);
    return res.status(500).json({ ok: false, error: error.message });
  }
});

export default router;
