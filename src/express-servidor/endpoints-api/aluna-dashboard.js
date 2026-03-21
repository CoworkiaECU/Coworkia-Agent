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
        followup_24h_sent_at,
        followup_3d_sent_at,
        automation_d1_sent,
        automation_d3_sent,
        last_interaction_at,
        client_response_at,
        client_whatsapp_reply,
        client_email_reply,
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
 * Obtiene estadísticas generales de proformas + métricas de efectividad de follow-ups
 * 
 * Incluye:
 * - Total leads (últimos 7d, 30d)
 * - % D+1 enviados
 * - % D+3 enviados
 * - % Clientes que respondieron después de follow-ups
 * - Tasa de conversión
 * - Stats generales de proformas (legacy)
 */
router.get('/stats', async (req, res) => {
  try {
    await databaseService.ensureInitialized();
    
    // ── MÉTRICAS DE FOLLOW-UPS (nuevas - BLOQUE 2) ──────────────────────────
    
    // Total leads en pipeline de follow-ups (últimos 7 y 30 días)
    const leadsLast7d = await databaseService.get(
      `SELECT COUNT(*) as count FROM aluna_prospect_followups 
       WHERE interest_at >= NOW() - INTERVAL '7 days'`
    );
    
    const leadsLast30d = await databaseService.get(
      `SELECT COUNT(*) as count FROM aluna_prospect_followups 
       WHERE interest_at >= NOW() - INTERVAL '30 days'`
    );
    
    // Total prospectos en pipeline (no convertidos)
    const totalProspectsResult = await databaseService.get(
      `SELECT COUNT(*) as total FROM aluna_prospect_followups WHERE converted_at IS NULL`
    );
    const totalProspects = parseInt(totalProspectsResult?.total || 0);
    
    // D+1 enviados (WhatsApp o Email)
    const d1SentResult = await databaseService.get(
      `SELECT COUNT(*) as count FROM aluna_prospect_followups 
       WHERE (followup_24h_sent_at IS NOT NULL OR followup_24h_email_sent_at IS NOT NULL)
         AND converted_at IS NULL`
    );
    const d1Sent = parseInt(d1SentResult?.count || 0);
    
    // D+3 enviados (WhatsApp o Email)
    const d3SentResult = await databaseService.get(
      `SELECT COUNT(*) as count FROM aluna_prospect_followups 
       WHERE (followup_3d_sent_at IS NOT NULL OR followup_3d_email_sent_at IS NOT NULL)
         AND converted_at IS NULL`
    );
    const d3Sent = parseInt(d3SentResult?.count || 0);
    
    // Clientes que respondieron después de recibir follow-ups
    const respondedResult = await databaseService.get(
      `SELECT COUNT(*) as count FROM aluna_prospect_followups 
       WHERE client_response_at IS NOT NULL AND converted_at IS NULL`
    );
    const responded = parseInt(respondedResult?.count || 0);
    
    // Prospectos con follow-ups enviados (base para calcular % respuesta)
    const withFollowupsResult = await databaseService.get(
      `SELECT COUNT(*) as count FROM aluna_prospect_followups 
       WHERE (followup_24h_sent_at IS NOT NULL OR followup_3d_sent_at IS NOT NULL)
         AND converted_at IS NULL`
    );
    const withFollowups = parseInt(withFollowupsResult?.count || 0);
    
    // Conversiones
    const convertedResult = await databaseService.get(
      `SELECT COUNT(*) as count FROM aluna_prospect_followups WHERE converted_at IS NOT NULL`
    );
    const converted = parseInt(convertedResult?.count || 0);
    
    // Total histórico (incluyendo convertidos)
    const totalHistoricalResult = await databaseService.get(
      `SELECT COUNT(*) as total FROM aluna_prospect_followups`
    );
    const totalHistorical = parseInt(totalHistoricalResult?.total || 0);
    
    // Calcular porcentajes
    const d1Percentage = totalProspects > 0 ? ((d1Sent / totalProspects) * 100).toFixed(1) : '0.0';
    const d3Percentage = totalProspects > 0 ? ((d3Sent / totalProspects) * 100).toFixed(1) : '0.0';
    const responseRate = withFollowups > 0 ? ((responded / withFollowups) * 100).toFixed(1) : '0.0';
    const conversionRate = totalHistorical > 0 ? ((converted / totalHistorical) * 100).toFixed(1) : '0.0';
    
    // ── STATS GENERALES DE PROFORMAS (legacy) ────────────────────────────────
    
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
        // ── Nuevas métricas de follow-ups ──
        followups: {
          leads: {
            last7d: parseInt(leadsLast7d?.count || 0),
            last30d: parseInt(leadsLast30d?.count || 0),
            active: totalProspects
          },
          automation: {
            d1Sent: d1Sent,
            d1Percentage: parseFloat(d1Percentage),
            d3Sent: d3Sent,
            d3Percentage: parseFloat(d3Percentage)
          },
          engagement: {
            responded: responded,
            responseRate: parseFloat(responseRate),
            withFollowups: withFollowups
          },
          conversion: {
            converted: converted,
            conversionRate: parseFloat(conversionRate),
            total: totalHistorical
          }
        },
        // ── Stats generales (legacy) ──
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
 * POST /api/aluna/prospects
 * Registra manualmente un prospecto en el pipeline (desde el dashboard admin).
 * Body: { phone, name, membershipType, membershipCode?, email?, alreadyConverted? }
 * Normaliza el teléfono a formato +593...
 */
router.post('/prospects', async (req, res) => {
  try {
    await databaseService.ensureInitialized();
    let { phone, name, membershipType, membershipCode, email, alreadyConverted } = req.body;
    
    if (!phone || !name) {
      return res.status(400).json({ ok: false, error: 'phone y name son requeridos' });
    }
    
    // Normalizar teléfono ecuatoriano
    phone = String(phone).trim().replace(/\s/g, '');
    if (/^09\d{8}$/.test(phone))  phone = '+593' + phone.slice(1);
    else if (/^9\d{8}$/.test(phone)) phone = '+593' + phone;
    
    const convertedAt = alreadyConverted ? 'CURRENT_TIMESTAMP' : 'NULL';
    
    await databaseService.run(
      `INSERT INTO aluna_prospect_followups
         (user_phone, user_name, membership_type, membership_code, email, interest_at, converted_at)
       VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, ${alreadyConverted ? 'CURRENT_TIMESTAMP' : 'NULL'})
       ON CONFLICT (user_phone) DO UPDATE SET
         user_name       = COALESCE($2, aluna_prospect_followups.user_name),
         membership_type = COALESCE($3, aluna_prospect_followups.membership_type),
         membership_code = COALESCE($4, aluna_prospect_followups.membership_code),
         email           = COALESCE($5, aluna_prospect_followups.email),
         updated_at      = CURRENT_TIMESTAMP`,
      [phone, name, membershipType || null, membershipCode || null, email || null]
    );
    
    return res.json({ ok: true, phone, name, alreadyConverted: !!alreadyConverted });
  } catch (error) {
    console.error('[ALUNA-API] Error registrando prospecto:', error);
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

/**
 * 🎭 GET /api/aluna/seed-demo-contacts
 * Crea 27 contactos demo realistas para presentaciones
 * ⚠️ SOLO PARA DEMO - No usar en producción real
 */
router.get('/seed-demo-contacts', async (req, res) => {
  try {
    console.log('🎭 [ALUNA] Iniciando seed de contactos demo...');
    await databaseService.ensureInitialized();
    
    // Datos de contactos demo
    const DEMO_CONTACTS = [
      // 8 ACTIVE (ingresos mensuales reales)
      { id: 'ML-DEMO-0001', phone: '+593983000000', name: 'María José González', email: 'maria.gonzalez@gmail.com', company: 'TechVentures EC', plan: 'plan-10', fee: 189, status: 'active', daysAgo: 45, activated: true },
      { id: 'ML-DEMO-0002', phone: '+593993000001', name: 'Carlos Andrés Pérez', email: 'carlos.perez@hotmail.com', company: 'Innovación Digital Quito', plan: 'plan-15', fee: 269, status: 'active', daysAgo: 60, activated: true },
      { id: 'ML-DEMO-0003', phone: '+593963000002', name: 'Ana Lucía Moreno', email: 'ana.moreno@outlook.com', company: 'StartUp Solutions', plan: 'plan-5', fee: 99, status: 'active', daysAgo: 30, activated: true },
      { id: 'ML-DEMO-0004', phone: '+593973000003', name: 'Diego Fernando Sánchez', email: 'diego.sanchez@yahoo.com', company: 'Digital Marketing Pro', plan: 'plan-20', fee: 349, status: 'active', daysAgo: 75, activated: true },
      { id: 'ML-DEMO-0005', phone: '+593953000004', name: 'Gabriela Alejandra Torres', email: 'gabriela.torres@live.com', company: 'Consultores Empresariales', plan: 'plan-10', fee: 189, status: 'active', daysAgo: 20, activated: true },
      { id: 'ML-DEMO-0006', phone: '+593983000005', name: 'Luis Alberto Ramírez', email: 'luis.ramirez@icloud.com', company: 'Arquitectos Asociados', plan: 'plan-15', fee: 269, status: 'active', daysAgo: 50, activated: true },
      { id: 'ML-DEMO-0007', phone: '+593993000006', name: 'Carolina Isabel Castro', email: 'carolina.castro@gmail.com', company: 'Legal Advisors EC', plan: 'plan-5', fee: 99, status: 'active', daysAgo: 15, activated: true },
      { id: 'ML-DEMO-0008', phone: '+593963000007', name: 'Roberto Javier Mendoza', email: 'roberto.mendoza@hotmail.com', company: 'Contadores Públicos CIA', plan: 'oficina-virtual', fee: 79, status: 'active', daysAgo: 40, activated: true },
      // 4 TOUR SCHEDULED
      { id: 'ML-DEMO-0009', phone: '+593973000008', name: 'Valentina Sofía Flores', email: 'valentina.flores@outlook.com', company: 'Software House Latam', plan: 'plan-15', fee: 269, status: 'tour_scheduled', daysAgo: 5, tourDays: 2 },
      { id: 'ML-DEMO-0010', phone: '+593953000009', name: 'Miguel Ángel Herrera', email: 'miguel.herrera@yahoo.com', company: 'E-Commerce Ecuador', plan: 'plan-10', fee: 189, status: 'tour_scheduled', daysAgo: 3, tourDays: 1 },
      { id: 'ML-DEMO-0011', phone: '+593983000010', name: 'Andrea Paola Jiménez', email: 'andrea.jimenez@live.com', company: 'Agencia Creativa 360', plan: 'plan-20', fee: 349, status: 'tour_scheduled', daysAgo: 7, tourDays: 3 },
      { id: 'ML-DEMO-0012', phone: '+593993000011', name: 'Sebastián David Ortiz', email: 'sebastian.ortiz@icloud.com', company: 'Inversiones Estratégicas', plan: 'plan-10', fee: 189, status: 'tour_scheduled', daysAgo: 4, tourDays: 4 },
      // 5 PENDING
      { id: 'ML-DEMO-0013', phone: '+593963000012', name: 'Daniela Teresa Vargas', email: 'daniela.vargas@gmail.com', company: 'Importadora del Pacífico', plan: 'plan-5', fee: 99, status: 'pending', daysAgo: 1 },
      { id: 'ML-DEMO-0014', phone: '+593973000013', name: 'Fernando José Castillo', email: 'fernando.castillo@hotmail.com', company: 'Distribuidora Nacional', plan: 'plan-10', fee: 189, status: 'pending', daysAgo: 2 },
      { id: 'ML-DEMO-0015', phone: '+593953000014', name: 'Mónica Cristina Delgado', email: 'monica.delgado@outlook.com', company: 'Servicios Logísticos', plan: 'oficina-virtual', fee: 79, status: 'pending', daysAgo: 1 },
      { id: 'ML-DEMO-0016', phone: '+593983000015', name: 'Juan Pablo Aguilar', email: 'juan.aguilar@yahoo.com', company: 'Academia de Idiomas', plan: 'plan-15', fee: 269, status: 'pending', daysAgo: 3 },
      { id: 'ML-DEMO-0017', phone: '+593993000016', name: 'Verónica Alejandra Silva', email: 'veronica.silva@live.com', company: 'Centro de Capacitación', plan: 'plan-10', fee: 189, status: 'pending', daysAgo: 2 },
      // 3 NEGOTIATING
      { id: 'ML-DEMO-0018', phone: '+593963000017', name: 'Patricio Xavier Ruiz', email: 'patricio.ruiz@icloud.com', company: 'Asesoría Financiera Plus', plan: 'plan-20', fee: 349, status: 'negotiating', daysAgo: 10 },
      { id: 'ML-DEMO-0019', phone: '+593973000018', name: 'Isabel Mariana Guzmán', email: 'isabel.guzman@gmail.com', company: 'Desarrollo Web Studio', plan: 'plan-15', fee: 269, status: 'negotiating', daysAgo: 8 },
      { id: 'ML-DEMO-0020', phone: '+593953000019', name: 'Andrés Mauricio León', email: 'andres.leon@hotmail.com', company: 'Marketing Digital Agency', plan: 'plan-10', fee: 189, status: 'negotiating', daysAgo: 12 },
      // 3 PENDING_PAYMENT
      { id: 'ML-DEMO-0021', phone: '+593983000020', name: 'Claudia Fernanda Romero', email: 'claudia.romero@outlook.com', company: 'Consultoría IT', plan: 'plan-10', fee: 189, status: 'pending_payment', daysAgo: 6 },
      { id: 'ML-DEMO-0022', phone: '+593993000021', name: 'Eduardo Rafael Vega', email: 'eduardo.vega@yahoo.com', company: 'Producción Audiovisual', plan: 'plan-5', fee: 99, status: 'pending_payment', daysAgo: 5 },
      { id: 'ML-DEMO-0023', phone: '+593963000022', name: 'Melissa Andrea Chávez', email: 'melissa.chavez@live.com', company: 'Diseño Gráfico Express', plan: 'oficina-virtual', fee: 79, status: 'pending_payment', daysAgo: 7 },
      // 2 ACCEPTED
      { id: 'ML-DEMO-0024', phone: '+593973000023', name: 'Ricardo Enrique Paredes', email: 'ricardo.paredes@icloud.com', company: 'Comunicación Corporativa', plan: 'plan-15', fee: 269, status: 'accepted', daysAgo: 4 },
      { id: 'ML-DEMO-0025', phone: '+593953000024', name: 'Stephanie Nicole Campos', email: 'stephanie.campos@gmail.com', company: 'Comercio Exterior SA', plan: 'plan-10', fee: 189, status: 'accepted', daysAgo: 3 },
      // 2 CANCELLED/EXPIRED
      { id: 'ML-DEMO-0026', phone: '+593983000025', name: 'Javier Orlando Navarro', email: 'javier.navarro@hotmail.com', company: 'Trading Internacional', plan: 'plan-5', fee: 99, status: 'cancelled', daysAgo: 25 },
      { id: 'ML-DEMO-0027', phone: '+593993000026', name: 'Natalia Soledad Reyes', email: 'natalia.reyes@outlook.com', company: 'Freelancer Independiente', plan: 'oficina-virtual', fee: 79, status: 'expired', daysAgo: 35 }
    ];
    
    // 1. Limpiar demos anteriores
    await databaseService.run(`DELETE FROM membership_leads WHERE notes LIKE '%DEMO SEED%'`);
    console.log('🗑️ Demos anteriores limpiados');
    
    // 2. Insertar cada contacto
    let created = 0;
    for (const contact of DEMO_CONTACTS) {
      // Crear usuario primero
      await databaseService.run(`
        INSERT INTO users (phone_number, name, email, first_visit, free_trial_used)
        VALUES ($1, $2, $3, false, false)
        ON CONFLICT (phone_number) DO UPDATE SET name = EXCLUDED.name, email = EXCLUDED.email
      `, [contact.phone, contact.name, contact.email]);
      
      // Calcular fechas
      const createdAt = new Date();
      createdAt.setDate(createdAt.getDate() - contact.daysAgo);
      const updatedAt = new Date();
      updatedAt.setDate(updatedAt.getDate() - Math.floor(contact.daysAgo / 2));
      
      let activationDate = null;
      let tourScheduled = null;
      let tourCompleted = false;
      let assignedTo = null;
      
      if (contact.activated) {
        activationDate = createdAt.toISOString().split('T')[0];
        tourCompleted = true;
        assignedTo = 'Aluna';
      }
      
      if (contact.status === 'tour_scheduled') {
        const tourDate = new Date();
        tourDate.setDate(tourDate.getDate() + contact.tourDays);
        tourScheduled = tourDate.toISOString();
        assignedTo = contact.tourDays % 2 === 0 ? 'Aluna' : 'Diego';
      }
      
      if (['negotiating', 'accepted', 'pending_payment'].includes(contact.status)) {
        tourCompleted = true;
        assignedTo = 'Aluna';
      }
      
      // Calcular automatizaciones (simular envíos)
      let d1Sent = null;
      let d3Sent = null;
      let quoteTime = createdAt;
      
      // Si tiene más de 1 día, simulamos D+1 enviado
      if (contact.daysAgo >= 1) {
        d1Sent = new Date(createdAt);
        d1Sent.setDate(d1Sent.getDate() + 1);
      }
      
      // Si tiene más de 3 días, simulamos D+3 enviado
      if (contact.daysAgo >= 3) {
        d3Sent = new Date(createdAt);
        d3Sent.setDate(d3Sent.getDate() + 3);
      }
      
      // Simular respuestas de clientes (algunos respondieron)
      const hasClientResponse = ['tour_scheduled', 'negotiating', 'accepted', 'active'].includes(contact.status);
      let lastInteraction = updatedAt;
      let clientResponseAt = null;
      let whatsappReply = false;
      let emailReply = false;
      
      if (hasClientResponse) {
        clientResponseAt = new Date(createdAt);
        clientResponseAt.setDate(clientResponseAt.getDate() + Math.floor(contact.daysAgo / 3));
        lastInteraction = clientResponseAt;
        
        // Alternar entre WhatsApp y Email
        if (parseInt(contact.id.slice(-1)) % 2 === 0) {
          whatsappReply = true;
        } else {
          emailReply = true;
        }
      }
      
      // Insertar membership lead con campos de tracking
      await databaseService.run(`
        INSERT INTO membership_leads (
          id, membership_code, user_phone, membership_type, start_date, client_name, email, phone,
          company_name, tour_scheduled, tour_completed, membership_activated,
          activation_date, monthly_fee, status, assigned_to, notes,
          quote_sent_at, followup_24h_sent_at, followup_3d_sent_at,
          automation_d1_sent, automation_d3_sent,
          last_interaction_at, client_response_at,
          client_whatsapp_reply, client_email_reply,
          created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28)
      `, [
        contact.id, contact.id, contact.phone, contact.plan, 
        activationDate || updatedAt.toISOString().split('T')[0],
        contact.name, contact.email, contact.phone, contact.company,
        tourScheduled, tourCompleted, contact.activated || false,
        activationDate, contact.fee, contact.status, assignedTo,
        'DEMO SEED - Contacto generado para presentación de cliente',
        quoteTime.toISOString(), d1Sent ? d1Sent.toISOString() : null, d3Sent ? d3Sent.toISOString() : null,
        !!d1Sent, !!d3Sent,
        lastInteraction.toISOString(), clientResponseAt ? clientResponseAt.toISOString() : null,
        whatsappReply, emailReply,
        createdAt.toISOString(), updatedAt.toISOString()
      ]);
      
      created++;
    }
    
    // 3. Estadísticas finales
    const stats = await databaseService.all(`
      SELECT status, COUNT(*) as count, SUM(monthly_fee) as revenue
      FROM membership_leads
      WHERE notes LIKE '%DEMO SEED%'
      GROUP BY status
      ORDER BY CASE status
        WHEN 'active' THEN 1 WHEN 'accepted' THEN 2 WHEN 'negotiating' THEN 3
        WHEN 'tour_scheduled' THEN 4 WHEN 'pending_payment' THEN 5
        WHEN 'pending' THEN 6 ELSE 7 END
    `);
    
    const totalRevenue = stats
      .filter(s => ['active', 'accepted'].includes(s.status))
      .reduce((sum, s) => sum + parseFloat(s.revenue || 0), 0);
    
    console.log(`✅ [ALUNA] ${created} contactos demo creados. Ingresos: $${totalRevenue}`);
    
    return res.json({
      ok: true,
      message: `${created} contactos demo creados exitosamente`,
      stats: { total: created, distribution: stats, monthlyRevenue: totalRevenue }
    });
    
  } catch (error) {
    console.error('❌ [ALUNA] Error en seed:', error);
    return res.status(500).json({ ok: false, error: error.message });
  }
});

// ============================================================================
// ESTADÍSTICAS DE FOLLOW-UPS AUTOMATIZADOS
// ============================================================================

/**
 * GET /api/aluna/followup-stats
 * Obtiene métricas de conversión de follow-ups D+1 y D+3
 * 
 * Query params:
 * - days: Período de tiempo (7, 30, 90, default: 30)
 */
router.get('/followup-stats', async (req, res) => {
  try {
    await databaseService.ensureInitialized();
    
    const { days = 30 } = req.query;
    const daysInt = parseInt(days);
    
    // Query: stats de los últimos N días
    const stats = await databaseService.get(`
      SELECT 
        COUNT(*) as total_leads,
        SUM(CASE WHEN followup_24h_sent_at IS NOT NULL THEN 1 ELSE 0 END) as d1_sent,
        SUM(CASE WHEN followup_3d_sent_at IS NOT NULL THEN 1 ELSE 0 END) as d3_sent,
        SUM(CASE WHEN client_response_at IS NOT NULL THEN 1 ELSE 0 END) as responded,
        SUM(CASE WHEN client_whatsapp_reply = true THEN 1 ELSE 0 END) as whatsapp_replies,
        SUM(CASE WHEN client_email_reply = true THEN 1 ELSE 0 END) as email_replies,
        SUM(CASE WHEN status = 'converted' OR status = 'active' THEN 1 ELSE 0 END) as converted,
        SUM(CASE WHEN status = 'converted' OR status = 'active' THEN monthly_fee ELSE 0 END) as total_revenue
      FROM membership_leads
      WHERE created_at >= datetime('now', '-${daysInt} days')
        AND status != 'lost'
    `);
    
    // Calcular tasas de conversión
    const totalLeads = stats.total_leads || 0;
    const d1Sent = stats.d1_sent || 0;
    const d3Sent = stats.d3_sent || 0;
    const responded = stats.responded || 0;
    const converted = stats.converted || 0;
    
    const conversionRates = {
      d1_sent_rate: totalLeads > 0 ? Math.round((d1Sent / totalLeads) * 100) : 0,
      d3_sent_rate: totalLeads > 0 ? Math.round((d3Sent / totalLeads) * 100) : 0,
      response_rate: totalLeads > 0 ? Math.round((responded / totalLeads) * 100) : 0,
      conversion_rate: totalLeads > 0 ? Math.round((converted / totalLeads) * 100) : 0,
      whatsapp_effectiveness: d1Sent > 0 ? Math.round((stats.whatsapp_replies / d1Sent) * 100) : 0,
      email_effectiveness: d1Sent > 0 ? Math.round((stats.email_replies / d1Sent) * 100) : 0
    };
    
    // Distribución por status
    const statusDist = await databaseService.all(`
      SELECT 
        status,
        COUNT(*) as count,
        SUM(monthly_fee) as revenue
      FROM membership_leads
      WHERE created_at >= datetime('now', '-${daysInt} days')
      GROUP BY status
      ORDER BY count DESC
    `);
    
    // Follow-ups pendientes (necesitan ser enviados)
    const pending = await databaseService.get(`
      SELECT 
        COUNT(*) as d1_pending,
        SUM(CASE 
          WHEN interest_at < datetime('now', '-3 days') 
            AND followup_3d_sent_at IS NULL 
          THEN 1 ELSE 0 
        END) as d3_pending
      FROM membership_leads
      WHERE status NOT IN ('converted', 'active', 'lost')
        AND interest_at < datetime('now', '-1 day')
        AND followup_24h_sent_at IS NULL
    `);
    
    // Reply time distribution (cuánto tardan en responder)
    const replyTimes = await databaseService.all(`
      SELECT 
        CASE 
          WHEN CAST((julianday(client_response_at) - julianday(interest_at)) * 24 AS INTEGER) < 24 THEN '< 24h'
          WHEN CAST((julianday(client_response_at) - julianday(interest_at)) * 24 AS INTEGER) < 72 THEN '24-72h'
          WHEN CAST((julianday(client_response_at) - julianday(interest_at)) * 24 AS INTEGER) < 168 THEN '3-7 days'
          ELSE '> 7 days'
        END as time_range,
        COUNT(*) as count
      FROM membership_leads
      WHERE client_response_at IS NOT NULL
        AND created_at >= datetime('now', '-${daysInt} days')
      GROUP BY time_range
      ORDER BY count DESC
    `);
    
    return res.json({
      ok: true,
      period: `Last ${daysInt} days`,
      summary: {
        total_leads: totalLeads,
        d1_sent,
        d3_sent,
        responded,
        converted,
        total_revenue: parseFloat(stats.total_revenue || 0),
        whatsapp_replies: stats.whatsapp_replies,
        email_replies: stats.email_replies
      },
      conversion_rates: conversionRates,
      status_distribution: statusDist,
      pending_followups: {
        d1_pending: pending.d1_pending || 0,
        d3_pending: pending.d3_pending || 0
      },
      reply_time_distribution: replyTimes
    });
    
  } catch (error) {
    console.error('[ALUNA-API] Error en followup-stats:', error);
    return res.status(500).json({
      ok: false,
      error: error.message
    });
  }
});

export default router;
