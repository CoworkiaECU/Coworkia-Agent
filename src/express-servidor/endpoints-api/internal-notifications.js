/**
 * 📱 Internal Notifications System
 * Sistema de notificaciones al celular personal de Diego
 * 
 * Tipos de notificaciones:
 * - success: Plan completado exitosamente
 * - error: Error crítico que requiere atención
 * - question: Necesita decisión/aprobación
 * - checkpoint: Progreso intermedio (opcional)
 */

import { enviarWhatsApp } from './wassenger.js';
import { loggers } from '../../utils/logger.js';

// Número personal de Diego (desde .env)
const DIEGO_PERSONAL = process.env.DIEGO_PERSONAL_PHONE;
const NOTIFICATIONS_ENABLED = process.env.NOTIFICATIONS_ENABLED === 'true';
const NOTIFICATIONS_CHECKPOINT = process.env.NOTIFICATIONS_CHECKPOINT === 'true';

/**
 * ✉️ Envía notificación a celular personal de Diego
 * @param {string} type - 'success' | 'error' | 'question' | 'checkpoint'
 * @param {string} title - Título corto de la notificación
 * @param {object} data - Datos específicos del tipo
 * @returns {Promise<{success: boolean, fallback?: string}>}
 */
export async function notifyDiego(type, title, data = {}) {
  // Verificar que esté habilitado
  if (!NOTIFICATIONS_ENABLED) {
    console.log('[NOTIFY] Notificaciones deshabilitadas (NOTIFICATIONS_ENABLED=false)');
    return { success: false, reason: 'disabled' };
  }

  // Verificar que exista el número
  if (!DIEGO_PERSONAL) {
    console.warn('[NOTIFY] DIEGO_PERSONAL_PHONE no configurado en .env');
    return { success: false, reason: 'no_phone' };
  }

  // Checkpoint solo si está habilitado
  if (type === 'checkpoint' && !NOTIFICATIONS_CHECKPOINT) {
    console.log('[NOTIFY] Checkpoint skipped (NOTIFICATIONS_CHECKPOINT=false)');
    return { success: false, reason: 'checkpoint_disabled' };
  }

  try {
    const message = formatNotificationMessage(type, title, data);
    
    loggers.notifications?.info('Sending notification', { type, title });
    
    const result = await enviarWhatsApp(DIEGO_PERSONAL, message);
    
    if (result.ok) {
      console.log(`[NOTIFY] ✅ Notificación ${type} enviada a Diego`);
      
      // Guardar en log opcional
      await saveNotificationLog(type, title, data, 'sent');
      
      return { success: true };
    } else {
      console.error(`[NOTIFY] ❌ Error enviando notificación: ${result.error}`);
      
      // Fallback a email si WhatsApp falla
      const emailSent = await sendEmailFallback(type, title, data);
      
      return { 
        success: false, 
        fallback: emailSent ? 'email' : 'none',
        error: result.error 
      };
    }
  } catch (error) {
    console.error('[NOTIFY] Exception en notifyDiego:', error);
    
    // Intentar fallback a email
    await sendEmailFallback(type, title, data);
    
    return { success: false, error: error.message, fallback: 'email_attempted' };
  }
}

/**
 * 📝 Formatea el mensaje según el tipo de notificación
 */
function formatNotificationMessage(type, title, data) {
  const emojis = {
    success: '✅',
    error: '🚨',
    question: '❓',
    checkpoint: '🔵'
  };
  
  const emoji = emojis[type] || '📬';
  let message = `${emoji} *Aurora Agent: ${title}*\n\n`;
  
  switch (type) {
    case 'success':
      message += formatSuccessNotification(data);
      break;
    case 'error':
      message += formatErrorNotification(data);
      break;
    case 'question':
      message += formatQuestionNotification(data);
      break;
    case 'checkpoint':
      message += formatCheckpointNotification(data);
      break;
    default:
      message += JSON.stringify(data, null, 2);
  }
  
  return message;
}

/**
 * ✅ Formato de notificación de éxito
 */
function formatSuccessNotification(data) {
  const {
    plan,
    tasks,
    tasksCompleted,
    tasksTotal,
    time,
    commits = [],
    stats = {}
  } = data;
  
  let msg = `📋 *Plan*: ${plan || 'Desconocido'}\n`;
  msg += `⏱️ *Tiempo*: ${time || 'N/A'}\n`;
  
  if (tasksTotal) {
    msg += `📦 *Tareas*: ${tasksCompleted || tasks}/${tasksTotal} completadas\n`;
  } else if (tasks) {
    msg += `📦 *Tareas*: ${tasks} completadas\n`;
  }
  
  if (commits.length > 0) {
    msg += `\n📝 *Commits*:\n`;
    commits.slice(0, 3).forEach(c => msg += `• ${c}\n`);
  }
  
  if (stats.filesModified) {
    msg += `\n📊 *Cambios*:\n`;
    msg += `• ${stats.filesModified} archivos modificados\n`;
    if (stats.linesAdded) msg += `• +${stats.linesAdded} / -${stats.linesRemoved || 0} líneas\n`;
    if (stats.testsRun) msg += `• ${stats.testsRun} tests pasando ✓\n`;
  }
  
  msg += `\n🚀 *¿Deploy a Heroku?*\n`;
  msg += `Responde: Si / No / Review`;
  
  return msg;
}

/**
 * 🚨 Formato de notificación de error
 */
function formatErrorNotification(data) {
  const {
    error,
    errorType,
    context,
    since,
    attempts,
    affectedUsers,
    action
  } = data;
  
  let msg = `❌ *Error*: ${error || 'Desconocido'}\n`;
  
  if (errorType) msg += `🔍 *Tipo*: ${errorType}\n`;
  if (since) msg += `🕐 *Desde*: ${since}\n`;
  if (attempts) msg += `🔁 *Intentos*: ${attempts}\n`;
  if (affectedUsers) msg += `👥 *Usuarios afectados*: ~${affectedUsers}\n`;
  
  if (context) {
    msg += `\n📋 *Contexto*:\n${context}\n`;
  }
  
  if (action) {
    msg += `\n🔧 *Acción tomada*:\n${action}\n`;
  }
  
  msg += `\n⚠️ *Se requiere tu intervención*`;
  
  return msg;
}

/**
 * ❓ Formato de notificación de pregunta/decisión
 */
function formatQuestionNotification(data) {
  const {
    task,
    taskNumber,
    totalTasks,
    question,
    context,
    reason,
    impact,
    pros = [],
    cons = [],
    options = ['Si', 'No', 'Más info']
  } = data;
  
  let msg = '';
  
  if (task) {
    msg += `📋 *Tarea*: ${task}\n`;
    if (taskNumber && totalTasks) {
      msg += `📊 *Progreso*: ${taskNumber}/${totalTasks}\n`;
    }
    msg += `\n`;
  }
  
  if (question) {
    msg += `❓ *Pregunta*:\n${question}\n\n`;
  }
  
  if (reason) {
    msg += `🔍 *Razón*: ${reason}\n`;
  }
  
  if (context) {
    msg += `📋 *Contexto*:\n${context}\n\n`;
  }
  
  if (impact) {
    msg += `⚡ *Impacto*: ${impact}\n\n`;
  }
  
  if (pros.length > 0) {
    msg += `✅ *Pros*:\n`;
    pros.forEach(p => msg += `• ${p}\n`);
    msg += `\n`;
  }
  
  if (cons.length > 0) {
    msg += `⚠️ *Contras*:\n`;
    cons.forEach(c => msg += `• ${c}\n`);
    msg += `\n`;
  }
  
  msg += `*¿Procedo?*\n`;
  msg += `Responde: ${options.join(' / ')}`;
  
  return msg;
}

/**
 * 🔵 Formato de notificación de checkpoint
 */
function formatCheckpointNotification(data) {
  const {
    checkpoint,
    totalCheckpoints,
    block,
    tasksCompleted,
    time,
    commit,
    nextBlock,
    eta,
    status = 'ok'
  } = data;
  
  let msg = '';
  
  if (checkpoint && totalCheckpoints) {
    msg += `🔵 *Checkpoint ${checkpoint}/${totalCheckpoints}*\n\n`;
  }
  
  if (block) {
    msg += `✅ *${block}* completado\n`;
  }
  
  if (tasksCompleted) {
    msg += `📦 *Tareas*: ${tasksCompleted} completadas\n`;
  }
  
  if (time) {
    msg += `⏱️ *Tiempo*: ${time}\n`;
  }
  
  if (commit) {
    msg += `📝 *Commit*: ${commit}\n`;
  }
  
  if (nextBlock) {
    msg += `\n🔄 *Siguiente*: ${nextBlock}\n`;
    if (eta) msg += `⏱️ *ETA*: ${eta}\n`;
  }
  
  const statusEmoji = status === 'ok' ? '🟢' : status === 'warning' ? '🟡' : '🔴';
  msg += `\n${statusEmoji} Todo fluye bien`;
  
  return msg;
}

/**
 * 📧 Fallback a email si WhatsApp falla
 */
async function sendEmailFallback(type, title, data) {
  const FALLBACK_EMAIL = process.env.NOTIFICATIONS_FALLBACK_EMAIL || 'diego@coworkia.com';
  
  // TODO: Implementar envío de email
  // Por ahora solo logueamos
  console.log('[NOTIFY] 📧 Fallback email needed:', { type, title, to: FALLBACK_EMAIL });
  
  return false; // No implementado aún
}

/**
 * 💾 Guarda log de notificación en BD (opcional)
 */
async function saveNotificationLog(type, title, data, status) {
  // TODO: Guardar en tabla notification_logs si existe
  // Por ahora solo logueamos
  console.log('[NOTIFY] 💾 Log:', { type, title, status, timestamp: new Date().toISOString() });
}

/**
 * 🧪 Test de notificación (para debugging)
 */
export async function testNotification() {
  console.log('[NOTIFY] 🧪 Enviando notificación de prueba...');
  
  const result = await notifyDiego('checkpoint', 'Test del Sistema', {
    checkpoint: 1,
    totalCheckpoints: 3,
    block: 'Bloque de Prueba',
    tasksCompleted: 3,
    time: '15 min',
    commit: 'v999',
    nextBlock: 'Siguiente Bloque',
    eta: '10-15 min',
    status: 'ok'
  });
  
  return result;
}
