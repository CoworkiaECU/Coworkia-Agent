// tests/unit/multilanguage.test.js
// Test del sistema multiidioma para todos los agentes

import { AURORA } from '../../src/deteccion-intenciones/aurora.js';
import { ALUNA } from '../../src/deteccion-intenciones/aluna.js';
import { ENZO } from '../../src/deteccion-intenciones/enzo.js';
import { ADRIANA } from '../../src/deteccion-intenciones/adriana.js';
import { ANGELA } from '../../src/deteccion-intenciones/angela.js';
import { AXEL } from '../../src/deteccion-intenciones/axel.js';
import { GABI } from '../../src/deteccion-intenciones/gabi.js';
import { PAULA } from '../../src/deteccion-intenciones/paula.js';
import { detectLanguage } from '../../src/utils/language-detector.js';

describe('🌍 SISTEMA MULTIIDIOMA', () => {
  
  describe('Detección de idioma', () => {
    test('✅ Debe detectar español', () => {
      const result = detectLanguage('Hola, quiero reservar una sala de reuniones para mañana');
      expect(result.language).toBe('es');
      expect(result.confidence).toBeGreaterThanOrEqual(0.5);
    });

    test('✅ Debe detectar inglés', () => {
      const result = detectLanguage('Hello Coworkia! I want to try the service');
      expect(result.language).toBe('en');
      expect(result.confidence).toBeGreaterThanOrEqual(0.3);
    });

    test('✅ Debe detectar francés', () => {
      const result = detectLanguage('Bonjour, je voudrais réserver une salle de réunion');
      expect(result.language).toBe('fr');
      expect(result.confidence).toBeGreaterThanOrEqual(0.3);
    });

    test('✅ Debe detectar italiano', () => {
      const result = detectLanguage('Ciao, vorrei prenotare una sala riunioni');
      expect(result.language).toBe('it');
      expect(result.confidence).toBeGreaterThanOrEqual(0.2);
    });

    test('✅ Debe detectar portugués', () => {
      const result = detectLanguage('Olá, quero reservar uma sala de reunião');
      expect(result.language).toBe('pt');
      expect(result.confidence).toBeGreaterThanOrEqual(0.5);
    });
  });

  describe('getSystemPrompt - Firma estandarizada', () => {
    const agentes = [
      { nombre: 'AURORA', agente: AURORA },
      { nombre: 'ALUNA', agente: ALUNA },
      { nombre: 'ENZO', agente: ENZO },
      { nombre: 'ADRIANA', agente: ADRIANA },
      { nombre: 'ANGELA', agente: ANGELA },
      { nombre: 'AXEL', agente: AXEL },
      { nombre: 'GABI', agente: GABI },
      { nombre: 'PAULA', agente: PAULA }
    ];

    agentes.forEach(({ nombre, agente }) => {
      test(`✅ ${nombre} debe tener getSystemPrompt con firma correcta`, () => {
        expect(typeof agente.getSystemPrompt).toBe('function');
        
        // Probar con todos los parámetros
        const prompt = agente.getSystemPrompt(false, 'es', 0);
        expect(typeof prompt).toBe('string');
        expect(prompt.length).toBeGreaterThan(100);
      });
    });
  });

  describe('getSystemPrompt - Idioma español', () => {
    const agentes = [
      { nombre: 'AURORA', agente: AURORA },
      { nombre: 'ALUNA', agente: ALUNA },
      { nombre: 'ENZO', agente: ENZO },
      { nombre: 'ADRIANA', agente: ADRIANA },
      { nombre: 'ANGELA', agente: ANGELA },
      { nombre: 'AXEL', agente: AXEL },
      { nombre: 'GABI', agente: GABI },
      { nombre: 'PAULA', agente: PAULA }
    ];

    agentes.forEach(({ nombre, agente }) => {
      test(`✅ ${nombre} debe incluir instrucciones en español`, () => {
        const prompt = agente.getSystemPrompt(false, 'es', 0);
        
        // Verificar que el prompt incluye la instrucción de idioma
        expect(prompt).toMatch(/español/i);
        expect(prompt).toMatch(/IDIOMA/i);
      });
    });
  });

  describe('getSystemPrompt - Idioma inglés', () => {
    const agentes = [
      { nombre: 'AURORA', agente: AURORA },
      { nombre: 'ALUNA', agente: ALUNA },
      { nombre: 'ENZO', agente: ENZO },
      { nombre: 'ADRIANA', agente: ADRIANA },
      { nombre: 'ANGELA', agente: ANGELA },
      { nombre: 'AXEL', agente: AXEL },
      { nombre: 'GABI', agente: GABI },
      { nombre: 'PAULA', agente: PAULA }
    ];

    agentes.forEach(({ nombre, agente }) => {
      test(`✅ ${nombre} debe incluir instrucciones en inglés`, () => {
        const prompt = agente.getSystemPrompt(false, 'en', 5);
        
        // Verificar que el prompt incluye "English"
        expect(prompt).toMatch(/English/);
      });
    });
  });

  describe('getMensajes - Aurora multiidioma', () => {
    test('✅ Aurora debe generar mensaje de entrada en español', () => {
      const mensajes = AURORA.getMensajes('es');
      expect(mensajes.entrada).toContain('Hola');
      expect(mensajes.entrada).toContain('Aurora');
    });

    test('✅ Aurora debe generar mensaje de entrada en inglés', () => {
      const mensajes = AURORA.getMensajes('en');
      expect(mensajes.entrada).toContain('Hello');
      expect(mensajes.entrada).toContain('Aurora');
    });

    test('✅ Aurora debe generar mensaje de entrada en francés', () => {
      const mensajes = AURORA.getMensajes('fr');
      expect(mensajes.entrada).toContain('Bonjour');
      expect(mensajes.entrada).toContain('Aurora');
    });

    test('✅ Aurora debe generar mensaje de entrada en italiano', () => {
      const mensajes = AURORA.getMensajes('it');
      expect(mensajes.entrada).toContain('Ciao');
      expect(mensajes.entrada).toContain('Aurora');
    });

    test('✅ Aurora debe generar mensaje de entrada en portugués', () => {
      const mensajes = AURORA.getMensajes('pt');
      expect(mensajes.entrada).toContain('Olá');
      expect(mensajes.entrada).toContain('Aurora');
    });
  });

  describe('Contexto de conversación', () => {
    test('✅ Aurora debe adaptar prompt según conversationCount', () => {
      const promptPrimeraVez = AURORA.getSystemPrompt(false, 'es', 1);
      const promptContinuacion = AURORA.getSystemPrompt(false, 'es', 5);
      
      // Ambos deben incluir las reglas de contexto
      expect(promptPrimeraVez).toContain('conversationCount');
      expect(promptContinuacion).toContain('conversationCount');
      
      // El número debe ser diferente
      expect(promptPrimeraVez).toContain('MENSAJES PREVIOS EN ESTA CONVERSACIÓN: 1');
      expect(promptContinuacion).toContain('MENSAJES PREVIOS EN ESTA CONVERSACIÓN: 5');
    });

    test('✅ Aluna debe adaptar prompt según conversationCount', () => {
      const promptPrimeraVez = ALUNA.getSystemPrompt(false, 'es', 1);
      const promptContinuacion = ALUNA.getSystemPrompt(false, 'es', 8);
      
      expect(promptPrimeraVez).toContain('MENSAJES PREVIOS EN ESTA CONVERSACIÓN: 1');
      expect(promptContinuacion).toContain('MENSAJES PREVIOS EN ESTA CONVERSACIÓN: 8');
    });
  });

  describe('freeTrialUsed - Aurora', () => {
    test('✅ Aurora debe incluir primera visita GRATIS cuando freeTrialUsed=false', () => {
      const prompt = AURORA.getSystemPrompt(false, 'es', 0);
      expect(prompt).toContain('Primera visita GRATIS');
    });

    test('✅ Aurora NO debe incluir primera visita GRATIS cuando freeTrialUsed=true', () => {
      const prompt = AURORA.getSystemPrompt(true, 'es', 0);
      expect(prompt).not.toContain('Primera visita GRATIS');
    });
  });
});
