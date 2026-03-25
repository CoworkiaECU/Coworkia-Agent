/**
 * 🔄 Aluna Follow-up Service
 * Automatización de seguimientos D+1 y D+3 para leads de membresías
 * 
 * FLUJO:
 * - D+1 (24h): Recordatorio amigable con proforma
 * - D+3 (3d): Mensaje FOMO con urgencia y oferta limitada
 * 
 * CRON JOBS:
 * - 10:00 AM ECT: Follow-up D+1
 * - 11:00 AM ECT: Follow-up D+3
 */

import { query } from '../database/database.js';
import { enviarWhatsApp } from '../express-servidor/endpoints-api/wassenger.js';
import { sendEmail } from '../servicios/email.js';
import { loggers } from '../utils/logger.js';

const logger = loggers.aluna || console;

/**
 * 📅 Follow-up D+1 (24 horas)
 * Envía recordatorio amigable al lead que mostró interés hace 24h
 */
export async function sendD1Followups() {
  logger.info('[ALUNA-FOLLOWUP] 🔄 Iniciando follow-ups D+1...');
  
  try {
    // Query: leads con interés hace 24h sin follow-up enviado
    const leads = await query(`
      SELECT 
        id,
        user_phone,
        client_name as name,
        email,
        membership_type as interest_type,
        monthly_fee as mensualidad,
        created_at,
        created_at as interest_at
      FROM membership_leads
      WHERE created_at >= NOW() - INTERVAL '25 hours'
        AND created_at < NOW() - INTERVAL '23 hours'
        AND followup_24h_sent_at IS NULL
        AND status NOT IN ('active', 'cancelled', 'expired')
      ORDER BY created_at DESC
    `);
    
    if (leads.rows.length === 0) {
      logger.info('[ALUNA-FOLLOWUP] ℹ️ No hay leads para D+1');
      return { success: true, sent: 0 };
    }
    
    logger.info(`[ALUNA-FOLLOWUP] 📊 ${leads.rows.length} leads para follow-up D+1`);
    
    let sent = 0;
    let errors = 0;
    
    for (const lead of leads.rows) {
      try {
        // Enviar WhatsApp
        const whatsappMessage = buildD1WhatsAppMessage(lead);
        await enviarWhatsApp(lead.user_phone, whatsappMessage);
        
        // Enviar Email (si tiene)
        if (lead.email) {
          const emailHtml = buildD1EmailHTML(lead);
          await sendEmail({
            to: lead.email,
            subject: `${lead.name}, tu plan de oficina privada te está esperando 🏢`,
            html: emailHtml
          });
        }
        
        // Actualizar lead
        await query(`
          UPDATE membership_leads
          SET 
            followup_24h_sent_at = NOW(),
            automation_d1_sent = true,
            updated_at = NOW()
          WHERE id = $1
        `, [lead.id]);
        
        sent++;
        logger.info(`[ALUNA-FOLLOWUP] ✅ D+1 enviado a ${lead.name} (${lead.user_phone})`);
        
        // Delay entre envíos para no saturar API
        await new Promise(resolve => setTimeout(resolve, 2000));
        
      } catch (error) {
        errors++;
        logger.error(`[ALUNA-FOLLOWUP] ❌ Error enviando D+1 a ${lead.user_phone}:`, error);
      }
    }
    
    logger.info(`[ALUNA-FOLLOWUP] ✅ D+1 completado: ${sent} enviados, ${errors} errores`);
    
    return { success: true, sent, errors };
    
  } catch (error) {
    logger.error('[ALUNA-FOLLOWUP] ❌ Error en sendD1Followups:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 📅 Follow-up D+3 (3 días - FOMO)
 * Envía mensaje con urgencia y escasez al lead que NO respondió después de D+1
 */
export async function sendD3Followups() {
  logger.info('[ALUNA-FOLLOWUP] 🔥 Iniciando follow-ups D+3 (FOMO)...');
  
  try {
    // Query: leads con interés hace 3 días, D+1 enviado, sin D+3 enviado, sin respuesta
    const leads = await query(`
      SELECT 
        id,
        user_phone,
        client_name as name,
        email,
        membership_type as interest_type,
        monthly_fee as mensualidad,
        created_at,
        created_at as interest_at,
        updated_at as client_response_at
      FROM membership_leads
      WHERE created_at >= NOW() - INTERVAL '73 hours'
        AND created_at < NOW() - INTERVAL '71 hours'
        AND followup_24h_sent_at IS NOT NULL
        AND followup_3d_sent_at IS NULL
        AND updated_at = created_at
        AND status NOT IN ('active', 'cancelled', 'expired')
      ORDER BY created_at DESC
    `);
    
    if (leads.rows.length === 0) {
      logger.info('[ALUNA-FOLLOWUP] ℹ️ No hay leads para D+3');
      return { success: true, sent: 0 };
    }
    
    logger.info(`[ALUNA-FOLLOWUP] 🔥 ${leads.rows.length} leads para follow-up D+3 FOMO`);
    
    let sent = 0;
    let errors = 0;
    
    for (const lead of leads.rows) {
      try {
        // Enviar WhatsApp con FOMO
        const whatsappMessage = buildD3WhatsAppMessage(lead);
        await enviarWhatsApp(lead.user_phone, whatsappMessage);
        
        // Enviar Email con urgencia (si tiene)
        if (lead.email) {
          const emailHtml = buildD3EmailHTML(lead);
          await sendEmail({
            to: lead.email,
            subject: `⚠️ ${lead.name}, últimas oficinas disponibles este mes`,
            html: emailHtml
          });
        }
        
        // Actualizar lead
        await query(`
          UPDATE membership_leads
          SET 
            followup_3d_sent_at = NOW(),
            automation_d3_sent = true,
            updated_at = NOW()
          WHERE id = $1
        `, [lead.id]);
        
        sent++;
        logger.info(`[ALUNA-FOLLOWUP] 🔥 D+3 enviado a ${lead.name} (${lead.user_phone})`);
        
        // Delay entre envíos
        await new Promise(resolve => setTimeout(resolve, 2000));
        
      } catch (error) {
        errors++;
        logger.error(`[ALUNA-FOLLOWUP] ❌ Error enviando D+3 a ${lead.user_phone}:`, error);
      }
    }
    
    logger.info(`[ALUNA-FOLLOWUP] ✅ D+3 completado: ${sent} enviados, ${errors} errores`);
    
    return { success: true, sent, errors };
    
  } catch (error) {
    logger.error('[ALUNA-FOLLOWUP] ❌ Error en sendD3Followups:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 📝 Build WhatsApp message D+1 (amigable)
 */
function buildD1WhatsAppMessage(lead) {
  const planType = lead.interest_type === 'private_office' ? 'oficina privada' : 'hot desk';
  const price = lead.mensualidad || '300';
  
  return `Hola ${lead.name}! 👋

Te recuerdo que tenemos ${planType} disponible desde $${price}/mes con todo incluido:

✅ Oficina equipada
✅ Café ilimitado ☕
✅ WiFi de alta velocidad
✅ Salas de reuniones
✅ Recepción y mail handling

¿Cuándo te gustaría conocer el espacio? 🏢

Puedo mostrártelo hoy mismo o agendamos para la fecha que mejor te venga 📅`;
}

/**
 * 🔥 Build WhatsApp message D+3 (FOMO)
 */
function buildD3WhatsAppMessage(lead) {
  const firstName = lead.name.split(' ')[0];
  const planType = lead.interest_type === 'private_office' ? 'oficinas privadas' : 'espacios de hot desk';
  
  return `${firstName}, últimas ${planType} disponibles! 🔥

Este mes tenemos una promoción especial:
🎁 Primer mes con 20% de descuento

Pero solo nos quedan 2 espacios disponibles y ya varios clientes interesados.

¿Hablamos hoy? Te reservo uno antes de que se agoten 👀

Responde "Sí" y coordinamos una visita para esta semana 📅`;
}

/**
 * 📧 Build Email HTML D+1
 */
function buildD1EmailHTML(lead) {
  const planType = lead.interest_type === 'private_office' ? 'Oficina Privada' : 'Hot Desk';
  const price = lead.mensualidad || '300';
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  
  <div style="text-align: center; padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 10px 10px 0 0;">
    <h1 style="margin: 0; font-size: 28px;">Coworkia Quito</h1>
    <p style="margin: 10px 0 0 0; opacity: 0.9;">Tu espacio de trabajo ideal</p>
  </div>
  
  <div style="padding: 30px; background: #f9f9f9; border-radius: 0 0 10px 10px;">
    <h2 style="color: #667eea; margin-top: 0;">Hola ${lead.name}! 👋</h2>
    
    <p>Te escribo para recordarte que tenemos <strong>${planType}</strong> disponible desde <strong>$${price}/mes</strong>.</p>
    
    <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
      <h3 style="margin-top: 0; color: #667eea;">¿Qué incluye tu plan?</h3>
      <ul style="padding-left: 20px;">
        <li>✅ Oficina totalmente equipada</li>
        <li>✅ Café y snacks ilimitados</li>
        <li>✅ WiFi de alta velocidad (200 Mbps)</li>
        <li>✅ Salas de reuniones (uso incluido)</li>
        <li>✅ Recepción y manejo de correspondencia</li>
        <li>✅ Acceso 24/7</li>
      </ul>
    </div>
    
    <p><strong>¿Cuándo te gustaría conocer el espacio?</strong></p>
    <p>Podemos coordinar una visita guiada en el horario que mejor te venga 📅</p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="https://wa.me/593994837117?text=Hola,%20me%20gustaría%20agendar%20una%20visita" 
         style="display: inline-block; padding: 15px 30px; background: #25D366; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">
        📱 Agendar Visita por WhatsApp
      </a>
    </div>
    
    <p style="color: #666; font-size: 14px; text-align: center; margin-top: 30px;">
      Coworkia Quito<br>
      📍 Av. República del Salvador N34-183 y Suecia<br>
      📞 +593 98 777 0788
    </p>
  </div>
  
</body>
</html>
  `;
}

/**
 * 🔥 Build Email HTML D+3 (FOMO)
 */
function buildD3EmailHTML(lead) {
  const firstName = lead.name.split(' ')[0];
  const planType = lead.interest_type === 'private_office' ? 'oficinas privadas' : 'espacios de hot desk';
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  
  <div style="text-align: center; padding: 20px; background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; border-radius: 10px 10px 0 0;">
    <h1 style="margin: 0; font-size: 32px;">🔥 ¡Últimas Unidades!</h1>
    <p style="margin: 10px 0 0 0; font-size: 18px; opacity: 0.9;">Oferta limitada este mes</p>
  </div>
  
  <div style="padding: 30px; background: #fff7ed; border-radius: 0 0 10px 10px; border: 2px solid #f5576c;">
    <h2 style="color: #f5576c; margin-top: 0;">${firstName}, quedan solo 2 ${planType} 🚨</h2>
    
    <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border: 2px dashed #f5576c;">
      <h3 style="margin-top: 0; color: #f5576c; text-align: center;">🎁 PROMOCIÓN DE MARZO</h3>
      <p style="text-align: center; font-size: 24px; font-weight: bold; color: #f5576c; margin: 15px 0;">
        20% DE DESCUENTO<br>
        <span style="font-size: 16px; color: #666;">En tu primer mes</span>
      </p>
    </div>
    
    <p><strong>¿Por qué deberías decidir hoy?</strong></p>
    <ul style="padding-left: 20px;">
      <li>⏰ Solo quedan 2 espacios disponibles</li>
      <li>📈 Ya tenemos 3 clientes más interesados</li>
      <li>🎁 La promoción del 20% termina en 5 días</li>
      <li>🔒 Si no reservas hoy, probablemente no habrá espacio</li>
    </ul>
    
    <div style="background: #fff; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <p style="margin: 0; text-align: center; font-size: 14px; color: #666;">
        <strong>Clientes que esperaron:</strong><br>
        "Me arrepiento de no haber tomado la oficina cuando me la ofrecieron. Ahora están llenos" - Juan M.
      </p>
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="https://wa.me/593994837117?text=Quiero%20reservar%20una%20oficina%20antes%20de%20que%20se%20agoten" 
         style="display: inline-block; padding: 18px 35px; background: #f5576c; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px; animation: pulse 2s infinite;">
        🔥 RESERVAR AHORA
      </a>
      <p style="margin: 15px 0 0 0; font-size: 12px; color: #999;">Respuesta en menos de 2 minutos</p>
    </div>
    
    <p style="color: #666; font-size: 13px; text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
      Esta oferta es válida hasta el 31 de Marzo 2026<br>
      No aplica con otras promociones
    </p>
  </div>
  
</body>
</html>
  `;
}

/**
 * 📊 Obtiene estadísticas de follow-ups
 */
export async function getFollowupStats(days = 30) {
  try {
    const stats = await query(`
      SELECT 
        COUNT(*) as total_leads,
        COUNT(CASE WHEN followup_24h_sent_at IS NOT NULL THEN 1 END) as d1_sent,
        COUNT(CASE WHEN followup_3d_sent_at IS NOT NULL THEN 1 END) as d3_sent,
        COUNT(CASE WHEN client_response_at IS NOT NULL THEN 1 END) as responded,
        COUNT(CASE WHEN client_response_at > followup_24h_sent_at THEN 1 END) as responded_after_d1,
        COUNT(CASE WHEN client_response_at > followup_3d_sent_at THEN 1 END) as responded_after_d3
      FROM membership_leads
      WHERE created_at >= NOW() - INTERVAL '${days} days'
        AND status != 'converted'
        AND status != 'lost'
    `);
    
    return stats.rows[0];
    
  } catch (error) {
    logger.error('[ALUNA-FOLLOWUP] ❌ Error obteniendo stats:', error);
    return null;
  }
}
