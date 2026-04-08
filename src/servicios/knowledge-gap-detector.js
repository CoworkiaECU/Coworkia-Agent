/**
 * 🧠 knowledge-gap-detector.js — Detecta preguntas sin respuesta
 *
 * Cuando GPT responde con frases evasivas ("no tengo esa información"),
 * registra la pregunta en unanswered_questions para revisión posterior.
 * Si la misma pregunta se repite >= 5 veces, notifica a Diego.
 */

import databaseService from '../database/database.js';
import { notifyRaw } from './notification-service.js';
import { magicHeader, magicClosing } from './magic-persona.js';

// Regex conservador — solo frases que indican claramente que el agente NO sabe
const GAP_PATTERNS = [
  /no tengo (?:esa |esa|eso|esta )informaci[oó]n/i,
  /no cuento con (?:esa |esa|eso|esta )informaci[oó]n/i,
  /no puedo ayudarte con eso/i,
  /no puedo ayudarle con eso/i,
  /fuera de mi (?:especialidad|área|alcance)/i,
  /te recomiendo consultar (?:directamente|con el equipo)/i,
  /no dispongo de (?:esa |esos? |esta )dato/i,
  /no tengo acceso a (?:esa |esos? )informaci[oó]n/i,
  /lamentablemente no (?:cuento|tengo|dispongo)/i,
  /no estoy segura? (?:de eso|sobre eso|al respecto)/i,
];

/**
 * Genera cluster_key a partir del mensaje del usuario.
 * Normaliza y extrae las 4 palabras significativas más largas.
 */
function buildClusterKey(message) {
  const stopWords = new Set([
    'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'de', 'del',
    'en', 'con', 'por', 'para', 'que', 'qué', 'es', 'son', 'y', 'o',
    'a', 'al', 'se', 'su', 'mi', 'me', 'te', 'le', 'no', 'si', 'sí',
    'the', 'is', 'are', 'and', 'or', 'to', 'of', 'in', 'for', 'what',
    'como', 'cómo', 'donde', 'dónde', 'cuando', 'cuándo', 'cual', 'cuál'
  ]);

  const words = (message || '')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 2 && !stopWords.has(w));

  // Top 4 longest words sorted alphabetically for stable keys
  const top = words
    .sort((a, b) => b.length - a.length)
    .slice(0, 4)
    .sort();

  return top.join('_') || 'unknown';
}

/**
 * Detecta si la respuesta del agente indica un gap de conocimiento.
 * Si lo detecta, registra o incrementa en unanswered_questions.
 *
 * @param {string} agent - Nombre del agente (AURORA, ALUNA, etc.)
 * @param {string} userMessage - Mensaje original del usuario
 * @param {string} aiResponse - Respuesta generada por GPT
 */
export async function detectKnowledgeGap(agent, userMessage, aiResponse) {
  if (!userMessage || !aiResponse) return;

  // Verificar si la respuesta contiene frases evasivas
  const isGap = GAP_PATTERNS.some(pattern => pattern.test(aiResponse));
  if (!isGap) return;

  const clusterKey = buildClusterKey(userMessage);

  try {
    await databaseService.initialize();

    // Buscar pregunta similar existente por cluster_key
    const existing = await databaseService.get(
      `SELECT id, occurrence_count, status FROM unanswered_questions
       WHERE cluster_key = $1 AND agent = $2 AND status IN ('new', 'suggested')
       LIMIT 1`,
      [clusterKey, agent]
    );

    if (existing) {
      // Incrementar contador
      const newCount = existing.occurrence_count + 1;
      await databaseService.run(
        `UPDATE unanswered_questions
         SET occurrence_count = $1, context = $2
         WHERE id = $3`,
        [newCount, aiResponse.substring(0, 500), existing.id]
      );

      // Si alcanza umbral → marcar como suggested y notificar
      if (newCount >= 5 && existing.status === 'new') {
        await databaseService.run(
          `UPDATE unanswered_questions SET status = 'suggested' WHERE id = $1`,
          [existing.id]
        );
        await notifyGap(agent, userMessage, newCount);
      }

      console.log(`[KNOWLEDGE-GAP] 📊 Incrementado: "${clusterKey}" (${newCount}x)`);
    } else {
      // Nueva pregunta sin respuesta
      await databaseService.run(
        `INSERT INTO unanswered_questions (agent, question, context, cluster_key)
         VALUES ($1, $2, $3, $4)`,
        [agent, userMessage.substring(0, 1000), aiResponse.substring(0, 500), clusterKey]
      );
      console.log(`[KNOWLEDGE-GAP] 🆕 Registrada: "${clusterKey}" para ${agent}`);
    }
  } catch (err) {
    // Non-blocking — never crash the main flow
    console.error('[KNOWLEDGE-GAP] ⚠️ Error:', err.message);
  }
}

/**
 * Notifica a Diego vía WhatsApp cuando una pregunta se repite >= 5 veces.
 */
async function notifyGap(agent, question, count) {
  try {
    const msg = [
      magicHeader('inform'),
      '',
      `🧠 *Knowledge Gap detectado*`,
      '',
      `📊 Pregunta repetida *${count} veces* sin respuesta:`,
      `> "${question.substring(0, 200)}"`,
      '',
      `🤖 Agente: *${agent}*`,
      `💡 Acción sugerida: agregar esta info al knowledge base`,
      '',
      magicClosing()
    ].join('\n');

    await notifyRaw(msg);
  } catch (err) {
    console.error('[KNOWLEDGE-GAP] ⚠️ Error notificando:', err.message);
  }
}
