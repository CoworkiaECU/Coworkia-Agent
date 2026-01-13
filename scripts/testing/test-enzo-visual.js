#!/usr/bin/env node

/**
 * 🧪 Test del Sistema de Análisis Visual de Marketing - Enzo
 * 
 * Valida el funcionamiento del sistema de análisis visual
 */

import { analyzeMarketingVisual, ANALYSIS_TYPES, extractActionableInsights, calculateVisualQualityScore } from '../../src/servicios/marketing-visual-analysis.js';

const TEST_IMAGE_URL = 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=800'; // Logo genérico

console.log('🧪 INICIANDO TESTS - ENZO MARKETING VISUAL ANALYSIS\n');

async function testDetection() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 1: Detección Automática de Tipo Visual');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  const tests = [
    { message: 'Analiza mi logo', expected: ANALYSIS_TYPES.LOGO },
    { message: 'Mira este ad de Facebook', expected: ANALYSIS_TYPES.CAMPAIGN },
    { message: 'Este post para Instagram', expected: ANALYSIS_TYPES.SOCIAL_POST },
    { message: 'Diseño de banner', expected: ANALYSIS_TYPES.BANNER },
    { message: 'Captura de pantalla de métricas', expected: ANALYSIS_TYPES.SCREENSHOT }
  ];
  
  let passed = 0;
  
  for (const test of tests) {
    try {
      const result = await analyzeMarketingVisual(TEST_IMAGE_URL, test.message, { 
        visualType: null // Forzar detección automática
      });
      
      const detected = result.visualType;
      const success = detected === test.expected;
      
      console.log(`${success ? '✅' : '❌'} "${test.message}"`);
      console.log(`   Esperado: ${test.expected}, Detectado: ${detected}\n`);
      
      if (success) passed++;
    } catch (error) {
      console.log(`❌ "${test.message}"`);
      console.log(`   Error: ${error.message}\n`);
    }
  }
  
  console.log(`📊 Resultado: ${passed}/${tests.length} tests pasaron\n`);
  return passed === tests.length;
}

async function testAnalysis() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 2: Análisis Visual Completo');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  try {
    console.log('🔄 Analizando imagen de prueba...\n');
    
    const result = await analyzeMarketingVisual(
      TEST_IMAGE_URL,
      'Analiza este logo de marca tech',
      { visualType: ANALYSIS_TYPES.LOGO }
    );
    
    if (result.success) {
      console.log('✅ Análisis completado exitosamente\n');
      console.log('📊 RESULTADO:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(result.analysis.substring(0, 500) + '...\n');
      console.log(`Tipo: ${result.visualType}`);
      console.log(`Timestamp: ${result.timestamp}`);
      console.log(`Confianza: ${result.confidence}\n`);
      
      // Extraer insights
      const insights = extractActionableInsights(result.analysis);
      console.log('💡 INSIGHTS EXTRAÍDOS:');
      insights.forEach((insight, i) => {
        console.log(`   ${i + 1}. ${insight}`);
      });
      console.log('');
      
      // Calcular score
      const score = calculateVisualQualityScore(result.analysis);
      console.log(`📈 QUALITY SCORE: ${score}/100\n`);
      
      return true;
    } else {
      console.log('❌ Análisis falló:', result.error, '\n');
      return false;
    }
    
  } catch (error) {
    console.log('❌ Error en test:', error.message, '\n');
    return false;
  }
}

async function testBatch() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 3: Análisis Batch (Múltiples Imágenes)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  try {
    const { analyzeBatchMarketingVisuals } = await import('../src/servicios/marketing-visual-analysis.js');
    
    const imageUrls = [
      'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=400',
      'https://images.unsplash.com/photo-1611162616305-c69b3fa7fbe0?w=400'
    ];
    
    console.log(`🔄 Analizando ${imageUrls.length} imágenes...\n`);
    
    const result = await analyzeBatchMarketingVisuals(
      imageUrls,
      'Compara estos logos'
    );
    
    if (result.success) {
      console.log('✅ Análisis batch completado\n');
      console.log(`📊 Total imágenes: ${result.totalImages}`);
      console.log(`✅ Analizadas: ${result.analyzedImages}`);
      console.log(`❌ Fallidas: ${result.failedImages}\n`);
      
      if (result.analyzedImages > 0) {
        console.log('📄 ANÁLISIS CONSOLIDADO:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(result.analysis.substring(0, 400) + '...\n');
      }
      
      return result.analyzedImages === result.totalImages;
    } else {
      console.log('❌ Análisis batch falló:', result.error, '\n');
      return false;
    }
    
  } catch (error) {
    console.log('❌ Error en test batch:', error.message, '\n');
    return false;
  }
}

async function testPromptBuilding() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 4: Construcción de Prompts Especializados');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  const types = Object.values(ANALYSIS_TYPES);
  let passed = 0;
  
  for (const type of types) {
    try {
      const result = await analyzeMarketingVisual(
        TEST_IMAGE_URL,
        `Test ${type}`,
        { visualType: type }
      );
      
      if (result.visualType === type) {
        console.log(`✅ Prompt para ${type.toUpperCase()}: OK`);
        passed++;
      } else {
        console.log(`❌ Prompt para ${type.toUpperCase()}: FAILED`);
      }
    } catch (error) {
      console.log(`❌ Prompt para ${type.toUpperCase()}: ERROR - ${error.message}`);
    }
  }
  
  console.log(`\n📊 Resultado: ${passed}/${types.length} prompts válidos\n`);
  return passed === types.length;
}

// Ejecutar todos los tests
async function runAllTests() {
  console.log('╔═══════════════════════════════════════════════════════╗');
  console.log('║   🎯 ENZO MARKETING VISUAL ANALYSIS - TEST SUITE    ║');
  console.log('╚═══════════════════════════════════════════════════════╝\n');
  
  const results = {
    detection: await testDetection(),
    analysis: await testAnalysis(),
    batch: await testBatch(),
    prompts: await testPromptBuilding()
  };
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 RESUMEN FINAL');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  console.log(`${results.detection ? '✅' : '❌'} Test 1: Detección de Tipo Visual`);
  console.log(`${results.analysis ? '✅' : '❌'} Test 2: Análisis Visual Completo`);
  console.log(`${results.batch ? '✅' : '❌'} Test 3: Análisis Batch`);
  console.log(`${results.prompts ? '✅' : '❌'} Test 4: Construcción de Prompts\n`);
  
  const totalPassed = Object.values(results).filter(r => r).length;
  const totalTests = Object.keys(results).length;
  const percentage = Math.round((totalPassed / totalTests) * 100);
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`✅ ${totalPassed}/${totalTests} tests pasaron (${percentage}%)`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  if (totalPassed === totalTests) {
    console.log('🎉 TODOS LOS TESTS PASARON - SISTEMA OPERATIVO\n');
    process.exit(0);
  } else {
    console.log('⚠️  ALGUNOS TESTS FALLARON - REVISAR ERRORES\n');
    process.exit(1);
  }
}

// Ejecutar
runAllTests().catch(error => {
  console.error('❌ Error fatal en tests:', error);
  process.exit(1);
});
