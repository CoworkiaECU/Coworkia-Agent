import pg from 'pg';
const { Client } = pg;

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

await client.connect();

console.log('🗑️  Limpiando formularios pendientes no concluidos...\n');

// Obtener count antes
const beforeCount = await client.query('SELECT COUNT(*) FROM partial_forms');
console.log('📊 Formularios antes:', beforeCount.rows[0].count);

// Borrar formularios pendientes antiguos (más de 24 horas)
const result = await client.query(`
  DELETE FROM partial_forms 
  WHERE created_at < NOW() - INTERVAL '24 hours'
  RETURNING id, user_id, form_type, created_at
`);

console.log('\n✅ Formularios eliminados:', result.rowCount);

if (result.rows.length > 0) {
  console.log('\n📋 Detalles eliminados:');
  result.rows.forEach(row => {
    console.log(`  - ID: ${row.id}, User: ${row.user_id}, Tipo: ${row.form_type}, Fecha: ${row.created_at}`);
  });
}

// Count después
const afterCount = await client.query('SELECT COUNT(*) FROM partial_forms');
console.log('\n📊 Formularios después:', afterCount.rows[0].count);

await client.end();
console.log('\n🎉 Limpieza completada!');
