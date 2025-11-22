// src/servicios/follow-up-service.js
// 🔔 Sistema de seguimiento automático para conversaciones abandonadas

import databaseService from '../database/database.js';

/**
 * ⏰ Verifica si estamos en horario permitido para enviar mensajes (6am - 10pm Ecuador)
 * @returns {boolean}
 */
export function isWithinAllowedHours() {
  const now = new Date();
  
  // Convertir a hora de Ecuador (UTC-5)
  const ecuadorTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Guayaquil' }));
  const hour = ecuadorTime.getHours();
  
  // Solo entre 6:00 AM y 10:00 PM (22:00)
  const isAllowed = hour >= 6 && hour < 22;
  
  console.log(`[FOLLOW-UP] ⏰ Hora Ecuador: ${ecuadorTime.toLocaleTimeString('es-EC')} - Permitido: ${isAllowed}`);
  
  return isAllowed;
}

/**
 * 🔍 Encuentra usuarios con conversaciones abandonadas (sin confirmar reserva > 3 horas)
 * @returns {Promise<Array>}
 */
export async function findAbandonedConversations() {
  try {
    // Buscar usuarios con última interacción hace más de 3 horas
    const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
    
    const query = `
      SELECT DISTINCT 
        u.phone_number,
        u.name,
        u.email,
        u.active_agent,
        u.last_message_at,
        u.conversation_count
      FROM users u
      WHERE u.last_message_at < $1
        AND u.last_message_at > $2
        AND (u.active_agent = 'AURORA' OR u.active_agent = 'ALUNA')
        AND NOT EXISTS (
          SELECT 1 FROM reservations r 
          WHERE r.user_phone = u.phone_number 
          AND r.status = 'confirmed'
          AND r.created_at > u.last_message_at
        )
      ORDER BY u.last_message_at ASC
      LIMIT 50
    `;
    
    // Últimas 3-24 horas (no enviar a conversaciones muy antiguas)
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    
    const users = await databaseService.all(query, [threeHoursAgo, twentyFourHoursAgo]);
    
    console.log(`[FOLLOW-UP] 🔍 Encontrados ${users.length} usuarios con conversaciones abandonadas`);
    
    return users;
  } catch (error) {
    console.error('[FOLLOW-UP] ❌ Error buscando conversaciones abandonadas:', error);
    return [];
  }
}

/**
 * 📝 Verifica si el usuario tiene formulario parcial o pending confirmation
 * @param {string} phoneNumber
 * @returns {Promise<Object>}
 */
export async function getUserConversationContext(phoneNumber) {
  try {
    // 1. Verificar si tiene formulario parcial
    const partialForm = await databaseService.get(
      'SELECT form_data, form_type FROM partial_forms WHERE user_phone = $1',
      [phoneNumber]
    );
    
    // 2. Verificar pending confirmation
    const pendingConfirmation = await databaseService.get(
      'SELECT reservation_data FROM pending_confirmations WHERE user_phone = $1',
      [phoneNumber]
    );
    
    // 3. Obtener últimos mensajes para contexto
    const lastMessages = await databaseService.all(
      'SELECT input, output, agent FROM interactions WHERE user_phone = $1 ORDER BY timestamp DESC LIMIT 3',
      [phoneNumber]
    );
    
    return {
      hasPartialForm: !!partialForm,
      formType: partialForm?.form_type,
      formData: partialForm?.form_data ? JSON.parse(partialForm.form_data) : null,
      hasPendingConfirmation: !!pendingConfirmation,
      pendingData: pendingConfirmation?.reservation_data ? JSON.parse(pendingConfirmation.reservation_data) : null,
      lastMessages
    };
  } catch (error) {
    console.error('[FOLLOW-UP] ❌ Error obteniendo contexto:', error);
    return { hasPartialForm: false, hasPendingConfirmation: false };
  }
}

/**
 * 💬 Genera mensaje de seguimiento personalizado según contexto
 * @param {Object} user
 * @param {Object} context
 * @returns {string}
 */
export function generateFollowUpMessage(user, context) {
  const name = user.name || 'Hola';
  const activeAgent = user.active_agent || 'AURORA';
  
  // Determinar agente y saludo
  const isAluna = activeAgent === 'ALUNA';
  const agentName = isAluna ? 'Aluna' : 'Aurora';
  const greeting = `¡${name}! 👋 Soy ${agentName}`;
  
  // MENSAJES PARA ALUNA (Planes Mensuales / Membresías)
  if (isAluna) {
    // Verificar últimos mensajes para contexto de planes
    const lastInteraction = context.lastMessages?.[0];
    const userInput = lastInteraction?.input?.toLowerCase() || '';
    
    // Si mencionó algún plan específico
    if (userInput.includes('plan 10') || userInput.includes('plan10')) {
      return `${greeting} 💼\n\nEstábamos conversando sobre el *Plan 10* (10 días/mes acceso a Hot Desk).\n\n¿Te gustaría conocer más detalles o tienes alguna duda? Puedo ayudarte a encontrar el plan perfecto para ti 🚀`;
    }
    
    if (userInput.includes('plan 20') || userInput.includes('plan20')) {
      return `${greeting} 💼\n\nEstábamos conversando sobre el *Plan 20* (20 días/mes acceso ilimitado).\n\n¿Continuamos? Puedo explicarte todos los beneficios y ayudarte con la contratación 🚀`;
    }
    
    if (userInput.includes('oficina ejecutiva') || userInput.includes('ejecutiva')) {
      return `${greeting} 💼\n\nEstábamos viendo la *Oficina Ejecutiva* (espacio privado XL con acceso ilimitado).\n\n¿Te interesa conocer más sobre este plan premium? 🚀`;
    }
    
    if (userInput.includes('oficina virtual') || userInput.includes('virtual')) {
      return `${greeting} 💼\n\nEstábamos conversando sobre la *Oficina Virtual* (dirección fiscal + secretaria virtual).\n\n¿Quieres que te explique cómo funciona y sus beneficios? 🚀`;
    }
    
    // Mensaje genérico para Aluna
    return `${greeting} 💼\n\nEstábamos conversando sobre nuestros planes mensuales. ¿Te gustaría que retomemos la conversación?\n\nPuedo ayudarte a encontrar el plan perfecto según tus necesidades 🚀`;
  }
  
  // MENSAJES PARA AURORA (Reservas)
  // Si tiene pending confirmation
  if (context.hasPendingConfirmation && context.pendingData) {
    const { spaceType, date, time } = context.pendingData;
    return `${greeting}\n\nVeo que quedamos en una reserva para *${spaceType}* el *${date}* a las *${time}*.\n\n¿Deseas confirmarla, modificarla o cancelarla? 😊`;
  }
  
  // Si tiene formulario parcial
  if (context.hasPartialForm && context.formData) {
    const { spaceType, date, time } = context.formData;
    
    if (spaceType && !date) {
      return `${greeting}\n\nEstábamos coordinando tu reserva para *${spaceType}*. ¿Te gustaría continuar? Puedo ayudarte a elegir fecha y hora 📅`;
    }
    
    if (spaceType && date && !time) {
      return `${greeting}\n\nTenemos la fecha *${date}* para tu *${spaceType}*. ¿Quieres que veamos los horarios disponibles? ⏰`;
    }
    
    return `${greeting}\n\nEstábamos en el proceso de tu reserva. ¿Deseas continuar donde lo dejamos? 😊`;
  }
  
  // Mensaje genérico Aurora
  return `${greeting}\n\nTe escribo para ver si necesitas ayuda con algo. ¿Hay algo en lo que pueda asistirte? 😊`;
}

/**
 * 📤 Envía mensaje de seguimiento via Wassenger
 * @param {string} phoneNumber
 * @param {string} message
 * @param {string} activeAgent - Agente activo del usuario (AURORA o ALUNA)
 * @returns {Promise<boolean>}
 */
export async function sendFollowUpMessage(phoneNumber, message, activeAgent = 'AURORA') {
  try {
    const WASSENGER_TOKEN = process.env.WASSENGER_TOKEN;
    const WASSENGER_DEVICE_ID = process.env.WASSENGER_DEVICE_ID;
    
    if (!WASSENGER_TOKEN || !WASSENGER_DEVICE_ID) {
      console.error('[FOLLOW-UP] ❌ Credenciales de Wassenger no configuradas');
      return false;
    }
    
    const response = await fetch(`https://api.wassenger.com/v1/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Token': WASSENGER_TOKEN
      },
      body: JSON.stringify({
        phone: phoneNumber,
        message: message,
        device: WASSENGER_DEVICE_ID
      })
    });
    
    if (!response.ok) {
      throw new Error(`Wassenger error: ${response.status}`);
    }
    
    const result = await response.json();
    console.log(`[FOLLOW-UP] ✅ Mensaje enviado a ${phoneNumber} via ${activeAgent}`);
    
    // Determinar agente para registro
    const isAluna = activeAgent === 'ALUNA';
    const agentKey = isAluna ? 'aluna' : 'aurora';
    const agentName = isAluna ? 'Aluna' : 'Aurora';
    
    // Registrar en interactions
    await databaseService.run(
      `INSERT INTO interactions (
        user_phone, agent, agent_name, intent_reason, input, output, meta
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        phoneNumber,
        agentKey,
        agentName,
        'follow_up_automatic',
        '',
        message,
        JSON.stringify({ 
          role: 'assistant', 
          timestamp: new Date().toISOString(),
          automatic: true,
          followUp: true
        })
      ]
    );
    
    return true;
  } catch (error) {
    console.error(`[FOLLOW-UP] ❌ Error enviando mensaje a ${phoneNumber}:`, error);
    return false;
  }
}

/**
 * 🚀 Proceso principal de follow-up
 */
export async function processFollowUps() {
  console.log('[FOLLOW-UP] 🚀 Iniciando proceso de seguimiento automático...');
  
  // 1. Verificar horario permitido
  if (!isWithinAllowedHours()) {
    console.log('[FOLLOW-UP] ⏸️ Fuera de horario permitido (6am-10pm Ecuador). Saltando ejecución.');
    return { processed: 0, sent: 0, skipped: 0 };
  }
  
  // 2. Buscar conversaciones abandonadas
  const abandonedUsers = await findAbandonedConversations();
  
  if (abandonedUsers.length === 0) {
    console.log('[FOLLOW-UP] ✅ No hay conversaciones que requieran seguimiento');
    return { processed: 0, sent: 0, skipped: 0 };
  }
  
  let sent = 0;
  let skipped = 0;
  
  // 3. Procesar cada usuario
  for (const user of abandonedUsers) {
    try {
      // Obtener contexto de la conversación
      const context = await getUserConversationContext(user.phone_number);
      
      // Para Aurora: Solo enviar si hay contexto relevante (formulario o pending)
      // Para Aluna: Enviar si hay mensajes previos (siempre hay interés en planes)
      const isAluna = user.active_agent === 'ALUNA';
      if (!isAluna && !context.hasPartialForm && !context.hasPendingConfirmation) {
        console.log(`[FOLLOW-UP] ⏭️ Saltando ${user.phone_number} - sin contexto relevante`);
        skipped++;
        continue;
      }
      
      // Generar mensaje personalizado
      const message = generateFollowUpMessage(user, context);
      
      // Enviar mensaje
      const success = await sendFollowUpMessage(user.phone_number, message, user.active_agent);
      
      if (success) {
        sent++;
        // Pequeña pausa entre mensajes para no sobrecargar
        await new Promise(resolve => setTimeout(resolve, 2000));
      } else {
        skipped++;
      }
    } catch (error) {
      console.error(`[FOLLOW-UP] ❌ Error procesando ${user.phone_number}:`, error);
      skipped++;
    }
  }
  
  console.log(`[FOLLOW-UP] 📊 Resumen: ${sent} enviados, ${skipped} saltados de ${abandonedUsers.length} encontrados`);
  
  return {
    processed: abandonedUsers.length,
    sent,
    skipped
  };
}
