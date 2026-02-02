#!/usr/bin/env node

/**
 * 🧹 AXEL PHOTO SESSIONS CLEANUP
 * Limpia sesiones de fotos expiradas (>15 días)
 * Ejecutar diario con Heroku Scheduler
 * 
 * Comando: node scripts/maintenance/cleanup-axel-sessions.js
 */

import { cleanupExpiredSessions, getPhotoSessionStats } from '../../src/database/axelPhotoRepository.js';
import postgresAdapter from '../../src/database/postgres-adapter.js';

async function main() {
  console.log('🧹 [AXEL-CLEANUP] Iniciando limpieza de sesiones de fotos...\n');
  
  try {
    // Inicializar BD
    await postgresAdapter.initialize();
    console.log('✅ Conexión a PostgreSQL establecida\n');
    
    // Estadísticas ANTES de limpieza
    const statsBefore = await getPhotoSessionStats();
    console.log('📊 Estado ANTES de limpieza:');
    console.log(`   - Total sesiones: ${statsBefore.total}`);
    console.log(`   - Activas: ${statsBefore.active}`);
    console.log(`   - Completadas: ${statsBefore.completed}`);
    console.log(`   - Expiradas: ${statsBefore.expired}\n`);
    
    // Ejecutar limpieza
    const result = await cleanupExpiredSessions();
    
    if (result.success) {
      console.log(`✅ Limpieza completada: ${result.deleted} sesión(es) eliminada(s)\n`);
      
      // Estadísticas DESPUÉS de limpieza
      const statsAfter = await getPhotoSessionStats();
      console.log('📊 Estado DESPUÉS de limpieza:');
      console.log(`   - Total sesiones: ${statsAfter.total}`);
      console.log(`   - Activas: ${statsAfter.active}`);
      console.log(`   - Completadas: ${statsAfter.completed}`);
      console.log(`   - Expiradas: ${statsAfter.expired}\n`);
      
      console.log('🎉 Limpieza exitosa!');
      process.exit(0);
    } else {
      console.error('❌ Error en limpieza:', result.error);
      process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  }
}

main();
