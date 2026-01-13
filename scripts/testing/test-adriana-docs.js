#!/usr/bin/env node
/**
 * 🛡️ TEST: Adriana - Análisis de Documentos de Seguros
 * 
 * Tests del sistema de análisis de documentos de seguros (pólizas, siniestros, cotizaciones, certificados, etc.)
 * 
 * Fecha: 2026-01-11
 * Autor: Agente Copilot
 */

import insuranceDocumentAnalysis from '../../src/servicios/insurance-document-analysis.js';

const { 
  analyzeInsuranceDocument, 
  detectDocumentType, 
  buildInsurancePrompt,
  DOCUMENT_TYPES 
} = insuranceDocumentAnalysis;

// URLs de prueba (documentos de ejemplo)
const TEST_DOCUMENTS = {
  policy: 'https://example.com/poliza-vida.pdf',
  claim: 'https://example.com/formulario-siniestro.pdf',
  quote: 'https://example.com/cotizacion-vehicular.pdf',
  certificate: 'https://example.com/certificado-cobertura.pdf'
};

// Colores para output
const COLORS = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${COLORS[color]}${message}${COLORS.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(80));
  log(title, 'cyan');
  console.log('='.repeat(80) + '\n');
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================================
// TEST 1: Detección de Tipos de Documentos
// ============================================================================
async function testDocumentTypeDetection() {
  logSection('TEST 1: DETECCIÓN DE TIPOS DE DOCUMENTOS');
  
  const testCases = [
    { message: 'Te envío mi póliza de seguro de vida', expected: 'policy' },
    { message: 'Quiero hacer un reclamo de siniestro', expected: 'claim' },
    { message: 'Necesito una cotización para mi carro', expected: 'quote' },
    { message: 'Puedes revisar este certificado de cobertura?', expected: 'certificate' },
    { message: 'Mi póliza está por renovarse', expected: 'renewal' },
    { message: 'Llené la solicitud de seguro', expected: 'application' },
    { message: 'Me llegó un endoso', expected: 'endorsement' },
    { message: 'Qué es este documento?', expected: 'general' }
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const testCase of testCases) {
    const detected = detectDocumentType(testCase.message);
    const isCorrect = detected === testCase.expected;
    
    if (isCorrect) {
      log(`✅ "${testCase.message}" → ${detected}`, 'green');
      passed++;
    } else {
      log(`❌ "${testCase.message}" → ${detected} (esperado: ${testCase.expected})`, 'red');
      failed++;
    }
  }
  
  log(`\n📊 Resultado: ${passed}/${testCases.length} correctos`, passed === testCases.length ? 'green' : 'yellow');
  
  return { passed, total: testCases.length };
}

// ============================================================================
// TEST 2: Generación de Prompts Especializados
// ============================================================================
async function testPromptGeneration() {
  logSection('TEST 2: GENERACIÓN DE PROMPTS ESPECIALIZADOS');
  
  const documentTypes = [
    'policy',
    'claim',
    'quote',
    'certificate',
    'renewal',
    'application',
    'endorsement',
    'general'
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const docType of documentTypes) {
    try {
      const prompt = buildInsurancePrompt(docType, 'Analiza este documento');
      
      // Validaciones
      const hasDocType = prompt.toLowerCase().includes(docType.replace('_', ' '));
      const hasStructure = prompt.includes('1.') || prompt.includes('a)') || prompt.includes('-');
      const hasContext = prompt.includes('Segpopular') || prompt.includes('broker') || prompt.includes('seguros');
      const isLongEnough = prompt.length > 200; // Prompts profesionales deben ser detallados
      
      if (hasStructure && isLongEnough) {
        log(`✅ ${docType.toUpperCase()}: Prompt válido (${prompt.length} chars)`, 'green');
        passed++;
      } else {
        log(`❌ ${docType.toUpperCase()}: Prompt inválido`, 'red');
        console.log(`   Estructura: ${hasStructure}, Longitud: ${prompt.length}`);
        failed++;
      }
    } catch (error) {
      log(`❌ ${docType.toUpperCase()}: Error al generar prompt - ${error.message}`, 'red');
      failed++;
    }
  }
  
  log(`\n📊 Resultado: ${passed}/${documentTypes.length} prompts válidos`, passed === documentTypes.length ? 'green' : 'yellow');
  
  return { passed, total: documentTypes.length };
}

// ============================================================================
// TEST 3: Análisis Completo Mock (sin API real)
// ============================================================================
async function testCompleteAnalysisMock() {
  logSection('TEST 3: ANÁLISIS COMPLETO (MOCK)');
  
  log('ℹ️  Nota: Este test valida la estructura sin llamar a la API de OpenAI', 'yellow');
  
  try {
    // Mock de analyzeImage para evitar llamadas reales
    const mockAnalyze = async (url, prompt, options) => {
      return {
        content: `ANÁLISIS DE PÓLIZA DE SEGUROS

1. **Información General**
   - Póliza: P-2026-001234
   - Aseguradora: BMI Ecuador
   - Tipo: Seguro de Vida Individual
   - Prima Anual: $850,00

2. **Coberturas Incluidas**
   - Muerte Natural: $50,000
   - Muerte Accidental: $100,000
   - Gastos Funerarios: $3,000

3. **Análisis de Valor**
   - Relación prima/cobertura es competitiva
   - Cláusulas claras y transparentes
   
Calificación: 8.5/10`,
        choices: [{ message: { content: 'Mock análisis' } }]
      };
    };
    
    // Guardamos la función original
    const originalAnalyze = insuranceDocumentAnalysis.__analyzeImage;
    
    // Reemplazamos temporalmente con mock
    insuranceDocumentAnalysis.__analyzeImage = mockAnalyze;
    
    const result = await analyzeInsuranceDocument(
      TEST_DOCUMENTS.policy,
      'Analiza mi póliza de vida',
      { documentType: 'policy' }
    );
    
    // Validaciones
    const hasSuccess = result.success === true;
    const hasDocType = result.documentType === 'policy';
    const hasAnalysis = result.analysis && result.analysis.length > 100;
    const hasTimestamp = result.timestamp !== undefined;
    
    if (hasSuccess && hasDocType && hasAnalysis && hasTimestamp) {
      log('✅ Análisis completo generado correctamente', 'green');
      log(`   - Tipo: ${result.documentType}`, 'blue');
      log(`   - Análisis: ${result.analysis.substring(0, 80)}...`, 'blue');
      log(`   - Timestamp: ${new Date(result.timestamp).toISOString()}`, 'blue');
      
      // Restauramos función original
      insuranceDocumentAnalysis.__analyzeImage = originalAnalyze;
      
      return { passed: 1, total: 1 };
    } else {
      log('❌ Estructura de resultado incompleta', 'red');
      console.log('Resultado:', JSON.stringify(result, null, 2));
      
      insuranceDocumentAnalysis.__analyzeImage = originalAnalyze;
      
      return { passed: 0, total: 1 };
    }
  } catch (error) {
    log(`❌ Error en análisis: ${error.message}`, 'red');
    console.error(error);
    return { passed: 0, total: 1 };
  }
}

// ============================================================================
// TEST 4: Extracción de Datos Estructurados
// ============================================================================
async function testDataExtraction() {
  logSection('TEST 4: EXTRACCIÓN DE DATOS ESTRUCTURADOS');
  
  const { extractPolicyData, extractClaimData } = insuranceDocumentAnalysis;
  
  // Mock de análisis con datos estructurados
  const mockPolicyAnalysis = `
ANÁLISIS DE PÓLIZA

Póliza: P-2026-12345
Aseguradora: BMI Ecuador
Prima Anual: $1,200.00
Cobertura: Vida + Accidentes
Vigencia: 01/01/2026 - 31/12/2026

Coberturas detalladas...
  `;
  
  const mockClaimAnalysis = `
ANÁLISIS DE SINIESTRO

Número de Siniestro: SIN-2026-9876
Fecha del Siniestro: 15 de diciembre de 2025
Monto Reclamado: $5,400.00
Estado: En proceso de evaluación

Documentos requeridos...
  `;
  
  let passed = 0;
  let total = 2;
  
  // Test extracción de póliza
  try {
    const policyData = extractPolicyData(mockPolicyAnalysis);
    
    const hasPolicy = policyData.policyNumber === 'P-2026-12345';
    const hasInsurer = policyData.insurer === 'BMI Ecuador';
    const hasPremium = policyData.premium === '$1,200.00';
    
    if (hasPolicy && hasInsurer && hasPremium) {
      log('✅ Extracción de datos de póliza correcta', 'green');
      log(`   - Póliza: ${policyData.policyNumber}`, 'blue');
      log(`   - Aseguradora: ${policyData.insurer}`, 'blue');
      log(`   - Prima: ${policyData.premium}`, 'blue');
      passed++;
    } else {
      log('❌ Extracción de póliza incompleta', 'red');
    }
  } catch (error) {
    log(`❌ Error en extracción de póliza: ${error.message}`, 'red');
  }
  
  // Test extracción de siniestro
  try {
    const claimData = extractClaimData(mockClaimAnalysis);
    
    const hasClaim = claimData.claimNumber === 'SIN-2026-9876';
    const hasAmount = claimData.claimAmount === '$5,400.00';
    const hasStatus = claimData.status === 'En proceso de evaluación';
    
    if (hasClaim && hasAmount && hasStatus) {
      log('✅ Extracción de datos de siniestro correcta', 'green');
      log(`   - Siniestro: ${claimData.claimNumber}`, 'blue');
      log(`   - Monto: ${claimData.claimAmount}`, 'blue');
      log(`   - Estado: ${claimData.status}`, 'blue');
      passed++;
    } else {
      log('❌ Extracción de siniestro incompleta', 'red');
    }
  } catch (error) {
    log(`❌ Error en extracción de siniestro: ${error.message}`, 'red');
  }
  
  log(`\n📊 Resultado: ${passed}/${total} extracciones correctas`, passed === total ? 'green' : 'yellow');
  
  return { passed, total };
}

// ============================================================================
// TEST 5: Validación de Constantes y Exports
// ============================================================================
async function testExportsAndConstants() {
  logSection('TEST 5: VALIDACIÓN DE EXPORTS Y CONSTANTES');
  
  let passed = 0;
  let total = 0;
  
  // Test DOCUMENT_TYPES
  const expectedTypes = ['policy', 'claim', 'quote', 'certificate', 'renewal', 'application', 'endorsement', 'general'];
  
  for (const type of expectedTypes) {
    total++;
    const exists = Object.values(DOCUMENT_TYPES).includes(type);
    if (exists) {
      log(`✅ DOCUMENT_TYPES.${type.toUpperCase()} existe`, 'green');
      passed++;
    } else {
      log(`❌ DOCUMENT_TYPES.${type.toUpperCase()} no encontrado`, 'red');
    }
  }
  
  // Test funciones exportadas
  const expectedFunctions = [
    'analyzeInsuranceDocument',
    'detectDocumentType',
    'buildInsurancePrompt',
    'extractPolicyData',
    'extractClaimData',
    'calculateDocumentQualityScore'
  ];
  
  for (const funcName of expectedFunctions) {
    total++;
    const exists = typeof insuranceDocumentAnalysis[funcName] === 'function';
    if (exists) {
      log(`✅ Función ${funcName}() exportada`, 'green');
      passed++;
    } else {
      log(`❌ Función ${funcName}() no encontrada`, 'red');
    }
  }
  
  log(`\n📊 Resultado: ${passed}/${total} exports válidos`, passed === total ? 'green' : 'yellow');
  
  return { passed, total };
}

// ============================================================================
// EJECUTAR TODOS LOS TESTS
// ============================================================================
async function runAllTests() {
  log('\n🛡️  ADRIANA - SISTEMA DE ANÁLISIS DE DOCUMENTOS DE SEGUROS', 'cyan');
  log('='.repeat(80), 'cyan');
  log('Fecha: ' + new Date().toISOString(), 'cyan');
  log('='.repeat(80) + '\n', 'cyan');
  
  const results = [];
  
  // Test 1
  results.push(await testDocumentTypeDetection());
  await sleep(500);
  
  // Test 2
  results.push(await testPromptGeneration());
  await sleep(500);
  
  // Test 3
  results.push(await testCompleteAnalysisMock());
  await sleep(500);
  
  // Test 4
  results.push(await testDataExtraction());
  await sleep(500);
  
  // Test 5
  results.push(await testExportsAndConstants());
  
  // Resultados finales
  logSection('📊 RESUMEN FINAL');
  
  const totalPassed = results.reduce((sum, r) => sum + r.passed, 0);
  const totalTests = results.reduce((sum, r) => sum + r.total, 0);
  const percentage = ((totalPassed / totalTests) * 100).toFixed(1);
  
  log(`Tests Pasados: ${totalPassed}/${totalTests} (${percentage}%)`, totalPassed === totalTests ? 'green' : 'yellow');
  
  results.forEach((result, index) => {
    const testNum = index + 1;
    const status = result.passed === result.total ? '✅' : '⚠️';
    log(`${status} Test ${testNum}: ${result.passed}/${result.total}`, result.passed === result.total ? 'green' : 'yellow');
  });
  
  if (totalPassed === totalTests) {
    log('\n🎉 ¡TODOS LOS TESTS PASARON!', 'green');
    log('✅ Sistema de análisis de documentos de Adriana listo para producción', 'green');
    process.exit(0);
  } else {
    log('\n⚠️  ALGUNOS TESTS FALLARON', 'yellow');
    log(`❌ ${totalTests - totalPassed} test(s) requieren atención`, 'red');
    process.exit(1);
  }
}

// Ejecutar
runAllTests().catch(error => {
  console.error('❌ Error fatal en tests:', error);
  process.exit(1);
});
