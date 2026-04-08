/**
 * 008_conversation_embeddings.js
 *
 * Auto-aprendizaje: RAG Memory + A/B Prompts
 * - conversation_scores: almacena resúmenes + embeddings de conversaciones
 * - prompt_variants: infraestructura A/B testing de prompts
 *
 * Requiere: pgvector (habilitado en Heroku essential-0)
 */

export const name = '008_conversation_embeddings';

export async function up(db) {
  // Asegurar extensión pgvector
  await db.run(`CREATE EXTENSION IF NOT EXISTS vector`);

  // ── Tabla de scores + embeddings ──────────────────────────────────
  await db.run(`
    CREATE TABLE IF NOT EXISTS conversation_scores (
      id SERIAL PRIMARY KEY,
      agent TEXT NOT NULL,
      user_phone TEXT,
      conversation_summary TEXT NOT NULL,
      outcome TEXT CHECK (outcome IN ('completed','abandoned','escalated','error')),
      score REAL DEFAULT 0,
      embedding vector(1536),
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await db.run(`
    CREATE INDEX IF NOT EXISTS idx_conv_scores_agent
    ON conversation_scores(agent, score DESC)
  `);

  // ivfflat requiere al menos 1 fila para construir el índice.
  // Si falla (tabla vacía o plan no lo soporta), usar HNSW como fallback.
  try {
    await db.run(`
      CREATE INDEX IF NOT EXISTS idx_conv_scores_embedding
      ON conversation_scores
      USING ivfflat (embedding vector_cosine_ops) WITH (lists = 10)
    `);
    console.log('[MIGRATION-008] ✅ ivfflat index created');
  } catch (e) {
    console.warn('[MIGRATION-008] ⚠️ ivfflat failed, trying HNSW:', e.message);
    try {
      await db.run(`
        CREATE INDEX IF NOT EXISTS idx_conv_scores_embedding
        ON conversation_scores
        USING hnsw (embedding vector_cosine_ops)
      `);
      console.log('[MIGRATION-008] ✅ HNSW index created (fallback)');
    } catch (e2) {
      // Sin índice vectorial — queries lineales OK para volumen bajo
      console.warn('[MIGRATION-008] ⚠️ No vector index created (linear scan):', e2.message);
    }
  }

  // ── Tabla A/B testing de prompts ──────────────────────────────────
  await db.run(`
    CREATE TABLE IF NOT EXISTS prompt_variants (
      id SERIAL PRIMARY KEY,
      agent TEXT NOT NULL,
      variant_name TEXT NOT NULL DEFAULT 'control',
      prompt_patch TEXT NOT NULL,
      conversations_count INTEGER DEFAULT 0,
      completions_count INTEGER DEFAULT 0,
      conversion_rate REAL GENERATED ALWAYS AS (
        CASE WHEN conversations_count > 0
        THEN completions_count::REAL / conversations_count
        ELSE 0 END
      ) STORED,
      is_active BOOLEAN DEFAULT true,
      is_winner BOOLEAN DEFAULT false,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await db.run(`
    CREATE INDEX IF NOT EXISTS idx_prompt_variants_agent
    ON prompt_variants(agent, is_active)
  `);
}

export async function down(db) {
  await db.run(`DROP TABLE IF EXISTS prompt_variants`);
  await db.run(`DROP TABLE IF EXISTS conversation_scores`);
}
