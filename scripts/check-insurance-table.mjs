import databaseService from '../src/database/database.js';

(async () => {
  try {
    await databaseService.ensureInitialized();
    
    const tableCheck = await databaseService.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'insurance_leads'
      ) as exists
    `);
    console.log('✓ Tabla insurance_leads existe:', tableCheck[0]?.exists);
    
    if (tableCheck[0]?.exists) {
      const count = await databaseService.query('SELECT COUNT(*) as count FROM insurance_leads');
      console.log('✓ Total leads:', count[0]?.count);
      
      const sample = await databaseService.query('SELECT quote_code, client_name, insurance_type, status, created_at FROM insurance_leads ORDER BY created_at DESC LIMIT 3');
      console.log('\n✓ Últimos 3 leads:');
      sample.forEach(l => console.log(`  - ${l.quote_code} | ${l.client_name} | ${l.insurance_type} | ${l.status} | ${new Date(l.created_at).toLocaleDateString()}`));
    }
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
})();
