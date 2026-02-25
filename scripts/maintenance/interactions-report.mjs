import dotenv from 'dotenv';
import db from '../../src/database/database.js';

dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local', override: true });

function maskPhone(phone = '') {
  const p = String(phone || '');
  if (p.length <= 4) return p;
  return `${p.slice(0, 4)}***${p.slice(-2)}`;
}

try {
  await db.initialize();

  const totalRows = await db.all('SELECT COUNT(*)::int AS total FROM interactions');
  const total = totalRows?.[0]?.total || 0;

  const byClient = await db.all(`
    SELECT user_phone, COUNT(*)::int AS interactions, MAX(timestamp) AS last_at
    FROM interactions
    GROUP BY user_phone
    ORDER BY interactions DESC, last_at DESC
    LIMIT 20
  `);

  const recent = await db.all(`
    SELECT user_phone, agent, intent_reason,
           LEFT(COALESCE(input,''), 120) AS input_preview,
           LEFT(COALESCE(output,''), 120) AS output_preview,
           timestamp
    FROM interactions
    ORDER BY timestamp DESC
    LIMIT 60
  `);

  const groupedRecent = {};
  for (const row of recent) {
    const key = row.user_phone;
    if (!groupedRecent[key]) groupedRecent[key] = [];
    if (groupedRecent[key].length < 3) {
      groupedRecent[key].push({
        at: row.timestamp,
        agent: row.agent,
        reason: row.intent_reason,
        input: row.input_preview,
        output: row.output_preview
      });
    }
  }

  const summary = {
    generatedAt: new Date().toISOString(),
    totalInteractions: total,
    clientsCountTop20: byClient.length,
    topClients: byClient.map((r) => ({
      client: maskPhone(r.user_phone),
      interactions: r.interactions,
      lastAt: r.last_at
    })),
    recentByClient: Object.entries(groupedRecent)
      .slice(0, 12)
      .map(([phone, items]) => ({
        client: maskPhone(phone),
        last3: items
      }))
  };

  console.log(JSON.stringify(summary, null, 2));
  await db.close();
} catch (error) {
  console.error('INTERACTIONS_REPORT_ERROR:', error?.message || error);
  process.exit(1);
}
