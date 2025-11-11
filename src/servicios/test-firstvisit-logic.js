// Test para verificar y arreglar la lógica de firstVisit
import { loadProfile, saveProfile } from '../perfiles-interacciones/memoria-sqlite.js';

const TEST_USER_ID = '593987770788'; // Diego Villota

async function testFirstVisitLogic() {
  console.log('🧪 TESTING: Lógica de FirstVisit');
  
  // 1. Cargar perfil actual
  const currentProfile = await loadProfile(TEST_USER_ID);
  console.log('📊 Perfil actual:', JSON.stringify(currentProfile, null, 2));
  
  // 2. Verificar estado de firstVisit
  if (currentProfile) {
    console.log(`\n🔍 Estado firstVisit: ${currentProfile.firstVisit}`);
    console.log(`📝 Conversaciones: ${currentProfile.conversationCount || 0}`);
    
    // 3. Si tiene conversaciones pero firstVisit sigue en true, corregir
    if (currentProfile.conversationCount > 1 && currentProfile.firstVisit !== false) {
      console.log('\n🔧 CORRIGIENDO: Usuario con múltiples conversaciones debería tener firstVisit: false');
      
      await saveProfile(TEST_USER_ID, {
        ...currentProfile,
        firstVisit: false
      });
      
      console.log('✅ Perfil actualizado con firstVisit: false');
      
      // Verificar cambio
      const updatedProfile = await loadProfile(TEST_USER_ID);
      console.log('📋 Nuevo estado firstVisit:', updatedProfile.firstVisit);
    } else {
      console.log('✅ Estado firstVisit correcto según conversaciones');
    }
  } else {
    console.log('❌ No se encontró perfil para el usuario');
  }
}

// Ejecutar test
testFirstVisitLogic().catch(console.error);