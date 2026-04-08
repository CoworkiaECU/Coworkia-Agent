/**
 * 📚 RAG Retriever — Recuperar conversaciones exitosas similares
 *
 * Antes de llamar a GPT, busca conversaciones pasadas con alto score
 * que sean similares al mensaje actual (cosine similarity).
 * Se inyectan como ejemplos en el system prompt.
 *
 * Costo: ~$0.00001 por query (1 embedding call)
 */

import { client } from '../servicios-ia/openai.js';
import databaseService from '../database/database.js';

const EMBEDDING_MODEL = 'text-embedding-3-small';
const MIN_SCORE = 0.7;

/**
 * Genera embedding del mensaje del usuario
 */
async function getEmbedding(text) {
  const res = await client.embeddings.create({
    model: EMBEDDING_MODEL,
    input: text,
  });
  return res.data?.[0]?.embedding || null;
}

/**
 * 📚 Busca conversaciones exitosas similares al mensaje actual
 *
 * @param {string} agent - Agente activo (AURORA, ALUNA, etc.)
 * @param {string} userMessage - Mensaje actual del usuario
 * @param {number} [limit=2] - Máximo de ejemplos a retornar
 * @returns {Array<{summary:string, score:number, outcome:string}>}
 */
export async function getRelevantExamples(agent, userMessage, limit = 2) {
  if (!userMessage || userMessage.length < 5) return [];

  try {
    const embedding = await getEmbedding(userMessage);
    if (!embedding) return [];

    await databaseService.initialize();

    const results = await databaseService.all(
      `SELECT conversation_summary, score, outcome
       FROM conversation_scores
       WHERE agent = $1
         AND score >= $2
         AND embedding IS NOT NULL
       ORDER BY embedding <=> $3
       LIMIT $4`,
      [agent, MIN_SCORE, `[${embedding.join(',')}]`, limit]
    );

    return (results || []).map(r => ({
      summary: r.conversation_summary,
      score: r.score,
      outcome: r.outcome,
    }));
  } catch (err) {
    // Silencioso: si falla no debe bloquear el flujo
    console.warn('[RAG-RETRIEVER] ⚠️ Error retrieving examples:', err.message);
    return [];
  }
}

/**
 * 📚 Formatea ejemplos RAG para inyección en system prompt
 *
 * @param {Array<{summary:string, score:number, outcome:string}>} examples
 * @returns {string} Bloque de texto para append al prompt, o '' si vacío
 */
export function formatRAGExamples(examples) {
  if (!examples?.length) return '';

  const lines = examples.map(
    (e, i) => `${i + 1}. [${e.outcome}|score:${e.score}] ${e.summary}`
  );

  return `\n\n📚 CONVERSACIONES EXITOSAS SIMILARES:\n${lines.join('\n')}`;
}
