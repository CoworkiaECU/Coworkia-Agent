/**
 * 🧪 Tests del Sistema de Handoff entre Agentes
 * 
 * Prueba los flujos completos de:
 * - Detección de handoff (@enzo, @adriana)
 * - Transición entre agentes
 * - Retorno a Aurora
 * - Manejo de errores
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';

// Mocks de dependencias
const mockEnviarWhatsApp = jest.fn();
const mockSaveProfile = jest.fn();
const mockSaveConversationMessage = jest.fn();
const mockSaveInteraction = jest.fn();
const mockComplete = jest.fn();

// Mock de AGENTES
const AGENTES = {
  ENZO: {
    nombre: 'Enzo',
    rol: 'Experto en Marketing e IA',
    mensajes: {
      entrada: '¡Hola! Soy Enzo, experto en marketing digital e inteligencia artificial. ¿En qué puedo ayudarte? 🚀',
      despedida: 'Fue un placer ayudarte. Si necesitas algo más de marketing o IA, aquí estaré. ¡Hasta pronto! 👋'
    }
  },
  ADRIANA: {
    nombre: 'Adriana',
    rol: 'Especialista en Seguros',
    mensajes: {
      entrada: 'Hola, soy Adriana. Te puedo asesorar sobre seguros de vida, auto, hogar y más. ¿Qué tipo de seguro te interesa? 🛡️',
      despedida: 'Gracias por consultar. Si tienes más preguntas sobre seguros, estaré encantada de ayudarte. ¡Cuídate! 💙'
    }
  },
  AURORA: {
    nombre: 'Aurora',
    rol: 'Recepcionista y Coordinadora'
  }
};

// Simular el flujo de handoff
async function simulateHandoff(userId, targetAgent, currentProfile) {
  try {
    console.log('[TEST] 🤝 Iniciando handoff hacia:', targetAgent);
    
    // 1. Generar mensaje de transición
    const handoffMessage = `Perfecto, te conecto con ${targetAgent === 'ENZO' ? 'Enzo' : 'Adriana'}. Un momento...`;
    
    // 2. Enviar mensaje de transición
    const handoffResult = await mockEnviarWhatsApp(userId, handoffMessage);
    if (!handoffResult.ok) {
      throw new Error(`Error enviando mensaje: ${handoffResult.error}`);
    }
    
    // 3. Guardar en historial
    await mockSaveConversationMessage(userId, {
      role: 'assistant',
      content: handoffMessage,
      agent: 'Aurora'
    });
    
    // 4. Esperar (simulado - 100ms en tests)
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // 5. Validar agente existe
    const nuevoAgente = AGENTES[targetAgent];
    if (!nuevoAgente) {
      throw new Error(`Agente ${targetAgent} no encontrado`);
    }
    
    // 6. Actualizar agente activo
    await mockSaveProfile(userId, {
      activeAgent: targetAgent
    });
    
    // 7. Enviar mensaje de entrada
    const mensajeEntrada = nuevoAgente.mensajes.entrada;
    const entradaResult = await mockEnviarWhatsApp(userId, mensajeEntrada);
    if (!entradaResult.ok) {
      throw new Error(`Error enviando entrada: ${entradaResult.error}`);
    }
    
    // 8. Guardar entrada en historial
    await mockSaveConversationMessage(userId, {
      role: 'assistant',
      content: mensajeEntrada,
      agent: nuevoAgente.nombre
    });
    
    // 9. Registrar handoff
    await mockSaveInteraction({
      userId,
      agent: targetAgent.toLowerCase(),
      agentName: nuevoAgente.nombre,
      intentReason: 'agent_handoff',
      meta: {
        handoff: true,
        fromAgent: 'Aurora',
        toAgent: targetAgent
      }
    });
    
    console.log('[TEST] ✅ Handoff completado');
    return { success: true, targetAgent };
    
  } catch (error) {
    console.error('[TEST] ❌ Error en handoff:', error);
    
    await mockEnviarWhatsApp(
      userId,
      'Disculpa, hubo un problema al conectarte con el especialista.'
    );
    
    await mockSaveInteraction({
      userId,
      agent: 'system',
      intentReason: 'handoff_error',
      meta: {
        error: error.message,
        targetAgent
      }
    });
    
    return { success: false, error: error.message };
  }
}

// Simular retorno a Aurora
async function simulateReturn(userId, currentProfile) {
  try {
    console.log('[TEST] 👋 Iniciando retorno a Aurora');
    
    const agenteAnterior = currentProfile.activeAgent;
    
    // Enviar despedida si hay agente anterior
    if (agenteAnterior && agenteAnterior !== 'AURORA') {
      const agenteObj = AGENTES[agenteAnterior];
      
      if (agenteObj?.mensajes?.despedida) {
        const despedidaResult = await mockEnviarWhatsApp(userId, agenteObj.mensajes.despedida);
        
        if (despedidaResult.ok) {
          await mockSaveConversationMessage(userId, {
            role: 'assistant',
            content: agenteObj.mensajes.despedida,
            agent: agenteObj.nombre
          });
          
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }
    }
    
    // Actualizar a Aurora
    await mockSaveProfile(userId, {
      activeAgent: 'AURORA'
    });
    
    // Aurora responde
    const auroraResponse = '¡Hola de nuevo! ¿En qué más puedo ayudarte?';
    await mockEnviarWhatsApp(userId, auroraResponse);
    
    console.log('[TEST] ✅ Retorno completado');
    return { success: true };
    
  } catch (error) {
    console.error('[TEST] ❌ Error en retorno:', error);
    return { success: false, error: error.message };
  }
}

describe('🤝 Sistema de Handoff entre Agentes', () => {
  const testUserId = '+593987770788';
  
  beforeEach(() => {
    // Reset mocks antes de cada test
    jest.clearAllMocks();
    
    // Configurar comportamiento por defecto de mocks
    mockEnviarWhatsApp.mockResolvedValue({ ok: true, data: {} });
    mockSaveProfile.mockResolvedValue(true);
    mockSaveConversationMessage.mockResolvedValue(true);
    mockSaveInteraction.mockResolvedValue(true);
  });
  
  describe('Handoff a Enzo', () => {
    test('debe completar handoff exitosamente cuando usuario escribe @enzo', async () => {
      const profile = {
        userId: testUserId,
        name: 'Diego Villota',
        activeAgent: 'AURORA'
      };
      
      const result = await simulateHandoff(testUserId, 'ENZO', profile);
      
      expect(result.success).toBe(true);
      expect(result.targetAgent).toBe('ENZO');
      
      // Verificar que enviarWhatsApp fue llamado 2 veces (transición + entrada)
      expect(mockEnviarWhatsApp).toHaveBeenCalledTimes(2);
      
      // Verificar mensaje de transición
      expect(mockEnviarWhatsApp).toHaveBeenNthCalledWith(
        1,
        testUserId,
        expect.stringContaining('Enzo')
      );
      
      // Verificar mensaje de entrada de Enzo
      expect(mockEnviarWhatsApp).toHaveBeenNthCalledWith(
        2,
        testUserId,
        expect.stringContaining('Soy Enzo')
      );
      
      // Verificar actualización de agente activo
      expect(mockSaveProfile).toHaveBeenCalledWith(
        testUserId,
        expect.objectContaining({ activeAgent: 'ENZO' })
      );
      
      // Verificar registro de handoff
      expect(mockSaveInteraction).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: testUserId,
          agent: 'enzo',
          intentReason: 'agent_handoff',
          meta: expect.objectContaining({
            handoff: true,
            toAgent: 'ENZO'
          })
        })
      );
    });
    
    it('debe guardar mensajes en historial durante handoff', async () => {
      const profile = { userId: testUserId, activeAgent: 'AURORA' };
      
      await simulateHandoff(testUserId, 'ENZO', profile);
      
      // Debe guardar 2 mensajes: transición + entrada
      expect(mockSaveConversationMessage).toHaveBeenCalledTimes(2);
      
      // Mensaje de transición
      expect(mockSaveConversationMessage).toHaveBeenNthCalledWith(
        1,
        testUserId,
        expect.objectContaining({
          role: 'assistant',
          agent: 'Aurora'
        })
      );
      
      // Mensaje de entrada de Enzo
      expect(mockSaveConversationMessage).toHaveBeenNthCalledWith(
        2,
        testUserId,
        expect.objectContaining({
          role: 'assistant',
          agent: 'Enzo'
        })
      );
    });
  });
  
  describe('Handoff a Adriana', () => {
    it('debe completar handoff exitosamente cuando usuario escribe @adriana', async () => {
      const profile = {
        userId: testUserId,
        activeAgent: 'AURORA'
      };
      
      const result = await simulateHandoff(testUserId, 'ADRIANA', profile);
      
      expect(result.success).toBe(true);
      expect(result.targetAgent).toBe('ADRIANA');
      
      // Verificar mensaje de entrada de Adriana
      expect(mockEnviarWhatsApp).toHaveBeenCalledWith(
        testUserId,
        expect.stringContaining('soy Adriana')
      );
      
      // Verificar actualización correcta
      expect(mockSaveProfile).toHaveBeenCalledWith(
        testUserId,
        expect.objectContaining({ activeAgent: 'ADRIANA' })
      );
    });
  });
  
  describe('Manejo de Errores', () => {
    it('debe manejar error si enviarWhatsApp falla en transición', async () => {
      mockEnviarWhatsApp.mockResolvedValueOnce({ ok: false, error: 'Network error' });
      
      const profile = { userId: testUserId, activeAgent: 'AURORA' };
      const result = await simulateHandoff(testUserId, 'ENZO', profile);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Error enviando mensaje');
      
      // Debe enviar mensaje de error al usuario
      expect(mockEnviarWhatsApp).toHaveBeenCalledWith(
        testUserId,
        expect.stringContaining('hubo un problema')
      );
      
      // Debe registrar el error
      expect(mockSaveInteraction).toHaveBeenCalledWith(
        expect.objectContaining({
          intentReason: 'handoff_error',
          meta: expect.objectContaining({
            error: expect.any(String)
          })
        })
      );
    });
    
    it('debe manejar error si agente destino no existe', async () => {
      const profile = { userId: testUserId, activeAgent: 'AURORA' };
      const result = await simulateHandoff(testUserId, 'INVALID_AGENT', profile);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('no encontrado');
      
      // Debe notificar al usuario
      expect(mockEnviarWhatsApp).toHaveBeenCalledWith(
        testUserId,
        expect.stringContaining('problema')
      );
    });
    
    it('debe manejar error si falla envío de mensaje de entrada', async () => {
      // Primer envío OK (transición), segundo falla (entrada)
      mockEnviarWhatsApp
        .mockResolvedValueOnce({ ok: true })
        .mockResolvedValueOnce({ ok: false, error: 'API error' });
      
      const profile = { userId: testUserId, activeAgent: 'AURORA' };
      const result = await simulateHandoff(testUserId, 'ENZO', profile);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Error enviando entrada');
    });
  });
  
  describe('Retorno a Aurora', () => {
    it('debe completar retorno exitosamente desde Enzo', async () => {
      const profile = {
        userId: testUserId,
        activeAgent: 'ENZO'
      };
      
      const result = await simulateReturn(testUserId, profile);
      
      expect(result.success).toBe(true);
      
      // Debe enviar despedida de Enzo
      expect(mockEnviarWhatsApp).toHaveBeenCalledWith(
        testUserId,
        expect.stringContaining('Fue un placer')
      );
      
      // Debe actualizar a Aurora
      expect(mockSaveProfile).toHaveBeenCalledWith(
        testUserId,
        expect.objectContaining({ activeAgent: 'AURORA' })
      );
      
      // Debe enviar respuesta de Aurora
      expect(mockEnviarWhatsApp).toHaveBeenCalledWith(
        testUserId,
        expect.stringContaining('Hola de nuevo')
      );
    });
    
    it('debe completar retorno exitosamente desde Adriana', async () => {
      const profile = {
        userId: testUserId,
        activeAgent: 'ADRIANA'
      };
      
      const result = await simulateReturn(testUserId, profile);
      
      expect(result.success).toBe(true);
      
      // Debe enviar despedida de Adriana
      expect(mockEnviarWhatsApp).toHaveBeenCalledWith(
        testUserId,
        expect.stringContaining('Gracias por consultar')
      );
    });
    
    it('debe funcionar si usuario ya está en Aurora', async () => {
      const profile = {
        userId: testUserId,
        activeAgent: 'AURORA'
      };
      
      const result = await simulateReturn(testUserId, profile);
      
      expect(result.success).toBe(true);
      
      // No debe enviar despedida (ya está en Aurora)
      expect(mockEnviarWhatsApp).toHaveBeenCalledTimes(1);
      
      // Solo debe enviar respuesta de Aurora
      expect(mockEnviarWhatsApp).toHaveBeenCalledWith(
        testUserId,
        expect.stringContaining('Hola de nuevo')
      );
    });
  });
  
  describe('Secuencias Completas', () => {
    it('debe manejar secuencia: Aurora → Enzo → Aurora', async () => {
      let profile = {
        userId: testUserId,
        activeAgent: 'AURORA'
      };
      
      // Paso 1: Handoff a Enzo
      const handoffResult = await simulateHandoff(testUserId, 'ENZO', profile);
      expect(handoffResult.success).toBe(true);
      
      // Simular cambio de agente
      profile.activeAgent = 'ENZO';
      
      // Paso 2: Retorno a Aurora
      const returnResult = await simulateReturn(testUserId, profile);
      expect(returnResult.success).toBe(true);
      
      // Verificar que se llamó saveProfile dos veces
      expect(mockSaveProfile).toHaveBeenCalledTimes(2);
      
      // Primera vez: actualizar a ENZO
      expect(mockSaveProfile).toHaveBeenNthCalledWith(
        1,
        testUserId,
        expect.objectContaining({ activeAgent: 'ENZO' })
      );
      
      // Segunda vez: actualizar a AURORA
      expect(mockSaveProfile).toHaveBeenNthCalledWith(
        2,
        testUserId,
        expect.objectContaining({ activeAgent: 'AURORA' })
      );
    });
    
    it('debe manejar múltiples handoffs consecutivos', async () => {
      let profile = { userId: testUserId, activeAgent: 'AURORA' };
      
      // Aurora → Enzo
      await simulateHandoff(testUserId, 'ENZO', profile);
      profile.activeAgent = 'ENZO';
      
      // Enzo → Aurora
      await simulateReturn(testUserId, profile);
      profile.activeAgent = 'AURORA';
      
      // Aurora → Adriana
      await simulateHandoff(testUserId, 'ADRIANA', profile);
      profile.activeAgent = 'ADRIANA';
      
      // Adriana → Aurora
      await simulateReturn(testUserId, profile);
      
      // Debe haber actualizado el perfil 4 veces
      expect(mockSaveProfile).toHaveBeenCalledTimes(4);
    });
  });
  
  describe('Validaciones de Datos', () => {
    it('debe incluir metadata correcta en handoff', async () => {
      const profile = { userId: testUserId, activeAgent: 'AURORA' };
      
      await simulateHandoff(testUserId, 'ENZO', profile);
      
      expect(mockSaveInteraction).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: testUserId,
          agent: 'enzo',
          agentName: 'Enzo',
          intentReason: 'agent_handoff',
          meta: expect.objectContaining({
            handoff: true,
            fromAgent: 'Aurora',
            toAgent: 'ENZO'
          })
        })
      );
    });
    
    it('debe incluir información de error en metadata cuando falla', async () => {
      mockEnviarWhatsApp.mockResolvedValueOnce({ ok: false, error: 'Test error' });
      
      const profile = { userId: testUserId, activeAgent: 'AURORA' };
      await simulateHandoff(testUserId, 'ENZO', profile);
      
      expect(mockSaveInteraction).toHaveBeenCalledWith(
        expect.objectContaining({
          intentReason: 'handoff_error',
          meta: expect.objectContaining({
            error: expect.stringContaining('Error'),
            targetAgent: 'ENZO'
          })
        })
      );
    });
  });
});

describe('Integración con AGENTES', () => {
  it('debe tener configuración correcta para Enzo', () => {
    expect(AGENTES.ENZO).toBeDefined();
    expect(AGENTES.ENZO.nombre).toBe('Enzo');
    expect(AGENTES.ENZO.mensajes.entrada).toBeTruthy();
    expect(AGENTES.ENZO.mensajes.despedida).toBeTruthy();
  });
  
  it('debe tener configuración correcta para Adriana', () => {
    expect(AGENTES.ADRIANA).toBeDefined();
    expect(AGENTES.ADRIANA.nombre).toBe('Adriana');
    expect(AGENTES.ADRIANA.mensajes.entrada).toBeTruthy();
    expect(AGENTES.ADRIANA.mensajes.despedida).toBeTruthy();
  });
  
  it('debe tener configuración correcta para Aurora', () => {
    expect(AGENTES.AURORA).toBeDefined();
    expect(AGENTES.AURORA.nombre).toBe('Aurora');
  });
});
