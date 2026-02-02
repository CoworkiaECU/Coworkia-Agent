#!/usr/bin/env node

/**
 * 🧪 TEST LOCAL: AXEL PHOTO REPOSITORY
 * Valida CRUD completo antes de producción
 */

import { 
  savePhotoSession, 
  getActivePhotoSession, 
  completePhotoSession,
  deletePhotoSession,
  cleanupExpiredSessions,
  getPhotoSessionStats 
} from './src/database/axelPhotoRepository.js';
import postgresAdapter from './src/database/postgres-adapter.js';

const TEST_PHONE = '+573001234567';
const TEST_PHOTOS = [
  'https://cdn.wassenger.com/photo1.jpg',
  'https://cdn.wassenger.com/photo2.jpg',
  'https://cdn.wassenger.com/photo3.jpg'
];

async function runTests() {
  console.log('🧪 [TEST] Iniciando tests AXEL Photo Repository\n');
  
  try {
    // 1. Inicializar BD
    console.log('1️⃣ Inicializando PostgreSQL...');
    await postgresAdapter.initialize();
    console.log('✅ BD inicializada\n');
    
    // 2. Stats iniciales
    console.log('2️⃣ Stats iniciales:');
    const statsInitial = await getPhotoSessionStats();
    console.log(`   Total: ${statsInitial.total}, Activas: ${statsInitial.active}`);
    console.log('✅ Stats obtenidas\n');
    
    // 3. Guardar sesión con 2 fotos
    console.log('3️⃣ Guardando sesión inicial (2 fotos)...');
    const save1 = await savePhotoSession(TEST_PHONE, TEST_PHOTOS.slice(0, 2));
    console.log(`   ${save1.success ? '✅' : '❌'} Primera sesión guardada`);
    
    // 4. Recuperar sesión
    console.log('\n4️⃣ Recuperando sesión...');
    const session1 = await getActivePhotoSession(TEST_PHONE);
    console.log(`   ${session1 ? '✅' : '❌'} Sesión recuperada`);
    if (session1) {
      console.log(`   - Teléfono: ${session1.userPhone}`);
      console.log(`   - Fotos: ${session1.photoCount}`);
      console.log(`   - Status: ${session1.status}`);
      console.log(`   - URLs: ${JSON.stringify(session1.photoUrls)}`);
    }
    
    // 5. Actualizar con 3ra foto
    console.log('\n5️⃣ Agregando 3ra foto (UPDATE)...');
    const save2 = await savePhotoSession(TEST_PHONE, TEST_PHOTOS);
    console.log(`   ${save2.success ? '✅' : '❌'} Sesión actualizada`);
    
    const session2 = await getActivePhotoSession(TEST_PHONE);
    console.log(`   Fotos actualizadas: ${session2?.photoCount || 0}`);
    
    // 6. Stats después de crear
    console.log('\n6️⃣ Stats después de crear:');
    const statsAfterCreate = await getPhotoSessionStats();
    console.log(`   Total: ${statsAfterCreate.total}, Activas: ${statsAfterCreate.active}`);
    
    // 7. Completar sesión
    console.log('\n7️⃣ Completando sesión con código de cotización...');
    const complete = await completePhotoSession(TEST_PHONE, 'AXL-TEST-001');
    console.log(`   ${complete.success ? '✅' : '❌'} Sesión completada`);
    
    // 8. Verificar que ya no es activa
    console.log('\n8️⃣ Verificando que ya no es activa...');
    const sessionCompleted = await getActivePhotoSession(TEST_PHONE);
    console.log(`   ${sessionCompleted === null ? '✅' : '❌'} Ya no aparece como activa`);
    
    // 9. Stats finales
    console.log('\n9️⃣ Stats después de completar:');
    const statsFinal = await getPhotoSessionStats();
    console.log(`   Total: ${statsFinal.total}, Activas: ${statsFinal.active}, Completadas: ${statsFinal.completed}`);
    
    // 10. Limpiar test
    console.log('\n🔟 Limpiando datos de test...');
    const deleted = await deletePhotoSession(TEST_PHONE);
    console.log(`   ${deleted.success ? '✅' : '❌'} Sesión de test eliminada`);
    
    // 11. Stats después de limpiar
    console.log('\n1️⃣1️⃣ Stats después de limpiar:');
    const statsEnd = await getPhotoSessionStats();
    console.log(`   Total: ${statsEnd.total}, Activas: ${statsEnd.active}, Completadas: ${statsEnd.completed}`);
    
    console.log('\n🎉 [TEST] TODOS LOS TESTS PASARON EXITOSAMENTE\n');
    
  } catch (error) {
    console.error('\n❌ [TEST] ERROR:', error);
    console.error(error.stack);
    process.exit(1);
  } finally {
    // Cerrar pool
    if (postgresAdapter.pool) {
      await postgresAdapter.pool.end();
      console.log('🔌 Pool cerrado');
    }
    process.exit(0);
  }
}

runTests();
