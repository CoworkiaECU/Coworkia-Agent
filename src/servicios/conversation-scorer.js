/**
 * 🧠 Conversation Scorer — Auto-aprendizaje Loop 1
 *
 * Después de cada conversación:
 * 1. Genera resumen corto con GPT-4o-mini
 * 2. Calcula score 0-1 según outcome + sentimiento
 * 3. Genera embedding con text-embedding-3-small
 * 4. Guarda en conversation_scores para RAG retrieval
 *
 * Costos estimados: ~$0.0002 por conversación (resumen + embedding)
 */

import { client } from '../servicios-ia/openai.js';
import databaseService from '../database/database.js';

const SUMMARY_MODEL = 'gpt-4o-mini';
const EMBEDDING_MODEL = 'text-embedding-3-small';

// Scores base por outcome
const OUTCOME_SCORES = {
  completed: 1.0,
  escalated: 0.5,
  abandoned: 0.3,
  error: 0.0,
};

// Frases que indican sentimiento positivo del usuario
const POSITIVE_PHRASES = [
  'gracias', 'perfecto', 'dale', 'genial', 'excelente',
  'ok', 'listo', 'buenísimo', 'muchas gracias', 'super',
];

/**
 * Genera un resumen corto de la conversación con GPT-4o-mini
 */
async function summarizeConversation(messages) {
  const transcript = messages
    .map(m => `${m.role === 'user' ? 'Cliente' : 'Agente'}: ${m.content}`)
    .slice(-10) // últimos 10 mensajes como máximo
    .join('\n');

  const res = await client.chat.completions.create({
    model: SUMMARY_MODEL,
    messages: [
      {
        role: 'system',
        content: 'Resume esta conversación en 1-2 líneas. Incluye: qué pidió el cliente, cómo se resolvió, y el resultado. Solo español, sin emojis.',
      },
      { role: 'user', content: transcript },
    ],
    temperature: 0.2,
    max_tokens: 100,
  });

  return res.choices?.[0]?.message?.content?.trim() || 'Sin resumen disponible';
}

/**
 * Genera embedding con text-embedding-3-small (1536 dims, $0.00002/1K tokens)
 */
async function generateEmbedding(text) {
  const res = await client.embeddings.create({
    model: EMBEDDING_MODEL,
    input: text,
  });

  return res.data?.[0]?.embedding || null;
}

/**
 * Calcula score 0-1 basado en outcome + sentimiento del último mensaje
 */
function calculateScore(outcome, messages) {
  let score = OUTCOME_SCORES[outcome] ?? 0.3;

  // Bonus +0.1 si último mensaje del usuario es positivo
  const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
  if (lastUserMsg) {
    const text = (lastUserMsg.content || '').toLowerCase();
    if (POSITIVE_PHRASES.some(p => text.includes(p))) {
      score = Math.min(score + 0.1, 1.0);
    }
  }

  return parseFloat(score.toFixed(2));
}

/**
 * 🧠 Score y almacena una conversación para RAG
 *
 * @param {string} agent - Nombre del agente (AURORA, ALUNA, etc.)
 * @param {Array<{role:string, content:string}>} messages - Historial de mensajes
 * @param {string} outcome - 'completed' | 'abandoned' | 'escalated' | 'error'
 * @param {string} [userPhone] - Teléfono del usuario (opcional)
 * @param {Object} [meta] - Metadata adicional (formData, intentReason, etc.)
 */
export async function scoreConversation(agent, messages, outcome, userPhone = null, meta = {}) {
  if (!messages?.length || messages.length < 2) return; // Ignorar conversaciones triviales

  try {
    const summary = await summarizeConversation(messages);
    const score = calculateScore(outcome, messages);
    const embedding = await generateEmbedding(summary);

    if (!embedding) {
      console.warn('[CONV-SCORER] ⚠️ No embedding generated, skipping storage');
      return;
    }

    await databaseService.initialize();
    await databaseService.run(
      `INSERT INTO conversation_scores
        (agent, user_phone, conversation_summary, outcome, score, embedding, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        agent,
        userPhone,
        summary,
        outcome,
        score,
        `[${embedding.join(',')}]`,
        JSON.stringify({ ...meta, messageCount: messages.length }),
      ]
    );

    console.log(`[CONV-SCORER] ✅ ${agent} scored: ${score} (${outcome}) — "${summary.substring(0, 80)}"`);
  } catch (err) {
    // Fire-and-forget: no bloquear flujo principal
    console.error('[CONV-SCORER] ❌ Error scoring conversation:', err.message);
  }
}
