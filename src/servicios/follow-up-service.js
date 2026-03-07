// src/servicios/follow-up-service.js
// 🔔 Sistema de seguimiento automático - UNA vez, 2 horas post-transacción
// + Follow-up específico de Aluna: 24h y 3 días post-consulta de membresías

import databaseService from '../database/database.js';
import {
  findProspectsFor24hFollowUp,
  findProspectsFor3dFollowUp,
  markProspect24hSent,
  markProspect3dSent
} from '../database/alunaRepository.js';

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
 * ⏰ Verifica si estamos en horario de Aluna para enviar follow-ups (8am - 7pm Ecuador)
 */
export function isWithinAlunaFollowUpHours() {
  const now = new Date();
  const ecuadorTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Guayaquil' }));
  const hour = ecuadorTime.getHours();
  const isAllowed = hour >= 8 && hour < 19; // 8:00 AM – 7:00 PM
  console.log(`[ALUNA-FOLLOWUP] ⏰ Hora Ecuador: ${ecuadorTime.toLocaleTimeString('es-EC')} - Aluna permitido: ${isAllowed}`);
  return isAllowed;
}

/**
 * 💌 Genera mensaje de follow-up 24h para Aluna
 */
function buildAluna24hMessage(prospect) {
  const name = (prospect.user_name || '').split(' ')[0] || 'Hola';
  const plan = prospect.membership_type ? `*${prospect.membership_type}*` : 'nuestros planes de membresía';
  return `Hola ${name} 🌙

Ayer conversamos sobre ${plan} y quería saber si tuviste la oportunidad de revisar la info 😊

¿Tienes alguna duda o necesitas más detalles?

Y si quieres conocer el espacio antes de decidir, *te invito a venir un día completo sin ningún costo* — de *8am a 7pm*, usas todo como si ya fuera tu oficina. Solo di que eres invitada/o de Aluna en recepción 🏢✨

Sin compromiso, solo para que lo vivas. ¿Cuándo te quedaría bien?`;
}

/**
 * 💌 Genera mensaje de follow-up 3 días para Aluna
 */
function buildAluna3dMessage(prospect) {
  const name = (prospect.user_name || '').split(' ')[0] || 'Hola';
  const plan = prospect.membership_type ? `*${prospect.membership_type}*` : 'una membresía';
  return `Hola ${name} 👋

¿Cómo estás? Hace unos días charlamos sobre ${plan} y quería hacer un último intento antes de cerrar tu expediente 😊

*Mi propuesta concreta:* ven a Coworkia un día completo, completamente gratis.

📍 *Tu día de prueba:*
• Sin costo, sin restricciones de horario
• De *8am a 7pm* — usas todo el espacio
• Hot desk, WiFi ultra rápido, café, locker, sala de reuniones
• Solo di en recepción que eres invitada/o de Aluna 🏢

Es mi invitación personal para que lo vivas y decidas con info de primera mano.

¿Qué día de esta semana te queda bien? 🗓️

_(Si ya tomaste otra decisión o las circunstancias cambiaron, no hay problema — aquí estaré cuando lo necesites 😊)_`;
}

/**
 * 📤 Envía mensaje Aluna y registra en interactions
 */
async function sendAlunaFollowUpMessage(prospect, message, followUpType) {
  try {
    const WASSENGER_TOKEN = process.env.WASSENGER_TOKEN;
    const WASSENGER_DEVICE_ID = process.env.WASSENGER_DEVICE_ID;

    if (!WASSENGER_TOKEN || !WASSENGER_DEVICE_ID) {
      console.error('[ALUNA-FOLLOWUP] ❌ Credenciales Wassenger no configuradas');
      return false;
    }

    const response = await fetch('https://api.wassenger.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Token': WASSENGER_TOKEN },
      body: JSON.stringify({
        phone: prospect.user_phone,
        message,
        device: WASSENGER_DEVICE_ID
      })
    });

    if (!response.ok) throw new Error(`Wassenger error: ${response.status}`);

    console.log(`[ALUNA-FOLLOWUP] ✅ ${followUpType} enviado a ${prospect.user_phone}`);

    await databaseService.run(
      `INSERT INTO interactions (
        user_phone, agent, agent_name, intent_reason, input, output, meta
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        prospect.user_phone,
        'aluna',
        'Aluna - Closer Membresías',
        `aluna_followup_${followUpType}`,
        '',
        message,
        JSON.stringify({ automatic: true, followUp: true, type: followUpType, timestamp: new Date().toISOString() })
      ]
    );
    return true;
  } catch (err) {
    console.error(`[ALUNA-FOLLOWUP] ❌ Error enviando a ${prospect.user_phone}:`, err.message);
    return false;
  }
}

/**
 * 🌙 Proceso principal de follow-up Aluna (24h + 3 días)
 * Corre cada 30 min desde el cron. Respeta horario 8am-7pm Ecuador.
 */
export async function processAlunaLeadFollowUps() {
  console.log('[ALUNA-FOLLOWUP] 🚀 Iniciando verificación de prospectos Aluna...');

  if (!isWithinAlunaFollowUpHours()) {
    console.log('[ALUNA-FOLLOWUP] ⏸️ Fuera de horario (8am-7pm). Saltando ejecución.');
    return { sent24h: 0, sent3d: 0, skipped: 0 };
  }

  let sent24h = 0, sent3d = 0, skipped = 0;

  // ── RONDA 1: Follow-up de 24 horas ──────────────────────────────────────
  const prospects24h = await findProspectsFor24hFollowUp();
  console.log(`[ALUNA-FOLLOWUP] 🔍 Prospectos para 24h: ${prospects24h.length}`);

  for (const prospect of prospects24h) {
    try {
      const message = buildAluna24hMessage(prospect);
      const ok = await sendAlunaFollowUpMessage(prospect, message, '24h');
      if (ok) {
        await markProspect24hSent(prospect.user_phone);
        sent24h++;
        await new Promise(r => setTimeout(r, 2000)); // pausa entre mensajes
      } else {
        skipped++;
      }
    } catch (err) {
      console.error(`[ALUNA-FOLLOWUP] ❌ Error 24h ${prospect.user_phone}:`, err.message);
      skipped++;
    }
  }

  // ── RONDA 2: Follow-up de 3 días ─────────────────────────────────────────
  const prospects3d = await findProspectsFor3dFollowUp();
  console.log(`[ALUNA-FOLLOWUP] 🔍 Prospectos para 3d: ${prospects3d.length}`);

  for (const prospect of prospects3d) {
    try {
      const message = buildAluna3dMessage(prospect);
      const ok = await sendAlunaFollowUpMessage(prospect, message, '3d');
      if (ok) {
        await markProspect3dSent(prospect.user_phone);
        sent3d++;
        await new Promise(r => setTimeout(r, 2000));
      } else {
        skipped++;
      }
    } catch (err) {
      console.error(`[ALUNA-FOLLOWUP] ❌ Error 3d ${prospect.user_phone}:`, err.message);
      skipped++;
    }
  }

  console.log(`[ALUNA-FOLLOWUP] 📊 Resumen: ${sent24h} enviados (24h), ${sent3d} enviados (3d), ${skipped} saltados`);
  return { sent24h, sent3d, skipped };
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
