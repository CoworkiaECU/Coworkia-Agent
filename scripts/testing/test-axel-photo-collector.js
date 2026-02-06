#!/usr/bin/env node
// Test fotocollector de Axel - Validar que addPhoto funciona con await

import { addPhoto, getSession, completeSession, cancelSession } from '../../src/servicios/axel-photo-collector.js';

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('🧪 TEST: AXEL PHOTO COLLECTOR');  
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

const testUserId = '+TEST123456789';

async function runTests() {
  let passed = 0;
  let failed = 0;

  // Test 1: addPhoto devuelve objeto correcto
  console.log('1. Test: addPhoto devuelve status correcto');
  try {
    const result = await addPhoto(testUserId, 'https://example.com/foto1.jpg', 'image');
    
    if (result && typeof result === 'object') {
      console.log('   ✅ addPhoto devuelve objeto');
    } else {
      throw new Error(`addPhoto devolvió: ${typeof result}`);
    }
    
    if (result.currentCount === 1) {
      console.log('   ✅ currentCount = 1');
    } else {
      throw new Error(`currentCount = ${result.currentCount}, esperado: 1`);
    }
    
    if (result.maxPhotos === 4) {
      console.log('   ✅ maxPhotos = 4');
    } else {
      throw new Error(`maxPhotos = ${result.maxPhotos}, esperado: 4`);
    }
    
    if (result.canAddMore === true) {
      console.log('   ✅ canAddMore = true');
    } else {
      throw new Error(`canAddMore = ${result.canAddMore}, esperado: true`);
    }
    
    if (result.isReady === true) {
      console.log('   ✅ isReady = true (min 1 foto)');
    } else {
      throw new Error(`isReady = ${result.isReady}, esperado: true`);
    }
    
    console.log('   ✅ PASS\n');
    passed++;
  } catch (error) {
    console.log(`   ❌ FAIL: ${error.message}\n`);
    failed++;
  }

  // Test 2: Agregar 4 fotos
  console.log('2. Test: Agregar hasta 4 fotos');
  try {
    await addPhoto(testUserId, 'https://example.com/foto2.jpg', 'image');
    await addPhoto(testUserId, 'https://example.com/foto3.jpg', 'image');
    const result4 = await addPhoto(testUserId, 'https://example.com/foto4.jpg', 'image');
    
    if (result4.currentCount === 4) {
      console.log('   ✅ 4 fotos agregadas correctamente');
    } else {
      throw new Error(`currentCount = ${result4.currentCount}, esperado: 4`);
    }
    
    if (result4.canAddMore === false) {
      console.log('   ✅ canAddMore = false (límite alcanzado)');
    } else {
      throw new Error(`canAddMore = ${result4.canAddMore}, esperado: false`);
    }
    
    console.log('   ✅ PASS\n');
    passed++;
  } catch (error) {
    console.log(`   ❌ FAIL: ${error.message}\n`);
    failed++;
  }

  // Test 3: Intentar agregar 5ta foto (debe ignorarse)
  console.log('3. Test: Límite de 4 fotos (5ta ignorada)');
  try {
    const result5 = await addPhoto(testUserId, 'https://example.com/foto5.jpg', 'image');
    
    if (result5.currentCount === 4) {
      console.log('   ✅ Se mantiene en 4 fotos (5ta ignorada)');
    } else {
      throw new Error(`currentCount = ${result5.currentCount}, esperado: 4`);
    }
    
    console.log('   ✅ PASS\n');
    passed++;
  } catch (error) {
    console.log(`   ❌ FAIL: ${error.message}\n`);
    failed++;
  }

  // Test 4: getSession devuelve datos correctos
  console.log('4. Test: getSession devuelve sesión correcta');
  try {
    const session = await getSession(testUserId);
    
    if (session && session.photoCount === 4) {
      console.log('   ✅ Sesión encontrada con 4 fotos');
    } else {
      throw new Error(`photoCount = ${session?.photoCount}, esperado: 4`);
    }
    
    if (session.photos && session.photos.length === 4) {
      console.log('   ✅ Array de fotos correcto');
    } else {
      throw new Error(`photos.length = ${session?.photos?.length}, esperado: 4`);
    }
    
    console.log('   ✅ PASS\n');
    passed++;
  } catch (error) {
    console.log(`   ❌ FAIL: ${error.message}\n`);
    failed++;
  }

  // Test 5: completeSession devuelve fotos
  console.log('5. Test: completeSession devuelve fotos correctamente');
  try {
    const result = await completeSession(testUserId);
    
    if (result && result.photos && result.photos.length === 4) {
      console.log('   ✅ completeSession devolvió 4 fotos');
    } else {
      throw new Error(`photos.length = ${result?.photos?.length}, esperado: 4`);
    }
    
    if (result.photoCount === 4) {
      console.log('   ✅ photoCount correcto');
    } else {
      throw new Error(`photoCount = ${result.photoCount}, esperado: 4`);
    }
    
    console.log('   ✅ PASS\n');
    passed++;
  } catch (error) {
    console.log(`   ❌ FAIL: ${error.message}\n`);
    failed++;
  }

  // Test 6: Sesión limpiada después de complete
  console.log('6. Test: Sesión limpiada después de completar');
  try {
    const session = await getSession(testUserId);
    
    if (!session || session.photoCount === 0) {
      console.log('   ✅ Sesión limpiada correctamente');
    } else {
      throw new Error(`Sesión aún existe: ${session.photoCount} fotos`);
    }
    
    console.log('   ✅ PASS\n');
    passed++;
  } catch (error) {
    console.log(`   ❌ FAIL: ${error.message}\n`);
    failed++;
  }

  // Resultados
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`📊 RESULTADOS: ${passed}/${passed + failed} tests passed`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  if (failed > 0) {
    console.log(`❌ ${failed} test(s) fallaron`);
    process.exit(1);
  } else {
    console.log('✅ Todos los tests pasaron - addPhoto funciona correctamente con await');
    process.exit(0);
  }
}

runTests().catch(err => {
  console.error('❌ Error ejecutando tests:', err);
  process.exit(1);
});
