#!/usr/bin/env node
/**
 * Reset todos los usuarios al agente AURORA (home)
 * Desconecta de todos los agentes especializados
 */

import database from '../../src/database/database.js';

async function resetAllAgents() {
  try {
    console.log('🔄 Reseteando todos los usuarios a AURORA...');
    
    // Inicializar la base de datos
    await database.initialize();
    
    // Obtener usuarios con agentes activos diferentes a AURORA
    const query = `
      SELECT phone_number, active_agent, name
      FROM users
      WHERE active_agent IS NOT NULL 
        AND active_agent != 'AURORA'
    `;
    
    const users = await database.all(query);
    console.log(`\n📊 Usuarios encontrados con otros agentes: ${users.length}`);
    
    if (users.length === 0) {
      console.log('✅ Todos los usuarios ya están en AURORA');
      process.exit(0);
    }
    
    // Mostrar usuarios a resetear
    console.log('\n👥 Usuarios a resetear:');
    users.forEach(user => {
      console.log(`  - ${user.name || user.phone_number}: ${user.active_agent} → AURORA`);
    });
    
    // Resetear todos
    const updateQuery = `
      UPDATE users
      SET active_agent = 'AURORA',
          updated_at = NOW()
      WHERE active_agent IS NOT NULL 
        AND active_agent != 'AURORA'
    `;
    
    await database.run(updateQuery);
    
    console.log(`\n✅ ${users.length} usuario(s) reseteados a AURORA exitosamente`);
    console.log('🏠 Todos los usuarios ahora están en el agente HOME (Aurora)');
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error reseteando agentes:', error);
    process.exit(1);
  }
}

resetAllAgents();
