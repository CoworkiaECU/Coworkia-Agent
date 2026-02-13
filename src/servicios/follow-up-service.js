// src/servicios/follow-up-service.js
// 🔔 Sistema de seguimiento automático - UNA vez, 2 horas post-transacción

import databaseService from '../database/database.js';

const TWO_HOURS_MS = 120 * 60 * 1000; // 2 horas en milisegundos

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
 * 🔍 Encuentra usuarios con transacciones pendientes que necesitan follow-up
 * Criterios:
 * - transactionStartedAt existe (hay transacción en curso)
 * - Han pasado >= 120 minutos desde inicio
 * - followUpSentAt es NULL (no se ha enviado follow-up)
 * @returns {Promise<Array>}
 */
export async function findUsersNeedingFollowUp() {
  try {
    const now = new Date();
    const twoHoursAgo = new Date(now.getTime() - TWO_HOURS_MS);
    
    // Buscar usuarios con transacciones >= 2h sin follow-up enviado
    const query = `
      SELECT 
        u.phone_number,
        u.name,
        u.active_agent,
        u.transaction_started_at,
        u.transaction_agent,
        u.follow_up_sent_at
      FROM users u
      WHERE u.transaction_started_at IS NOT NULL
        AND u.transaction_started_at <= $1
        AND u.follow_up_sent_at IS NULL
      ORDER BY u.transaction_started_at ASC
      LIMIT 50
    `;
    
    const users = await databaseService.all(query, [twoHoursAgo]);
    
    console.log(`[FOLLOW-UP] 🔍 Encontrados ${users.length} usuarios que necesitan follow-up`);
    
    return users;
  } catch (error) {
    console.error('[FOLLOW-UP] ❌ Error buscando usuarios:', error);
    return [];
  }
}

/**
 * � Genera mensaje de seguimiento según agente especializado
 * @param {Object} user
 * @returns {string}
 */
export function generateFollowUpMessage(user) {
  const name = user.name || 'Hola';
  const agent = user.transaction_agent || user.active_agent || 'AURORA';
  
  // Mensajes específicos por agente
  const messages = {
    AURORA: `Hola ${name} 👋

Han pasado 2 horas desde que iniciaste tu reserva. El tiempo de espera se terminó.

Cuando estés listo para una nueva reserva, solo escríbeme y con gusto te ayudo. 😊

¡Hasta pronto!`,

    AXEL: `Hola ${name} 🚗

Han pasado 2 horas desde tu consulta de cotización. 

Con todo gusto puedes retomar el servicio cuando lo necesites, solo envíame un mensaje.

¡Estoy aquí para ayudarte! 🔧`,

    ALUNA: `Hola ${name} ⚖️

Han pasado 2 horas desde tu consulta legal.

Cuando necesites asesoría nuevamente, estaré encantada de ayudarte.

¡Que tengas un excelente día!`,

    ADRIANA: `Hola ${name} 📄

Han pasado 2 horas desde que iniciamos el proceso de constitución.

Si deseas continuar en otro momento, estaré aquí para apoyarte.

¡Saludos cordiales!`,

    ENZO: `Hola ${name} 🎨

Han pasado 2 horas desde tu consulta de marketing.

Cuando quieras retomar el proyecto, con gusto te atiendo.

¡Nos vemos pronto!`,

    ANGELA: `Hola ${name} 💰

Han pasado 2 horas desde tu consulta contable.

Estoy disponible cuando necesites mis servicios nuevamente.

¡Cuídate!`,

    GABI: `Hola ${name} 📊

Han pasado 2 horas desde tu consulta administrativa.

Con gusto te ayudo cuando lo necesites.

¡Hasta pronto!`
  };
  
  return messages[agent] || messages.AURORA;
}

/**
 * 📤 Envía mensaje de seguimiento via Wassenger
 * @param {string} phoneNumber
 * @param {string} message
 * @param {string} agent - Agente que envía el follow-up
 * @returns {Promise<boolean>}
 */
export async function sendFollowUpMessage(phoneNumber, message, agent = 'AURORA') {
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
    
    console.log(`[FOLLOW-UP] ✅ Mensaje enviado a ${phoneNumber} via ${agent}`);
    
    // Registrar en interactions
    await databaseService.run(
      `INSERT INTO interactions (
        user_phone, agent, agent_name, intent_reason, input, output, meta
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        phoneNumber,
        agent.toLowerCase(),
        agent,
        'follow_up_2h_timeout',
        '',
        message,
        JSON.stringify({ 
          role: 'assistant', 
          timestamp: new Date().toISOString(),
          automatic: true,
          followUp: true,
          type: '2h_transaction_timeout'
        })
      ]
    );
    
    // Marcar follow-up como enviado
    await databaseService.run(
      `UPDATE users 
       SET follow_up_sent_at = $1 
       WHERE phone_number = $2`,
      [Date.now(), phoneNumber]
    );
    
    return true;
  } catch (error) {
    console.error(`[FOLLOW-UP] ❌ Error enviando mensaje a ${phoneNumber}:`, error);
    return false;
  }
}

/**
 * 🚀 Proceso principal de follow-up
 * Ejecuta cada 30 minutos, envía UNA vez después de 2h de iniciar transacción
 */
export async function processFollowUps() {
  console.log('[FOLLOW-UP] 🚀 Iniciando verificación de transacciones pendientes...');
  
  // 1. Verificar horario permitido
  if (!isWithinAllowedHours()) {
    console.log('[FOLLOW-UP] ⏸️ Fuera de horario permitido (6am-10pm Ecuador). Saltando ejecución.');
    return { processed: 0, sent: 0, skipped: 0 };
  }
  
  // 2. Buscar usuarios que necesitan follow-up
  const usersNeedingFollowUp = await findUsersNeedingFollowUp();
  
  if (usersNeedingFollowUp.length === 0) {
    console.log('[FOLLOW-UP] ✅ No hay transacciones que requieran seguimiento');
    return { processed: 0, sent: 0, skipped: 0 };
  }
  
  let sent = 0;
  let skipped = 0;
  
  // 3. Procesar cada usuario
  for (const user of usersNeedingFollowUp) {
    try {
      // Generar mensaje según agente
      const message = generateFollowUpMessage(user);
      
      // Enviar mensaje
      const success = await sendFollowUpMessage(
        user.phone_number, 
        message, 
        user.transaction_agent || user.active_agent
      );
      
      if (success) {
        sent++;
        // Pausa entre mensajes
        await new Promise(resolve => setTimeout(resolve, 2000));
      } else {
        skipped++;
      }
    } catch (error) {
      console.error(`[FOLLOW-UP] ❌ Error procesando ${user.phone_number}:`, error);
      skipped++;
    }
  }
  
  console.log(`[FOLLOW-UP] 📊 Resumen: ${sent} enviados, ${skipped} saltados de ${usersNeedingFollowUp.length} encontrados`);
  
  return {
    processed: usersNeedingFollowUp.length,
    sent,
    skipped
  };
}
