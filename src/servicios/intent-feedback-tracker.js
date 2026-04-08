/**
 * 📊 intent-feedback-tracker.js — Rastrea precisión de detección de intents
 *
 * Registra false positives/negatives en intent_feedback.
 * Provee queries de accuracy y top false positives para self-healing.
 */

import databaseService from '../database/database.js';

/**
 * Registra el resultado de una detección de intent.
 *
 * @param {string} agent - Agente que procesó (AURORA, ALUNA, etc.)
 * @param {string} userMessage - Mensaje del usuario
 * @param {string} detectedIntent - Intent detectado (RESERVAR, ALUNA_LEAD, etc.) o null
 * @param {boolean} wasCorrect - true si el intent fue correcto
 * @param {object} [meta] - Metadata adicional
 * @param {string} [meta.actualIntent] - Intent real si fue incorrecto
 * @param {string} [meta.keywordTriggered] - Keyword que disparó la detección
 */
export async function trackIntentResult(agent, userMessage, detectedIntent, wasCorrect, meta = {}) {
  if (!userMessage) return;

  let feedbackType;
  if (wasCorrect) {
    feedbackType = 'correct';
  } else if (detectedIntent && !meta.actualIntent) {
    feedbackType = 'false_positive'; // Detectó intent pero no debería
  } else if (!detectedIntent && meta.actualIntent) {
    feedbackType = 'false_negative'; // No detectó intent pero debería
  } else {
    feedbackType = 'false_positive'; // Default cuando es incorrecto
  }

  try {
    await databaseService.initialize();
    await databaseService.run(
      `INSERT INTO intent_feedback (agent, detected_intent, actual_intent, user_message, feedback_type, keyword_triggered)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        agent,
        detectedIntent || null,
        meta.actualIntent || null,
        userMessage.substring(0, 1000),
        feedbackType,
        meta.keywordTriggered || null
      ]
    );

    if (feedbackType !== 'correct') {
      console.log(`[INTENT-FEEDBACK] 📊 ${feedbackType}: "${userMessage.substring(0, 80)}" → detected=${detectedIntent}, actual=${meta.actualIntent || '?'}`);
    }
  } catch (err) {
    console.error('[INTENT-FEEDBACK] ⚠️ Error:', err.message);
  }
}

/**
 * Calcula accuracy de intents por agente en los últimos N días.
 *
 * @param {string} [agent] - Filtrar por agente (null = todos)
 * @param {number} [days=30] - Ventana de días
 * @returns {{ total, correct, falsePositives, falseNegatives, accuracy }}
 */
export async function getIntentAccuracy(agent = null, days = 30) {
  try {
    await databaseService.initialize();

    const whereAgent = agent ? `AND agent = $2` : '';
    const params = agent ? [days, agent] : [days];

    const result = await databaseService.get(
      `SELECT
         COUNT(*) as total,
         COUNT(*) FILTER (WHERE feedback_type = 'correct') as correct,
         COUNT(*) FILTER (WHERE feedback_type = 'false_positive') as false_positives,
         COUNT(*) FILTER (WHERE feedback_type = 'false_negative') as false_negatives
       FROM intent_feedback
       WHERE created_at > NOW() - ($1 || ' days')::INTERVAL
       ${whereAgent}`,
      params
    );

    const total = parseInt(result?.total) || 0;
    const correct = parseInt(result?.correct) || 0;

    return {
      total,
      correct,
      falsePositives: parseInt(result?.false_positives) || 0,
      falseNegatives: parseInt(result?.false_negatives) || 0,
      accuracy: total > 0 ? Math.round((correct / total) * 10000) / 100 : 100
    };
  } catch (err) {
    console.error('[INTENT-FEEDBACK] ⚠️ getIntentAccuracy error:', err.message);
    return { total: 0, correct: 0, falsePositives: 0, falseNegatives: 0, accuracy: 100 };
  }
}

/**
 * Top keywords que generan false positives.
 *
 * @param {string} [agent] - Filtrar por agente
 * @param {number} [limit=10] - Máximo resultados
 * @returns {Array<{ keyword, count, sampleMessages }>}
 */
export async function getTopFalsePositives(agent = null, limit = 10) {
  try {
    await databaseService.initialize();

    const whereAgent = agent ? `AND agent = $3` : '';
    const params = agent ? [7, limit, agent] : [7, limit];

    const rows = await databaseService.all(
      `SELECT
         keyword_triggered as keyword,
         COUNT(*) as count,
         STRING_AGG(DISTINCT LEFT(user_message, 80), ' | ' ORDER BY LEFT(user_message, 80)) as sample_messages
       FROM intent_feedback
       WHERE feedback_type = 'false_positive'
         AND keyword_triggered IS NOT NULL
         AND created_at > NOW() - ($1 || ' days')::INTERVAL
         ${whereAgent}
       GROUP BY keyword_triggered
       ORDER BY count DESC
       LIMIT $2`,
      params
    );

    return rows || [];
  } catch (err) {
    console.error('[INTENT-FEEDBACK] ⚠️ getTopFalsePositives error:', err.message);
    return [];
  }
}
