/**
 * 🧪 TESTS: Agent State Manager
 * 
 * Testing de locks, race conditions y validaciones
 * 
 * @author Nena - Mercedes Benz Quality
 * @date 11 Feb 2026
 */

import { describe, beforeEach, test, expect } from '@jest/globals';
import { updateAgent, isUpdateInProgress, getStateHistory, clearHistory } from '../../src/servicios/agent-state-manager.js';

// Mock de saveProfile para testing
let mockDatabase = new Map();

async function mockSaveProfile(userId, profile) {
  // Simular latencia de BD
  await new Promise(resolve => setTimeout(resolve, 10));
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

describe('🤖 Agent State Manager', () => {
  const userA = '+593987770788';
  const userB = '+593992320262';

  beforeEach(() => {
    mockDatabase = new Map();
    clearHistory(userA);
    clearHistory(userB);
  });

  test('Cambio básico exitoso', async () => {
    const profile = getMockProfile(userA, 'AURORA');

    const result = await updateAgent(
      userA,
      'AXEL',
      {
        reason: 'orchestrator',
        fromAgent: 'AURORA',
        intentReason: 'usuario mencionó paintbull'
      },
      mockSaveProfile,
      profile
    );

    expect(result.success).toBe(true);
    expect(result.fromAgent).toBe('AURORA');
    expect(result.toAgent).toBe('AXEL');
    expect(mockDatabase.get(userA).activeAgent).toBe('AXEL');
  });

  test('Transición inválida (mismo agente) retorna error', async () => {
    const profile = getMockProfile(userB, 'AURORA');

    const result = await updateAgent(
      userB,
      'AURORA',
      {
        reason: 'orchestrator',
        fromAgent: 'AURORA'
      },
      mockSaveProfile,
      profile
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe('invalid_transition');
  });

  test('Race condition se serializa con locks', async () => {
    const getProfile = () => getMockProfile(userA, mockDatabase.get(userA)?.activeAgent || 'AURORA');
    const startAgent = 'AURORA';
    mockDatabase.set(userA, getMockProfile(userA, startAgent));

    const updates = [
      updateAgent(userA, 'AXEL', { reason: 'orchestrator', fromAgent: startAgent }, mockSaveProfile, getProfile()),
      updateAgent(userA, 'ALUNA', { reason: 'handoff', fromAgent: startAgent }, mockSaveProfile, getProfile()),
      updateAgent(userA, 'ENZO', { reason: 'orchestrator', fromAgent: startAgent }, mockSaveProfile, getProfile())
    ];

    const results = await Promise.all(updates);
    const successful = results.filter(r => r.success);

    expect(successful.length).toBe(3);
    const history = getStateHistory(userA, 3);
    expect(history.length).toBe(3);
  });

  test('Handoff AXEL → AURORA válido', async () => {
    const profile = getMockProfile(userA, 'AXEL');

    const result = await updateAgent(
      userA,
      'AURORA',
      {
        reason: 'handoff',
        fromAgent: 'AXEL',
        metadata: { trigger: '@aurora' }
      },
      mockSaveProfile,
      profile
    );

    expect(result.success).toBe(true);
    expect(result.fromAgent).toBe('AXEL');
    expect(mockDatabase.get(userA).activeAgent).toBe('AURORA');
  });

  test('Historial guarda últimos cambios', async () => {
    const profile = getMockProfile(userB, 'AURORA');

    await updateAgent(userB, 'AXEL', { reason: 'orchestrator', fromAgent: 'AURORA' }, mockSaveProfile, { ...profile, activeAgent: 'AURORA' });
    await updateAgent(userB, 'AURORA', { reason: 'handoff', fromAgent: 'AXEL' }, mockSaveProfile, { ...profile, activeAgent: 'AXEL' });
    await updateAgent(userB, 'ALUNA', { reason: 'orchestrator', fromAgent: 'AURORA' }, mockSaveProfile, { ...profile, activeAgent: 'AURORA' });

    const history = getStateHistory(userB, 3);
    expect(history.map(h => h.toAgent)).toEqual(['ALUNA', 'AURORA', 'AXEL']);
  });

  test('Detecta update en progreso y libera luego', async () => {
    const profile = getMockProfile(userA, 'AURORA');

    expect(isUpdateInProgress(userA)).toBe(false);
    const updatePromise = updateAgent(userA, 'AXEL', { reason: 'orchestrator', fromAgent: 'AURORA' }, mockSaveProfile, profile);
    expect(isUpdateInProgress(userA)).toBe(true);
    await updatePromise;
    expect(isUpdateInProgress(userA)).toBe(false);
  });

  test('Force update permite skipValidation', async () => {
    const profile = getMockProfile(userA, 'AURORA');

    const result = await updateAgent(
      userA,
      'AURORA',
      {
        reason: 'force',
        fromAgent: 'AURORA',
        skipValidation: true
      },
      mockSaveProfile,
      profile
    );

    expect(result.success).toBe(true);
  });
});
