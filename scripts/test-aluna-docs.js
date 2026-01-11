#!/usr/bin/env node
/**
 * 📋 TEST: Aluna - Análisis de Documentos de Contratos
 * 
 * Tests del sistema de análisis de documentos de contratos y membresías
 * (contratos, acuerdos, términos, facturas, propuestas, políticas, reportes)
 * 
 * Fecha: 2026-01-11
 * Autor: Agente Copilot
 */

import contractDocumentAnalysis from '../src/servicios/contract-document-analysis.js';

const { 
  analyzeContractDocument, 
  detectDocumentType, 
  buildContractPrompt,
  extractMembershipData,
  extractInvoiceData,
  DOCUMENT_TYPES 
} = contractDocumentAnalysis;

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

// ============================================================================
// TEST 1: Detección de Tipos de Documentos
// ============================================================================
async function testDocumentTypeDetection() {
  logSection('TEST 1: DETECCIÓN DE TIPOS DE DOCUMENTOS');
  
  const testCases = [
    { message: 'Te envío el contrato de membresía Plan 10', expected: 'membership' },
    { message: 'Revisa este acuerdo comercial', expected: 'agreement' },
    { message: 'Estos son los términos y condiciones', expected: 'terms' },
    { message: 'Aquí está la factura del mes', expected: 'invoice' },
    { message: 'Te mando la propuesta de servicios', expected: 'proposal' },
    { message: 'Analiza esta política interna', expected: 'policy' },
    { message: 'Necesito que revises este reporte', expected: 'report' },
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
    'membership',
    'agreement',
    'terms',
    'invoice',
    'proposal',
    'policy',
    'report',
    'general'
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const docType of documentTypes) {
    try {
      const prompt = buildContractPrompt(docType, 'Analiza este documento');
      
      // Validaciones
      const hasStructure = prompt.includes('1.') || prompt.includes('a)') || prompt.includes('-');
      const hasContext = prompt.includes('Aluna') || prompt.includes('Coworkia') || prompt.includes('membresía');
      const isLongEnough = prompt.length > 200;
      
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
// TEST 3: Extracción de Datos de Membresía
// ============================================================================
async function testMembershipDataExtraction() {
  logSection('TEST 3: EXTRACCIÓN DE DATOS DE MEMBRESÍA');
  
  const mockMembershipAnalysis = `
ANÁLISIS DE CONTRATO DE MEMBRESÍA

1. Información del Contrato
   - Tipo de membresía: Plan 20
   - Duración: Mensual (renovación automática)
   - Precio: $180.00 USD
   - Fecha de Inicio: 01/02/2026
   - Vigencia: 12 meses

2. Beneficios Incluidos
   • 20 días + 2 GRATIS = 22 días al mes
   • Locker privado incluido
   • 4 invitados gratis al mes
   • 4 usos de sala de reuniones
   • Secretaria Virtual con IA (contratos 9+ meses)

3. Obligaciones
   - Pago anticipado primeros días del mes
   - Días NO acumulables
  `;
  
  let passed = 0;
  let total = 5;
  
  const data = extractMembershipData(mockMembershipAnalysis);
  
  // Test membershipType
  if (data.membershipType && data.membershipType.includes('Plan 20')) {
    log('✅ Tipo de membresía extraído correctamente', 'green');
    passed++;
  } else {
    log('❌ Tipo de membresía no extraído', 'red');
  }
  
  // Test duration
  if (data.duration && data.duration.includes('Mensual')) {
    log('✅ Duración extraída correctamente', 'green');
    passed++;
  } else {
    log('❌ Duración no extraída', 'red');
  }
  
  // Test price
  if (data.price && data.price.includes('180')) {
    log('✅ Precio extraído correctamente', 'green');
    passed++;
  } else {
    log('❌ Precio no extraído', 'red');
  }
  
  // Test startDate
  if (data.startDate) {
    log('✅ Fecha de inicio extraída correctamente', 'green');
    passed++;
  } else {
    log('❌ Fecha de inicio no extraída', 'red');
  }
  
  // Test benefits
  if (data.benefits && data.benefits.length >= 3) {
    log(`✅ Beneficios extraídos correctamente (${data.benefits.length})`, 'green');
    passed++;
  } else {
    log('❌ Beneficios no extraídos correctamente', 'red');
  }
  
  log(`\n📊 Resultado: ${passed}/${total} extracciones correctas`, passed === total ? 'green' : 'yellow');
  
  return { passed, total };
}

// ============================================================================
// TEST 4: Extracción de Datos de Factura
// ============================================================================
async function testInvoiceDataExtraction() {
  logSection('TEST 4: EXTRACCIÓN DE DATOS DE FACTURA');
  
  const mockInvoiceAnalysis = `
ANÁLISIS DE FACTURA

1. Datos de la Factura
   - Número: 001-001-000012345
   - Fecha: 15/01/2026
   - Emisor: Coworkia Spaces S.A.
   - RUC: 1791234567001

2. Detalle de Servicios
   - Membresía Plan 20 (Febrero 2026)
   - Cantidad: 1
   - Precio: $180.00

3. Cálculo Financiero
   - Subtotal: $150.00
   - IVA 12%: $18.00
   - Total: $180.00
  `;
  
  let passed = 0;
  let total = 5;
  
  const data = extractInvoiceData(mockInvoiceAnalysis);
  
  // Test invoiceNumber
  if (data.invoiceNumber) {
    log(`✅ Número de factura extraído: ${data.invoiceNumber}`, 'green');
    passed++;
  } else {
    log('❌ Número de factura no extraído', 'red');
  }
  
  // Test issueDate
  if (data.issueDate) {
    log(`✅ Fecha extraída: ${data.issueDate}`, 'green');
    passed++;
  } else {
    log('❌ Fecha no extraída', 'red');
  }
  
  // Test issuer
  if (data.issuer && data.issuer.includes('Coworkia')) {
    log(`✅ Emisor extraído: ${data.issuer}`, 'green');
    passed++;
  } else {
    log('❌ Emisor no extraído', 'red');
  }
  
  // Test totalAmount
  if (data.totalAmount && data.totalAmount.includes('180')) {
    log(`✅ Total extraído: ${data.totalAmount}`, 'green');
    passed++;
  } else {
    log('❌ Total no extraído', 'red');
  }
  
  // Test taxAmount
  if (data.taxAmount && data.taxAmount.includes('18')) {
    log(`✅ IVA extraído: ${data.taxAmount}`, 'green');
    passed++;
  } else {
    log('❌ IVA no extraído', 'red');
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
  const expectedTypes = ['membership', 'agreement', 'terms', 'invoice', 'proposal', 'policy', 'report', 'general'];
  
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
    'analyzeContractDocument',
    'detectDocumentType',
    'buildContractPrompt',
    'extractMembershipData',
    'extractInvoiceData',
    'calculateDocumentQualityScore'
  ];
  
  for (const funcName of expectedFunctions) {
    total++;
    const exists = typeof contractDocumentAnalysis[funcName] === 'function';
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
  log('\n📋 ALUNA - SISTEMA DE ANÁLISIS DE DOCUMENTOS DE CONTRATOS', 'cyan');
  log('='.repeat(80), 'cyan');
  log('Fecha: ' + new Date().toISOString(), 'cyan');
  log('='.repeat(80) + '\n', 'cyan');
  
  const results = [];
  
  // Test 1
  results.push(await testDocumentTypeDetection());
  
  // Test 2
  results.push(await testPromptGeneration());
  
  // Test 3
  results.push(await testMembershipDataExtraction());
  
  // Test 4
  results.push(await testInvoiceDataExtraction());
  
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
    log('✅ Sistema de análisis de documentos de Aluna listo para producción', 'green');
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
