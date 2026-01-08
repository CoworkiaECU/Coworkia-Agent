#!/usr/bin/env node

/**
 * Reset Server State - Limpia todas las conversaciones en curso
 * Se ejecuta automáticamente en cada deploy para evitar estados corruptos
 */

const { Pool } = require('pg');

async function resetServerState() {
  console.log('🔄 RESET DEL SERVIDOR - Limpiando estado de conversaciones...\n');

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    // 1. Resetear todos los activeAgent a AURORA
    const resetAgents = await pool.query(`
      UPDATE users 
      SET active_agent = 'AURORA'
      WHERE active_agent IS NOT NULL AND active_agent != 'AURORA'
    `);
    console.log(`✅ Reseteados ${resetAgents.rowCount} usuarios a Aurora`);

    // 2. Limpiar datos temporales de Axel
    const cleanAxel = await pool.query(`
      UPDATE users 
      SET axel_data = NULL
      WHERE axel_data IS NOT NULL
    `);
    console.log(`✅ Limpiados ${cleanAxel.rowCount} estados de Axel`);

    // 3. Limpiar datos temporales de otros agentes
    const cleanOtherAgents = await pool.query(`
      UPDATE users 
      SET 
        enzo_data = NULL,
        aluna_data = NULL,
        angela_data = NULL,
        gabi_data = NULL,
        adriana_data = NULL
      WHERE 
        enzo_data IS NOT NULL OR
        aluna_data IS NOT NULL OR
        angela_data IS NOT NULL OR
        gabi_data IS NOT NULL OR
        adriana_data IS NOT NULL
    `);
    console.log(`✅ Limpiados ${cleanOtherAgents.rowCount} estados de otros agentes`);

    // 4. Limpiar formularios parciales antiguos (más de 1 hora)
    const cleanForms = await pool.query(`
      UPDATE users 
      SET partial_form = NULL
      WHERE 
        partial_form IS NOT NULL AND
        updated_at < NOW() - INTERVAL '1 hour'
    `);
    console.log(`✅ Limpiados ${cleanForms.rowCount} formularios parciales antiguos`);

    // 5. Verificar estado final
    const stats = await pool.query(`
      SELECT 
        COUNT(*) as total_users,
        COUNT(*) FILTER (WHERE active_agent = 'AURORA') as aurora_users,
        COUNT(*) FILTER (WHERE active_agent != 'AURORA') as other_agents
      FROM users
    `);
    
    console.log('\n📊 ESTADO FINAL:');
    console.log(`   Total usuarios: ${stats.rows[0].total_users}`);
    console.log(`   Con Aurora: ${stats.rows[0].aurora_users}`);
    console.log(`   Otros agentes: ${stats.rows[0].other_agents}`);
    
    console.log('\n✨ Reset completado exitosamente\n');

  } catch (error) {
    console.error('❌ Error en reset del servidor:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Ejecutar reset
resetServerState();
