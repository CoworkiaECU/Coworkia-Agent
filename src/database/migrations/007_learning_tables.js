/**
 * 007_learning_tables.js
 *
 * Auto-learning system: capture knowledge gaps and intent feedback
 * for continuous improvement of the multi-agent system.
 */

export const name = '007_learning_tables';

export async function up(db) {
  // Knowledge gaps — questions the system couldn't answer
  await db.run(`
    CREATE TABLE IF NOT EXISTS unanswered_questions (
      id SERIAL PRIMARY KEY,
      agent TEXT NOT NULL,
      user_phone TEXT,
      question TEXT NOT NULL,
      context TEXT,
      occurrence_count INTEGER DEFAULT 1,
      cluster_key TEXT,
      status TEXT DEFAULT 'new' CHECK (status IN ('new','suggested','resolved','ignored')),
      suggested_answer TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      resolved_at TIMESTAMPTZ
    )
  `);
  await db.run(`CREATE INDEX IF NOT EXISTS idx_unanswered_cluster ON unanswered_questions(cluster_key, status)`);
  await db.run(`CREATE INDEX IF NOT EXISTS idx_unanswered_agent ON unanswered_questions(agent, status)`);

  // Intent feedback — track intent detection accuracy
  await db.run(`
    CREATE TABLE IF NOT EXISTS intent_feedback (
      id SERIAL PRIMARY KEY,
      agent TEXT NOT NULL,
      detected_intent TEXT,
      actual_intent TEXT,
      user_message TEXT NOT NULL,
      feedback_type TEXT CHECK (feedback_type IN ('false_positive','false_negative','correct')),
      keyword_triggered TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await db.run(`CREATE INDEX IF NOT EXISTS idx_intent_feedback_agent ON intent_feedback(agent, created_at)`);
}

export async function down(db) {
  await db.run(`DROP TABLE IF EXISTS intent_feedback`);
  await db.run(`DROP TABLE IF EXISTS unanswered_questions`);
}
