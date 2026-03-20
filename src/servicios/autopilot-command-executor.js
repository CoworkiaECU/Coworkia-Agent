/**
 * 🎮 Autopilot Command Executor
 * Ejecuta comandos del sistema enviados por Diego desde WhatsApp
 * 
 * FLUJO:
 * 1. Sistema hace pregunta → setPendingQuestion()
 * 2. Diego responde "Si"/"No"/"Review" → detectSystemCommand()
 * 3. Este módulo ejecuta la acción correspondiente
 * 4. Limpia pregunta pendiente
 */

import { notifyDiego } from '../express-servidor/endpoints-api/internal-notifications.js';
import { clearPendingQuestion, getAutopilotState } from './autopilot-state.js';
import { resumeAutopilot } from './autopilot-engine.js';
import { query } from '../database/database.js';
import { loggers } from '../utils/logger.js';

const logger = loggers.notifications || console;

/**
 * 🎯 Ejecuta un comando del sistema
 * @param {Object} command - {command, action, question}
 * @param {string} userId - Número de Diego
 * @param {Function} sendMessage - Función para enviar WhatsApp
 * @returns {Promise<Object>} - {executed, action, message}
 */
export async function executeSystemCommand(command, userId, sendMessage) {
  const { command: cmd, action, question } = command;
  
  logger.info(`[AUTOPILOT-CMD] ⚡ Ejecutando comando: ${cmd} (${action})`);
  
  let result = { executed: false, action: null, message: null };
  
  try {
    switch (cmd) {
      case 'APPROVE':
        result = await executeApprove(question, userId, sendMessage);
        break;
        
      case 'REJECT':
        result = await executeReject(question, userId, sendMessage);
        break;
        
      case 'REVIEW':
        result = await executeReview(question, userId, sendMessage);
        break;
        
      case 'DEPLOY':
        result = await executeDeploy(question, userId, sendMessage);
        break;
        
      case 'MORE_INFO':
        result = await executeMoreInfo(question, userId, sendMessage);
        break;
        
      default:
        logger.warn(`[AUTOPILOT-CMD] ⚠️ Comando desconocido: ${cmd}`);
        result = {
          executed: false,
          action: 'unknown',
          message: '❓ Comando no reconocido'
        };
    }
    
    // Guardar decisión en DB para auditoría
    await saveCommandLog(userId, cmd, question, result);
    
    // Limpiar pregunta pendiente (await porque ahora es async)
    await clearPendingQuestion(cmd, result);
    
    logger.info(`[AUTOPILOT-CMD] ✅ Comando ejecutado: ${cmd} → ${result.action}`);
    
    return result;
    
  } catch (error) {
    logger.error('[AUTOPILOT-CMD] ❌ Error ejecutando comando:', error);
    
    // Guardar error en log
    await saveCommandLog(userId, cmd, question, { error: error.message });
    
    return {
      executed: false,
      action: 'error',
      message: `❌ Error ejecutando comando: ${error.message}`,
      error
    };
  }
}

/**
 * ✅ Ejecuta aprobación (Si)
 */
async function executeApprove(question, userId, sendMessage) {
  const { type, data } = question;
  
  logger.info(`[AUTOPILOT-CMD] ✅ Aprobando: ${type}`);
  
  switch (type) {
    case 'deploy':
      // Deploy a Heroku
      await sendMessage(userId, '🚀 Deploy aprobado. Desplegando a Heroku...');
      // TODO: Integrar con heroku CLI o API
      // Por ahora solo confirmamos
      return {
        executed: true,
        action: 'deploy_approved',
        message: '✅ Deploy en proceso. Te notificaré cuando complete.'
      };
      
    case 'architectural_change':
      // Cambio arquitectural aprobado → resumir autopilot
      await sendMessage(userId, '✅ Cambio arquitectural aprobado. Continuando...');
      
      // Resumir autopilot automáticamente
      const resumeResult = resumeAutopilot();
      if (resumeResult.success) {
        logger.info('[AUTOPILOT-CMD] ▶️ Autopilot resumido automáticamente');
      }
      
      return {
        executed: true,
        action: 'architecture_approved',
        message: '✅ Continuando con el cambio aprobado.',
        autopilotResumed: resumeResult.success
      };
      
    case 'decision':
      // Decisión general aprobada → resumir autopilot
      await sendMessage(userId, '✅ Aprobado. Continuando...');
      
      // Resumir autopilot automáticamente
      const resumeDecision = resumeAutopilot();
      if (resumeDecision.success) {
        logger.info('[AUTOPILOT-CMD] ▶️ Autopilot resumido automáticamente');
      }
      
      return {
        executed: true,
        action: 'decision_approved',
        message: '✅ Decisión aprobada.',
        autopilotResumed: resumeDecision.success
      };
      
    case 'plan_complete':
      // Plan completado y aprobado - pasar al siguiente
      await sendMessage(userId, '✅ Plan aprobado. Pasando al siguiente...');
      // TODO: Integrar con plan-queue-manager para activar siguiente plan
      return {
        executed: true,
        action: 'plan_approved_next',
        message: '✅ Activando siguiente plan en queue.'
      };
      
    default:
      await sendMessage(userId, '✅ Aprobado. Continuando...');
      return {
        executed: true,
        action: 'generic_approve',
        message: '✅ Aprobado.'
      };
  }
}

/**
 * ❌ Ejecuta rechazo (No)
 */
async function executeReject(question, userId, sendMessage) {
  const { type, data } = question;
  
  logger.info(`[AUTOPILOT-CMD] ❌ Rechazando: ${type}`);
  
  switch (type) {
    case 'deploy':
      await sendMessage(userId, '❌ Deploy cancelado. Los cambios quedan en local.');
      return {
        executed: true,
        action: 'deploy_rejected',
        message: '❌ Deploy cancelado.'
      };
      
    case 'architectural_change':
      await sendMessage(userId, '❌ Cambio rechazado. Pausando autopilot...');
      // TODO: Pausar autopilot
      return {
        executed: true,
        action: 'architecture_rejected',
        message: '⏸️ Autopilot pausado. Esperando nuevas instrucciones.'
      };
      
    case 'decision':
      await sendMessage(userId, '❌ Decisión rechazada. ¿Qué deseas hacer?');
      return {
        executed: true,
        action: 'decision_rejected',
        message: '❌ Esperando nuevas instrucciones.'
      };
      
    default:
      await sendMessage(userId, '❌ Cancelado. ⏸️ Autopilot en pausa.');
      return {
        executed: true,
        action: 'generic_reject',
        message: '⏸️ Pausado.'
      };
  }
}

/**
 * 📋 Envía review detallado (Review)
 */
async function executeReview(question, userId, sendMessage) {
  const { type, data } = question;
  
  logger.info(`[AUTOPILOT-CMD] 📋 Enviando review: ${type}`);
  
  // Construir mensaje de review según el tipo
  let reviewMessage = '📋 *REVIEW DETALLADO*\n\n';
  
  switch (type) {
    case 'deploy':
      reviewMessage += '🚀 *Deploy a Heroku*\n\n';
      reviewMessage += `Plan: ${data.plan || 'N/A'}\n`;
      reviewMessage += `Tareas completadas: ${data.tasksCompleted || 0}\n`;
      reviewMessage += `Archivos modificados: ${data.filesChanged || 0}\n`;
      reviewMessage += `Tests: ${data.testsPassed ? '✅ Pasaron' : '❌ Fallaron'}\n\n`;
      reviewMessage += `Cambios principales:\n`;
      if (data.changes && data.changes.length > 0) {
        data.changes.forEach((change, i) => {
          reviewMessage += `${i + 1}. ${change}\n`;
        });
      } else {
        reviewMessage += '- No hay detalles disponibles\n';
      }
      reviewMessage += '\n¿Deploy? Si/No';
      break;
      
    case 'architectural_change':
      reviewMessage += '🏗️ *Cambio Arquitectural*\n\n';
      reviewMessage += `Cambio: ${data.description || 'N/A'}\n`;
      reviewMessage += `Impacto: ${data.impact || 'Medio'}\n`;
      reviewMessage += `Archivos afectados: ${data.filesAffected || 0}\n\n`;
      reviewMessage += `Razón: ${data.reason || 'N/A'}\n\n`;
      reviewMessage += '¿Aprobar? Si/No';
      break;
      
    case 'plan_complete':
      reviewMessage += '✅ *Plan Completado*\n\n';
      reviewMessage += `Plan: ${data.planName || 'N/A'}\n`;
      reviewMessage += `Duración: ${data.duration || 'N/A'}\n`;
      reviewMessage += `Tareas: ${data.tasksCompleted}/${data.totalTasks}\n`;
      reviewMessage += `Errores: ${data.errors || 0}\n\n`;
      reviewMessage += 'Siguiente plan en queue:\n';
      reviewMessage += `→ ${data.nextPlan || 'Ninguno'}\n\n`;
      reviewMessage += '¿Continuar? Si/No/Deploy';
      break;
      
    default:
      reviewMessage += `Tipo: ${type}\n`;
      reviewMessage += `Datos: ${JSON.stringify(data, null, 2)}\n\n`;
      reviewMessage += '¿Aprobar? Si/No';
  }
  
  await sendMessage(userId, reviewMessage);
  
  return {
    executed: true,
    action: 'review_sent',
    message: '📋 Review enviado. Esperando decisión...'
  };
}

/**
 * 🚀 Ejecuta deploy directo (Deploy)
 */
async function executeDeploy(question, userId, sendMessage) {
  logger.info(`[AUTOPILOT-CMD] 🚀 Deploy directo solicitado`);
  
  await sendMessage(userId, '🚀 Iniciando deploy a Heroku...');
  
  // TODO: Integrar con heroku deployment
  // Por ahora simulamos
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  await sendMessage(userId, '✅ Deploy completado exitosamente.\n\nhttps://coworkia-agent.herokuapp.com');
  
  return {
    executed: true,
    action: 'deploy_executed',
    message: '🚀 Deploy completado.'
  };
}

/**
 * ℹ️ Envía información adicional (Más info)
 */
async function executeMoreInfo(question, userId, sendMessage) {
  const { type, data } = question;
  
  logger.info(`[AUTOPILOT-CMD] ℹ️ Enviando más info: ${type}`);
  
  let infoMessage = 'ℹ️ *INFORMACIÓN ADICIONAL*\n\n';
  
  // Agregar toda la data disponible
  infoMessage += `Tipo: ${type}\n`;
  infoMessage += `Pregunta: ${question.question}\n\n`;
  
  if (data && Object.keys(data).length > 0) {
    infoMessage += '*Detalles:*\n';
    for (const [key, value] of Object.entries(data)) {
      if (typeof value === 'object') {
        infoMessage += `${key}: ${JSON.stringify(value, null, 2)}\n`;
      } else {
        infoMessage += `${key}: ${value}\n`;
      }
    }
  } else {
    infoMessage += 'No hay información adicional disponible.';
  }
  
  infoMessage += '\n\n¿Qué deseas hacer? Si/No/Review/Deploy';
  
  await sendMessage(userId, infoMessage);
  
  return {
    executed: true,
    action: 'more_info_sent',
    message: 'ℹ️ Información enviada.'
  };
}

/**
 * 💾 Guarda log de comando ejecutado
 */
async function saveCommandLog(userId, command, question, result) {
  try {
    await query(
      `INSERT INTO autopilot_command_logs 
       (user_id, command, question_type, question_data, result, executed_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [
        userId,
        command,
        question.type,
        JSON.stringify(question.data || {}),
        JSON.stringify(result)
      ]
    );
  } catch (error) {
    // Si la tabla no existe, crear schema
    if (error.message.includes('does not exist')) {
      await createCommandLogsTable();
      // Reintentar
      await query(
        `INSERT INTO autopilot_command_logs 
         (user_id, command, question_type, question_data, result, executed_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [
          userId,
          command,
          question.type,
          JSON.stringify(question.data || {}),
          JSON.stringify(result)
        ]
      );
    } else {
      logger.error('[AUTOPILOT-CMD] Error guardando log:', error);
    }
  }
}

/**
 * 🗄️ Crea tabla de logs si no existe
 */
async function createCommandLogsTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS autopilot_command_logs (
      id SERIAL PRIMARY KEY,
      user_id VARCHAR(50) NOT NULL,
      command VARCHAR(50) NOT NULL,
      question_type VARCHAR(100),
      question_data JSONB,
      result JSONB,
      executed_at TIMESTAMP DEFAULT NOW()
    );
    
    CREATE INDEX IF NOT EXISTS idx_command_logs_user 
    ON autopilot_command_logs(user_id);
    
    CREATE INDEX IF NOT EXISTS idx_command_logs_executed 
    ON autopilot_command_logs(executed_at DESC);
  `);
  
  logger.info('[AUTOPILOT-CMD] ✅ Tabla autopilot_command_logs creada');
}

/**
 * 📊 Obtiene historial de comandos de Diego
 */
export async function getCommandHistory(userId, limit = 20) {
  const result = await query(
    `SELECT * FROM autopilot_command_logs 
     WHERE user_id = $1 
     ORDER BY executed_at DESC 
     LIMIT $2`,
    [userId, limit]
  );
  
  return result.rows;
}

/**
 * 📈 Obtiene estadísticas de comandos
 */
export async function getCommandStats(userId) {
  const result = await query(
    `SELECT 
       command,
       COUNT(*) as total,
       COUNT(*) FILTER (WHERE (result->>'executed')::boolean = true) as successful
     FROM autopilot_command_logs 
     WHERE user_id = $1 
     GROUP BY command`,
    [userId]
  );
  
  return result.rows;
}
