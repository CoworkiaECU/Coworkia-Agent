import pg from 'pg';
const { Client } = pg;

async function cleanup() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('🗑️  Limpiando formularios pendientes...\n');

    const before = await client.query('SELECT COUNT(*) FROM partial_forms');
    console.log('📊 Antes:', before.rows[0].count, 'formularios');

    const result = await client.query(`
      DELETE FROM partial_forms 
      WHERE created_at < NOW() - INTERVAL '24 hours'
    `);

    console.log('✅ Eliminados:', result.rowCount, 'formularios');

    const after = await client.query('SELECT COUNT(*) FROM partial_forms');
    console.log('📊 Después:', after.rows[0].count, 'formularios');

    console.log('\n🎉 Limpieza completada!');
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

cleanup();
