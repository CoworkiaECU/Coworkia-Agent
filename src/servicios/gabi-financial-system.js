/**
 * 💼 Gabi - Sistema de Gestión Financiera y Seguimiento de Interacciones
 * 
 * Sistema integral para:
 * 1. Contador de interacciones por usuario con Gabi
 * 2. Trigger automático para ofrecer reunión presencial (5+ interacciones)
 * 3. Dashboard de métricas financieras
 * 4. Análisis de documentos financieros (facturas, estados financieros, reportes)
 * 
 * @author Agente Copilot
 * @date 2026-01-12
 */

import database from '../database/database.js';

// ============================================================================
// CONTADOR DE INTERACCIONES
// ============================================================================

/**
 * Obtiene el contador de interacciones de un usuario con Gabi
 * @param {string} userId - ID del usuario (teléfono)
 * @returns {Promise<number>} Número de interacciones
 */
export async function getGabiInteractionCount(userId) {
  try {
    const query = `
      SELECT COUNT(*) as count
      FROM agent_conversations
      WHERE user_phone = $1 AND agent = 'GABI'
    `;
    
    const result = await database.get(query, [userId]);
    return result?.count || 0;
  } catch (error) {
    console.error('[GABI-COUNTER] ❌ Error al obtener contador:', error);
    return 0;
  }
}

/**
 * Verifica si debe ofrecerse reunión presencial (5+ interacciones)
 * @param {string} userId - ID del usuario
 * @returns {Promise<Object>} { shouldOffer: boolean, count: number, lastOffered: Date|null }
 */
export async function shouldOfferMeeting(userId) {
  try {
    // Obtener contador
    const count = await getGabiInteractionCount(userId);
    
    // Verificar si ya se ofreció reunión recientemente (últimos 7 días)
    const checkQuery = `
      SELECT metadata
      FROM agent_conversations
      WHERE user_phone = $1 
        AND agent = 'GABI'
        AND metadata::text LIKE '%meeting_offered%'
      ORDER BY timestamp DESC
      LIMIT 1
    `;
    
    const lastOffer = await database.get(checkQuery, [userId]);
    let lastOffered = null;
    
    if (lastOffer?.metadata) {
      try {
        const meta = JSON.parse(lastOffer.metadata);
        if (meta.meeting_offered_at) {
          lastOffered = new Date(meta.meeting_offered_at);
          
          // Si se ofreció en los últimos 7 días, no ofrecer de nuevo
          const daysSinceOffer = (Date.now() - lastOffered.getTime()) / (1000 * 60 * 60 * 24);
          if (daysSinceOffer < 7) {
            return { shouldOffer: false, count, lastOffered, reason: 'recently_offered' };
          }
        }
      } catch (e) {
        // Si falla el parse, ignorar
      }
    }
    
    // Ofrecer si tiene 5+ interacciones y no se ha ofrecido recientemente
    return {
      shouldOffer: count >= 5,
      count,
      lastOffered,
      reason: count >= 5 ? 'threshold_reached' : 'below_threshold'
    };
    
  } catch (error) {
    console.error('[GABI-COUNTER] ❌ Error al verificar reunión:', error);
    return { shouldOffer: false, count: 0, lastOffered: null, reason: 'error' };
  }
}

/**
 * Registra que se ofreció reunión presencial
 * @param {string} userId - ID del usuario
 * @param {string} conversationId - ID de la conversación
 * @returns {Promise<boolean>} Success
 */
export async function markMeetingOffered(userId, conversationId) {
  try {
    const updateQuery = `
      UPDATE agent_conversations
      SET metadata = COALESCE(metadata, '{}'::jsonb) || 
        jsonb_build_object(
          'meeting_offered', true,
          'meeting_offered_at', NOW(),
          'meeting_offered_count', (
            SELECT COUNT(*) FROM agent_conversations WHERE user_phone = $2 AND agent = 'GABI'
          )
        )
      WHERE session_id = $1 AND user_phone = $2
    `;
    
    await database.run(updateQuery, [conversationId, userId]);
    console.log(`[GABI-COUNTER] ✅ Reunión ofrecida registrada para ${userId}`);
    return true;
  } catch (error) {
    console.error('[GABI-COUNTER] ❌ Error al marcar reunión:', error);
    return false;
  }
}

// ============================================================================
// MÉTRICAS Y DASHBOARD FINANCIERO
// ============================================================================

/**
 * Obtiene métricas financieras globales
 * @param {string} period - Período: 'today', 'week', 'month', 'year'
 * @returns {Promise<Object>} Métricas financieras
 */
export async function getFinancialMetrics(period = 'month') {
  try {
    let dateFilter = '';
    
    switch (period) {
      case 'today':
        dateFilter = "DATE(timestamp) = CURRENT_DATE";
        break;
      case 'week':
        dateFilter = "timestamp >= NOW() - INTERVAL '7 days'";
        break;
      case 'month':
        dateFilter = "timestamp >= NOW() - INTERVAL '30 days'";
        break;
      case 'year':
        dateFilter = "timestamp >= NOW() - INTERVAL '365 days'";
        break;
      default:
        dateFilter = "timestamp >= NOW() - INTERVAL '30 days'";
    }
    
    // Total de interacciones con Gabi (consultas financieras)
    const consultasQuery = `
      SELECT COUNT(*) as total_consultas
      FROM agent_conversations
      WHERE agent = 'GABI' AND ${dateFilter}
    `;
    
    const consultas = await database.get(consultasQuery);
    
    // Usuarios únicos que consultaron
    const usuariosQuery = `
      SELECT COUNT(DISTINCT user_phone) as usuarios_unicos
      FROM agent_conversations
      WHERE agent = 'GABI' AND ${dateFilter}
    `;
    
    const usuarios = await database.get(usuariosQuery);
    
    // Tópicos más consultados
    const topicsQuery = `
      SELECT conversation_topic as topic, COUNT(*) as count
      FROM agent_conversations
      WHERE agent = 'GABI' AND conversation_topic IS NOT NULL AND ${dateFilter}
      GROUP BY conversation_topic
      ORDER BY count DESC
      LIMIT 5
    `;
    
    const topics = await database.all(topicsQuery);
    
    // Promedio de interacciones por usuario
    const avgQuery = `
      SELECT AVG(interaction_count) as avg_interactions
      FROM (
        SELECT user_phone, COUNT(*) as interaction_count
        FROM agent_conversations
        WHERE agent = 'GABI' AND ${dateFilter}
        GROUP BY user_phone
      ) subquery
    `;
    
    const avg = await database.get(avgQuery);
    
    return {
      period,
      totalConsultas: consultas?.total_consultas || 0,
      usuariosUnicos: usuarios?.usuarios_unicos || 0,
      promedioInteracciones: Math.round(avg?.avg_interactions || 0),
      topicsMasConsultados: topics || [],
      timestamp: Date.now()
    };
    
  } catch (error) {
    console.error('[GABI-METRICS] ❌ Error al obtener métricas:', error);
    return {
      period,
      totalConsultas: 0,
      usuariosUnicos: 0,
      promedioInteracciones: 0,
      topicsMasConsultados: [],
      timestamp: Date.now(),
      error: error.message
    };
  }
}

/**
 * Obtiene ranking de usuarios más activos con Gabi
 * @param {number} limit - Límite de resultados
 * @returns {Promise<Array>} Top usuarios
 */
export async function getTopGabiUsers(limit = 10) {
  try {
    const query = `
      SELECT 
        user_phone,
        COUNT(*) as interaction_count,
        MAX(timestamp) as last_interaction,
        json_agg(DISTINCT conversation_topic) FILTER (WHERE conversation_topic IS NOT NULL) as topics
      FROM agent_conversations
      WHERE agent = 'GABI'
      GROUP BY user_phone
      ORDER BY interaction_count DESC
      LIMIT $1
    `;
    
    const users = await database.all(query, [limit]);
    
    return users.map(u => ({
      userId: u.user_phone,
      interactions: u.interaction_count,
      lastInteraction: u.last_interaction,
      topics: u.topics || []
    }));
    
  } catch (error) {
    console.error('[GABI-METRICS] ❌ Error al obtener top usuarios:', error);
    return [];
  }
}

/**
 * Obtiene métricas de reuniones ofrecidas
 * @returns {Promise<Object>} Métricas de reuniones
 */
export async function getMeetingMetrics() {
  try {
    // Total de reuniones ofrecidas
    const offeredQuery = `
      SELECT COUNT(*) as total_offered
      FROM agent_conversations
      WHERE agent = 'GABI' 
        AND metadata::text LIKE '%meeting_offered%'
    `;
    
    const offered = await database.get(offeredQuery);
    
    // Usuarios únicos a los que se ofreció
    const uniqueQuery = `
      SELECT COUNT(DISTINCT user_phone) as unique_users
      FROM agent_conversations
      WHERE agent = 'GABI' 
        AND metadata::text LIKE '%meeting_offered%'
    `;
    
    const unique = await database.get(uniqueQuery);
    
    // Últimas 5 ofertas
    const recentQuery = `
      SELECT user_phone, timestamp, metadata
      FROM agent_conversations
      WHERE agent = 'GABI' 
        AND metadata::text LIKE '%meeting_offered%'
      ORDER BY timestamp DESC
      LIMIT 5
    `;
    
    const recent = await database.all(recentQuery);
    
    return {
      totalOffered: offered?.total_offered || 0,
      uniqueUsers: unique?.unique_users || 0,
      recentOffers: recent.map(r => ({
        userId: r.user_phone,
        date: r.timestamp,
        metadata: typeof r.metadata === 'string' ? JSON.parse(r.metadata) : r.metadata
      })),
      timestamp: Date.now()
    };
    
  } catch (error) {
    console.error('[GABI-METRICS] ❌ Error al obtener métricas de reuniones:', error);
    return {
      totalOffered: 0,
      uniqueUsers: 0,
      recentOffers: [],
      timestamp: Date.now(),
      error: error.message
    };
  }
}

// ============================================================================
// GENERACIÓN DE MENSAJE DE REUNIÓN
// ============================================================================

/**
 * Genera el mensaje personalizado para ofrecer reunión presencial
 * @param {string} userId - ID del usuario
 * @param {number} interactionCount - Número de interacciones
 * @returns {Promise<string>} Mensaje personalizado
 */
export async function generateMeetingOffer(userId, interactionCount) {
  try {
    // Obtener tópicos más consultados por el usuario
    const topicsQuery = `
      SELECT conversation_topic as topic, COUNT(*) as count
      FROM agent_conversations
      WHERE user_phone = $1 AND agent = 'GABI' AND conversation_topic IS NOT NULL
      GROUP BY conversation_topic
      ORDER BY count DESC
      LIMIT 3
    `;
    
    const topics = await database.all(topicsQuery, [userId]);
    
    let contextMessage = '';
    if (topics && topics.length > 0) {
      const topicsList = topics.map(t => t.topic).filter(t => t).join(', ');
      contextMessage = `\n\nHe notado que has consultado sobre ${topicsList}.`;
    }
    
    const message = `Hola! 👋

He visto que ya llevamos ${interactionCount} consultas juntos y me encantaría poder ayudarte de forma más personalizada.${contextMessage}

¿Te gustaría agendar una reunión presencial aquí en Coworkia? 📅

Podríamos revisar tu situación en detalle y estructurar un plan de acción específico para tu empresa. Sin costo, es parte del servicio.

¿Qué te parece? Si te interesa, hablamos con @Aurora para coordinar fecha y hora. 💼`;

    return message;
    
  } catch (error) {
    console.error('[GABI-MEETING] ❌ Error al generar mensaje:', error);
    
    // Mensaje genérico de fallback
    return `Hola! 👋

He visto que ya llevamos ${interactionCount} consultas juntos. 

¿Te gustaría agendar una reunión presencial aquí en Coworkia para revisar tu situación en detalle? 📅

Sin costo, es parte del servicio. Si te interesa, hablamos con @Aurora para coordinar. 💼`;
  }
}

// ============================================================================
// ANÁLISIS DE DOCUMENTOS FINANCIEROS (similar a Adriana/Aluna)
// ============================================================================

/**
 * Tipos de documentos financieros soportados
 */
export const FINANCIAL_DOCUMENT_TYPES = {
  INVOICE: 'invoice',                 // Facturas
  FINANCIAL_STATEMENT: 'statement',   // Estados financieros
  TAX_RETURN: 'tax_return',           // Declaraciones impuestos
  PAYROLL: 'payroll',                 // Nóminas
  CONTRACT: 'contract',               // Contratos laborales/comerciales
  REPORT: 'report',                   // Reportes financieros
  RECEIPT: 'receipt',                 // Comprobantes
  GENERAL: 'general'                  // Análisis general
};

/**
 * Detecta el tipo de documento financiero
 * @param {string} userMessage - Mensaje del usuario
 * @returns {string} Tipo detectado
 */
export function detectFinancialDocumentType(userMessage) {
  const msg = userMessage.toLowerCase();
  
  const keywords = {
    invoice: ['factura', 'invoice', 'comprobante venta'],
    statement: ['estado financiero', 'balance', 'estado resultados', 'flujo efectivo', 'financial statement'],
    tax_return: ['declaración', 'impuesto', 'iva', 'renta', 'anexo', 'sri', 'tax return'],
    payroll: ['nómina', 'rol pagos', 'sueldos', 'salarios', 'payroll'],
    contract: ['contrato', 'convenio', 'acuerdo', 'contract'],
    report: ['reporte', 'informe', 'análisis financiero', 'report'],
    receipt: ['recibo', 'comprobante', 'receipt']
  };
  
  for (const [type, words] of Object.entries(keywords)) {
    if (words.some(word => msg.includes(word))) {
      return type;
    }
  }
  
  return 'general';
}

// ============================================================================
// TRACKING DE ENTREGAS PENDIENTES (PAGOS COMPUESTOS)
// ============================================================================

/**
 * Obtiene entregas pendientes de pagos compuestos para un usuario
 * @param {string} userId - ID del usuario (teléfono)
 * @returns {Promise<Array>} Lista de entregas pendientes
 */
export async function getPendingDeliveries(userId) {
  try {
    const query = `
      SELECT 
        mp.id,
        mp.membership_lead_id,
        mp.transaction_number,
        mp.amount as payment_amount,
        mp.transaction_date,
        mp.validation_warnings,
        ml.membership_type,
        ml.client_name,
        ml.email,
        ml.created_at as lead_created
      FROM membership_payments mp
      JOIN membership_leads ml ON mp.membership_lead_id = ml.id
      WHERE ml.user_phone = $1
        AND mp.status = 'verified'
        AND mp.validation_warnings IS NOT NULL
        AND mp.validation_warnings::text LIKE '%compositePayment%'
        AND (mp.validation_warnings->'compositePayment'->>'isComposite')::boolean = true
        AND COALESCE((mp.validation_warnings->'compositePayment'->>'deliveryCompleted')::boolean, false) = false
      ORDER BY mp.transaction_date DESC
    `;
    
    const results = await database.all(query, [userId]);
    
    return results.map(row => {
      let compositeData = {};
      try {
        if (row.validation_warnings?.compositePayment) {
          compositeData = row.validation_warnings.compositePayment;
        } else if (typeof row.validation_warnings === 'string') {
          compositeData = JSON.parse(row.validation_warnings).compositePayment || {};
        }
      } catch (e) {
        console.error('[GABI-DELIVERIES] Error parsing composite data:', e);
      }
      
      return {
        paymentId: row.id,
        leadId: row.membership_lead_id,
        transactionNumber: row.transaction_number,
        membershipType: row.membership_type,
        clientName: row.client_name,
        paymentDate: row.transaction_date,
        cashAmount: compositeData.cashAmount || 0,
        canjeAmount: compositeData.canjeAmount || 0,
        canjeDescription: compositeData.canjeDescription || 'No especificado',
        totalAmount: compositeData.totalAmount || 0,
        deliveryCompleted: compositeData.deliveryCompleted || false,
        deliveryCompletedDate: compositeData.deliveryCompletedDate || null
      };
    });
    
  } catch (error) {
    console.error('[GABI-DELIVERIES] ❌ Error al obtener entregas pendientes:', error);
    return [];
  }
}

/**
 * Marca una entrega como completada
 * @param {string} paymentId - ID del pago
 * @param {string} completedBy - Quien marca como completado (userId o 'system')
 * @returns {Promise<Object>} { success: boolean, message: string }
 */
export async function markDeliveryCompleted(paymentId, completedBy = 'system') {
  try {
    // Obtener el pago actual
    const getQuery = `
      SELECT validation_warnings 
      FROM membership_payments 
      WHERE id = $1
    `;
    
    const payment = await database.get(getQuery, [paymentId]);
    
    if (!payment) {
      return { success: false, message: 'Pago no encontrado' };
    }
    
    let warnings = {};
    try {
      warnings = typeof payment.validation_warnings === 'string' 
        ? JSON.parse(payment.validation_warnings) 
        : payment.validation_warnings || {};
    } catch (e) {
      warnings = payment.validation_warnings || {};
    }
    
    // Actualizar compositePayment con deliveryCompleted
    if (warnings.compositePayment) {
      warnings.compositePayment.deliveryCompleted = true;
      warnings.compositePayment.deliveryCompletedDate = new Date().toISOString();
      warnings.compositePayment.deliveryCompletedBy = completedBy;
    }
    
    // Actualizar en BD
    const updateQuery = `
      UPDATE membership_payments
      SET validation_warnings = $1,
          updated_at = NOW()
      WHERE id = $2
    `;
    
    await database.run(updateQuery, [JSON.stringify(warnings), paymentId]);
    
    console.log(`[GABI-DELIVERIES] ✅ Entrega marcada como completada: ${paymentId}`);
    
    return {
      success: true,
      message: 'Entrega marcada como completada',
      paymentId,
      completedAt: warnings.compositePayment.deliveryCompletedDate
    };
    
  } catch (error) {
    console.error('[GABI-DELIVERIES] ❌ Error al marcar entrega:', error);
    return { success: false, message: 'Error al actualizar entrega' };
  }
}

/**
 * Genera recordatorio de entregas pendientes para un usuario
 * @param {string} userId - ID del usuario
 * @returns {Promise<Object>} { hasDeliveries: boolean, message: string, deliveries: Array }
 */
export async function generateDeliveryReminder(userId) {
  try {
    const deliveries = await getPendingDeliveries(userId);
    
    if (deliveries.length === 0) {
      return {
        hasDeliveries: false,
        message: '✅ No tienes entregas pendientes.',
        deliveries: []
      };
    }
    
    let message = `📦 *ENTREGAS PENDIENTES DE PAGO COMPUESTO*\n\n`;
    message += `Tienes ${deliveries.length} entrega(s) pendiente(s):\n\n`;
    
    deliveries.forEach((delivery, index) => {
      message += `${index + 1}. *${delivery.membershipType}*\n`;
      message += `   💵 Canje: $${delivery.canjeAmount} USD\n`;
      message += `   📝 Descripción: ${delivery.canjeDescription}\n`;
      message += `   📅 Desde: ${new Date(delivery.paymentDate).toLocaleDateString()}\n`;
      message += `   🔢 Transacción: ${delivery.transactionNumber}\n\n`;
    });
    
    message += `⚠️ *Recuerda cumplir con tus compromisos de canje.*\n`;
    message += `Cuando completes una entrega, avísame escribiendo:\n`;
    message += `"@Gabi entrega completada [número transacción]"\n\n`;
    message += `Para ver detalles de tus entregas, escribe: "@Gabi entregas pendientes"`;
    
    return {
      hasDeliveries: true,
      message,
      deliveries,
      count: deliveries.length
    };
    
  } catch (error) {
    console.error('[GABI-DELIVERIES] ❌ Error al generar recordatorio:', error);
    return {
      hasDeliveries: false,
      message: '❌ Error al consultar entregas pendientes.',
      deliveries: []
    };
  }
}

/**
 * Obtiene estadísticas de entregas (completadas vs pendientes)
 * @param {string} userId - ID del usuario (opcional, null para stats globales)
 * @returns {Promise<Object>} Estadísticas de entregas
 */
export async function getDeliveryStats(userId = null) {
  try {
    let userFilter = userId ? 'AND ml.user_phone = $1' : '';
    let params = userId ? [userId] : [];
    
    const query = `
      SELECT 
        COUNT(*) FILTER (WHERE (mp.validation_warnings->'compositePayment'->>'deliveryCompleted')::boolean = false) as pending,
        COUNT(*) FILTER (WHERE (mp.validation_warnings->'compositePayment'->>'deliveryCompleted')::boolean = true) as completed,
        COUNT(*) as total,
        SUM((mp.validation_warnings->'compositePayment'->>'canjeAmount')::numeric) FILTER (WHERE (mp.validation_warnings->'compositePayment'->>'deliveryCompleted')::boolean = false) as pending_amount,
        SUM((mp.validation_warnings->'compositePayment'->>'canjeAmount')::numeric) FILTER (WHERE (mp.validation_warnings->'compositePayment'->>'deliveryCompleted')::boolean = true) as completed_amount
      FROM membership_payments mp
      JOIN membership_leads ml ON mp.membership_lead_id = ml.id
      WHERE mp.status = 'verified'
        AND mp.validation_warnings IS NOT NULL
        AND mp.validation_warnings::text LIKE '%compositePayment%'
        AND (mp.validation_warnings->'compositePayment'->>'isComposite')::boolean = true
        ${userFilter}
    `;
    
    const result = await database.get(query, params);
    
    return {
      total: parseInt(result?.total || 0),
      pending: parseInt(result?.pending || 0),
      completed: parseInt(result?.completed || 0),
      pendingAmount: parseFloat(result?.pending_amount || 0),
      completedAmount: parseFloat(result?.completed_amount || 0),
      completionRate: result?.total > 0 ? (result.completed / result.total * 100).toFixed(1) : 0
    };
    
  } catch (error) {
    console.error('[GABI-DELIVERIES] ❌ Error al obtener estadísticas:', error);
    return {
      total: 0,
      pending: 0,
      completed: 0,
      pendingAmount: 0,
      completedAmount: 0,
      completionRate: 0
    };
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  // Contador e interacciones
  getGabiInteractionCount,
  shouldOfferMeeting,
  markMeetingOffered,
  generateMeetingOffer,
  
  // Métricas y dashboard
  getFinancialMetrics,
  getTopGabiUsers,
  getMeetingMetrics,
  
  // Documentos financieros
  detectFinancialDocumentType,
  FINANCIAL_DOCUMENT_TYPES,
  
  // Tracking de entregas pendientes (pagos compuestos)
  getPendingDeliveries,
  markDeliveryCompleted,
  generateDeliveryReminder,
  getDeliveryStats
};
