/**
 * 💾 Autopilot Question Persistence
 * Guarda y recupera preguntas pendientes desde PostgreSQL
 * 
 * PROPÓSITO:
 * - Persistir preguntas pendientes aunque el servidor se reinicie
 * - Recuperar estado al arrancar
 * - Historial de todas las preguntas/respuestas
 */

import { query } from '../database/database.js';
import { loggers } from '../utils/logger.js';

const logger = loggers.notifications || console;

/**
 * 💾 Guarda pregunta pendiente en DB
 */
export async function savePendingQuestion(userId, questionType, questionText, data = {}) {
  try {
    // Invalidar preguntas anteriores del mismo usuario
    await query(
      `UPDATE autopilot_pending_questions 
       SET status = 'expired', expired_at = NOW()
       WHERE user_id = $1 AND status = 'pending'`,
      [userId]
    );
    
    // Insertar nueva pregunta
    const result = await query(
      `INSERT INTO autopilot_pending_questions 
       (user_id, question_type, question_text, question_data, asked_at, expires_at, status)
       VALUES ($1, $2, $3, $4, NOW(), NOW() + INTERVAL '24 hours', 'pending')
       RETURNING id`,
      [userId, questionType, questionText, JSON.stringify(data)]
    );
    
    logger.info(`[AUTOPILOT-DB] 💾 Pregunta guardada: ${questionType} (ID: ${result.rows[0].id})`);
    
    return result.rows[0].id;
    
  } catch (error) {
    // Si la tabla no existe, crearla
    if (error.message.includes('does not exist')) {
      await createPendingQuestionsTable();
      // Reintentar
      return await savePendingQuestion(userId, questionType, questionText, data);
    }
    
    logger.error('[AUTOPILOT-DB] ❌ Error guardando pregunta:', error);
    throw error;
  }
}

/**
 * 🔍 Obtiene pregunta pendiente del usuario
 */
export async function getPendingQuestion(userId) {
  try {
    const result = await query(
      `SELECT * FROM autopilot_pending_questions 
       WHERE user_id = $1 
         AND status = 'pending' 
         AND expires_at > NOW()
       ORDER BY asked_at DESC 
       LIMIT 1`,
      [userId]
    );
    
    if (result.rows.length === 0) {
      return null;
    }
    
    const row = result.rows[0];
    return {
      id: row.id,
      type: row.question_type,
      question: row.question_text,
      data: row.question_data,
      askedAt: row.asked_at
    };
    
  } catch (error) {
    logger.error('[AUTOPILOT-DB] ❌ Error obteniendo pregunta:', error);
    return null;
  }
}

/**
 * ✅ Marca pregunta como respondida
 */
export async function markQuestionAnswered(questionId, answer, result = {}) {
  try {
    await query(
      `UPDATE autopilot_pending_questions 
       SET status = 'answered',
           answer = $2,
           answer_result = $3,
           answered_at = NOW()
       WHERE id = $1`,
      [questionId, answer, JSON.stringify(result)]
    );
    
    logger.info(`[AUTOPILOT-DB] ✅ Pregunta ${questionId} marcada como respondida`);
    
  } catch (error) {
    logger.error('[AUTOPILOT-DB] ❌ Error marcando pregunta:', error);
  }
}

/**
 * ⏰ Expira preguntas antiguas (cleanup automático)
 */
export async function expireOldQuestions() {
  try {
    const result = await query(
      `UPDATE autopilot_pending_questions 
       SET status = 'expired', expired_at = NOW()
       WHERE status = 'pending' 
         AND expires_at < NOW()
       RETURNING id`,
      []
    );
    
    if (result.rows.length > 0) {
      logger.info(`[AUTOPILOT-DB] ⏰ Expiradas ${result.rows.length} preguntas antiguas`);
    }
    
    return result.rows.length;
    
  } catch (error) {
    logger.error('[AUTOPILOT-DB] ❌ Error expirando preguntas:', error);
    return 0;
  }
}

/**
 * 🗄️ Crea tabla de preguntas pendientes
 */
async function createPendingQuestionsTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS autopilot_pending_questions (
      id SERIAL PRIMARY KEY,
      user_id VARCHAR(50) NOT NULL,
      question_type VARCHAR(100) NOT NULL,
      question_text TEXT NOT NULL,
      question_data JSONB DEFAULT '{}',
      asked_at TIMESTAMP DEFAULT NOW(),
      expires_at TIMESTAMP NOT NULL,
      status VARCHAR(20) DEFAULT 'pending',  -- pending, answered, expired
      answer TEXT,
      answer_result JSONB,
      answered_at TIMESTAMP,
      expired_at TIMESTAMP
    );
    
    CREATE INDEX IF NOT EXISTS idx_pending_questions_user_status 
    ON autopilot_pending_questions(user_id, status);
    
    CREATE INDEX IF NOT EXISTS idx_pending_questions_expires 
    ON autopilot_pending_questions(expires_at) 
    WHERE status = 'pending';
  `);
  
  logger.info('[AUTOPILOT-DB] ✅ Tabla autopilot_pending_questions creada');
}

/**
 * 📊 Obtiene historial de preguntas de un usuario
 */
export async function getQuestionHistory(userId, limit = 20) {
  try {
    const result = await query(
      `SELECT 
         id,
         question_type,
         question_text,
         question_data,
         asked_at,
         status,
         answer,
         answer_result,
         answered_at
       FROM autopilot_pending_questions 
       WHERE user_id = $1 
       ORDER BY asked_at DESC 
       LIMIT $2`,
      [userId, limit]
    );
    
    return result.rows;
    
  } catch (error) {
    logger.error('[AUTOPILOT-DB] ❌ Error obteniendo historial:', error);
    return [];
  }
}

/**
 * 📈 Obtiene estadísticas de preguntas
 */
export async function getQuestionStats(userId) {
  try {
    const result = await query(
      `SELECT 
         question_type,
         status,
         COUNT(*) as total,
         AVG(EXTRACT(EPOCH FROM (answered_at - asked_at))) as avg_response_time_seconds
       FROM autopilot_pending_questions 
       WHERE user_id = $1 
       GROUP BY question_type, status
       ORDER BY question_type, status`,
      [userId]
    );
    
    return result.rows;
    
  } catch (error) {
    logger.error('[AUTOPILOT-DB] ❌ Error obteniendo stats:', error);
    return [];
  }
}

/**
 * 🔄 Sincroniza estado de memoria con DB al arrancar servidor
 */
export async function syncPendingQuestionsOnStartup() {
  try {
    const DIEGO_PERSONAL = process.env.DIEGO_PERSONAL_PHONE;
    if (!DIEGO_PERSONAL) {
      return;
    }
    
    const pending = await getPendingQuestion(DIEGO_PERSONAL);
    
    if (pending) {
      logger.info(`[AUTOPILOT-DB] 🔄 Recuperada pregunta pendiente: ${pending.type}`);
      
      // Importar setPendingQuestion del autopilot-state (evitar importación circular)
      const { setPendingQuestion } = await import('./autopilot-state.js');
      setPendingQuestion(pending.type, pending.question, pending.data);
    } else {
      logger.info('[AUTOPILOT-DB] ✓ No hay preguntas pendientes en DB');
    }
    
  } catch (error) {
    logger.error('[AUTOPILOT-DB] ❌ Error sincronizando preguntas:', error);
  }
}

// ⏰ Expirar preguntas antiguas cada 10 minutos
setInterval(() => {
  expireOldQuestions().catch(err => {
    logger.error('[AUTOPILOT-DB] Error en cleanup automático:', err);
  });
}, 10 * 60 * 1000);
