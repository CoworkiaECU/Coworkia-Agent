import pg from 'pg';
import { config } from 'dotenv';

config();

const connectionString = process.env.DATABASE_URL;
const client = new pg.Client({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

async function queryInteractions() {
  try {
    await client.connect();
    
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('📱 INTERACCIONES USUARIO 0788 (+593987770788)');
    console.log('═══════════════════════════════════════════════════════════\n');
    
    const res0788 = await client.query(`
      SELECT 
        TO_CHAR(timestamp, 'HH24:MI:SS') as hora,
        agent, 
        intent_reason, 
        input, 
        CASE 
          WHEN LENGTH(output) > 150 THEN LEFT(output, 150) || '...'
          ELSE output 
        END as output
      FROM interactions 
      WHERE user_phone = '+593987770788' 
      ORDER BY timestamp DESC 
      LIMIT 8
    `);
    
    res0788.rows.reverse().forEach((row, i) => {
      console.log(`\n[${i + 1}] ${row.hora} - ${row.agent.toUpperCase()}`);
      console.log(`Intent: ${row.intent_reason}`);
      console.log(`👤 Input: ${row.input}`);
      console.log(`🤖 Output: ${row.output}`);
    });
    
    console.log('\n\n═══════════════════════════════════════════════════════════');
    console.log('📱 INTERACCIONES USUARIO 0262 (+593992320262)');
    console.log('═══════════════════════════════════════════════════════════\n');
    
    const res0262 = await client.query(`
      SELECT 
        TO_CHAR(timestamp, 'HH24:MI:SS') as hora,
        agent, 
        intent_reason, 
        input, 
        CASE 
          WHEN LENGTH(output) > 150 THEN LEFT(output, 150) || '...'
          ELSE output 
        END as output
      FROM interactions 
      WHERE user_phone = '+593992320262' 
      ORDER BY timestamp DESC 
      LIMIT 8
    `);
    
    res0262.rows.reverse().forEach((row, i) => {
      console.log(`\n[${i + 1}] ${row.hora} - ${row.agent.toUpperCase()}`);
      console.log(`Intent: ${row.intent_reason}`);
      console.log(`👤 Input: ${row.input}`);
      console.log(`🤖 Output: ${row.output}`);
    });
    
    console.log('\n═══════════════════════════════════════════════════════════\n');
    
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

queryInteractions();
