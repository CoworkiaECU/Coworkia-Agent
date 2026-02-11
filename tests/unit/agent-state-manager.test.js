/**
 * 🧪 TESTS: Agent State Manager
 * 
 * Testing de locks, race conditions y validaciones
 * 
 * @author Nena - Mercedes Benz Quality
 * @date 11 Feb 2026
 */

import { updateAgent, isUpdateInProgress, getStateHistory, clearHistory } from '../../src/servicios/agent-state-manager.js';

// Mock de saveProfile para testing
let mockDatabase = new Map();

async function mockSaveProfile(userId, profile) {
  // Simular latencia de BD
  await new Promise(resolve => setTimeout(resolve, 50));
  mockDatabase.set(userId, { ...profile });
  return true;
}

function getMockProfile(userId, activeAgent = 'AURORA') {
  return mockDatabase.get(userId) || {
    phoneNumber: userId,
    name: 'Test User',
    activeAgent,
    conversationCount: 0,
    agentHistory: {}
  };
}

// 🧪 TEST 1: Cambio básico exitoso
async function testBasicUpdate() {
  console.log('\n🧪 TEST 1: Cambio básico exitoso');
  
  const userId = '+593987770788';
  const profile = getMockProfile(userId, 'AURORA');
  
  const result = await updateAgent(
    userId,
    'AXEL',
    {
      reason: 'orchestrator',
      fromAgent: 'AURORA',
      intentReason: 'usuario mencionó paintbull'
    },
    mockSaveProfile,
    profile
  );
  
  console.assert(result.success === true, '❌ Cambio debería ser exitoso');
  console.assert(result.fromAgent === 'AURORA', '❌ fromAgent incorrecto');
  console.assert(result.toAgent === 'AXEL', '❌ toAgent incorrecto');
  console.assert(mockDatabase.get(userId).activeAgent === 'AXEL', '❌ BD no actualizada');
  
  console.log('✅ TEST 1 PASADO');
}

// 🧪 TEST 2: Transición inválida (mismo agente)
async function testInvalidSameAgent() {
  console.log('\n🧪 TEST 2: Transición inválida (mismo agente)');
  
  const userId = '+593992320262';
  const profile = getMockProfile(userId, 'AURORA');
  
  const result = await updateAgent(
    userId,
    'AURORA', // Mismo agente
    {
      reason: 'orchestrator',
      fromAgent: 'AURORA'
    },
    mockSaveProfile,
    profile
  );
  
  console.assert(result.success === false, '❌ Debería fallar (mismo agente)');
  console.assert(result.error === 'invalid_transition', '❌ Error incorrecto');
  
  console.log('✅ TEST 2 PASADO');
}

// 🧪 TEST 3: Race condition - múltiples updates concurrentes
async function testRaceCondition() {
  console.log('\n🧪 TEST 3: Race condition - múltiples updates concurrentes');
  
  const userId = '+593987770788';
  
  // Función que obtiene profile fresco de "BD" cada vez
  const getProfile = () => getMockProfile(userId, mockDatabase.get(userId)?.activeAgent || 'AURORA');
  
  // Lanzar 3 updates simultáneos que comparten la misma referencia inicial
  const startAgent = 'AURORA';
  mockDatabase.set(userId, getMockProfile(userId, startAgent));
  
  const updates = [
    updateAgent(userId, 'AXEL', { reason: 'orchestrator', fromAgent: startAgent }, mockSaveProfile, getProfile()),
    updateAgent(userId, 'ALUNA', { reason: 'handoff', fromAgent: startAgent }, mockSaveProfile, getProfile()),
    updateAgent(userId, 'ENZO', { reason: 'orchestrator', fromAgent: startAgent }, mockSaveProfile, getProfile())
  ];
  
  const results = await Promise.all(updates);
  
  // Todos deberían ser exitosos porque el lock serializa las operaciones
  const successful = results.filter(r => r.success);
  console.log(`Updates exitosos: ${successful.length}/3`);
  
  // Verificar que el lock serializó las operaciones (todos exitosos pero secuenciales)
  console.assert(successful.length === 3, `❌ Lock debería permitir todos pero serialmente, hubo ${successful.length}`);
  
  // Verificar que BD tiene un agente final consistente
  const finalProfile = mockDatabase.get(userId);
  console.log('Agente final en BD:', finalProfile.activeAgent);
  
  // El historial debería mostrar 3 cambios
  const history = getStateHistory(userId, 3);
  console.assert(history.length === 3, `❌ Debería haber 3 cambios en historial, hay ${history.length}`);
  
  console.log('✅ TEST 3 PASADO - Lock serializó operaciones correctamente');
}

// 🧪 TEST 4: Handoff con validación correcta
async function testHandoffTransition() {
  console.log('\n🧪 TEST 4: Handoff desde AXEL a AURORA');
  
  const userId = '+593987770788';
  const profile = getMockProfile(userId, 'AXEL');
  
  const result = await updateAgent(
    userId,
    'AURORA',
    {
      reason: 'handoff',
      fromAgent: 'AXEL',
      metadata: { trigger: '@aurora' }
    },
    mockSaveProfile,
    profile
  );
  
  console.assert(result.success === true, '❌ Handoff AXEL→AURORA debería ser válido');
  console.assert(result.fromAgent === 'AXEL', '❌ fromAgent debería ser AXEL');
  console.assert(mockDatabase.get(userId).activeAgent === 'AURORA', '❌ BD no actualizada');
  
  console.log('✅ TEST 4 PASADO');
}

// 🧪 TEST 5: Historial de cambios
async function testStateHistory() {
  console.log('\n🧪 TEST 5: Historial de cambios');
  
  const userId = '+593992320262';
  clearHistory(userId);
  
  const profile = getMockProfile(userId, 'AURORA');
  
  // Hacer 3 cambios
  await updateAgent(userId, 'AXEL', { reason: 'orchestrator', fromAgent: 'AURORA' }, mockSaveProfile, { ...profile, activeAgent: 'AURORA' });
  await updateAgent(userId, 'AURORA', { reason: 'handoff', fromAgent: 'AXEL' }, mockSaveProfile, { ...profile, activeAgent: 'AXEL' });
  await updateAgent(userId, 'ALUNA', { reason: 'orchestrator', fromAgent: 'AURORA' }, mockSaveProfile, { ...profile, activeAgent: 'AURORA' });
  
  const history = getStateHistory(userId, 3);
  
  console.assert(history.length === 3, `❌ Debería haber 3 cambios, hay ${history.length}`);
  console.assert(history[0].toAgent === 'ALUNA', '❌ Último cambio incorrecto');
  console.assert(history[1].toAgent === 'AURORA', '❌ Segundo cambio incorrecto');
  console.assert(history[2].toAgent === 'AXEL', '❌ Primer cambio incorrecto');
  
  console.log('✅ TEST 5 PASADO');
}

// 🧪 TEST 6: isUpdateInProgress
async function testUpdateInProgress() {
  console.log('\n🧪 TEST 6: Detectar update en progreso');
  
  const userId = '+593987770788';
  const profile = getMockProfile(userId, 'AURORA');
  
  console.assert(!isUpdateInProgress(userId), '❌ No debería haber update en progreso');
  
  // Lanzar update sin esperar
  const updatePromise = updateAgent(userId, 'AXEL', { reason: 'orchestrator', fromAgent: 'AURORA' }, mockSaveProfile, profile);
  
  // Verificar que detecta update en progreso
  console.assert(isUpdateInProgress(userId), '❌ Debería detectar update en progreso');
  
  // Esperar que termine
  await updatePromise;
  
  console.assert(!isUpdateInProgress(userId), '❌ Update debería haber terminado');
  
  console.log('✅ TEST 6 PASADO');
}

// 🧪 TEST 7: Force update (skip validation)
async function testForceUpdate() {
  console.log('\n🧪 TEST 7: Force update (skip validation)');
  
  const userId = '+593987770788';
  const profile = getMockProfile(userId, 'AURORA');
  
  const result = await updateAgent(
    userId,
    'AURORA', // Mismo agente (normalmente inválido)
    {
      reason: 'force',
      fromAgent: 'AURORA',
      skipValidation: true
    },
    mockSaveProfile,
    profile
  );
  
  console.assert(result.success === true, '❌ Force update debería ser exitoso');
  
  console.log('✅ TEST 7 PASADO');
}

// 🚀 EJECUTAR TODOS LOS TESTS
async function runAllTests() {
  console.log('🚀 INICIANDO TESTS DE AGENT STATE MANAGER\n');
  console.log('═══════════════════════════════════════════\n');
  
  try {
    await testBasicUpdate();
    await testInvalidSameAgent();
    await testRaceCondition();
    await testHandoffTransition();
    await testStateHistory();
    await testUpdateInProgress();
    await testForceUpdate();
    
    console.log('\n═══════════════════════════════════════════');
    console.log('✅ TODOS LOS TESTS PASARON');
    console.log('═══════════════════════════════════════════\n');
    
  } catch (error) {
    console.error('\n❌ TEST FALLÓ:', error);
    process.exit(1);
  }
}

// Ejecutar si se llama directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests();
}

export { runAllTests };
