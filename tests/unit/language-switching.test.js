/**
 * 🌍 Tests: Cambio Rápido de Idiomas
 * Verifica que el sistema NO crashee cuando usuarios cambian constantemente de idioma
 */

import { describe, test, expect } from '@jest/globals';
import { getUserLanguage, detectLanguage } from '../../src/utils/language-detector.js';

describe('🌍 Cambio Rápido de Idiomas', () => {
  
  describe('Detección con cambios erráticos', () => {
    test('mensajes cortos ambiguos NO deben cambiar idioma frecuentemente', () => {
      // Simular usuario hablando español
      const msg1 = getUserLanguage('Hola', 'es');
      expect(msg1.language).toBe('es');
      
      // Mensaje ambiguo "ok" no debe cambiar a inglés
      const msg2 = getUserLanguage('ok', 'es');
      expect(msg2.language).toBe('es'); // Debe mantener español por preferencia
      expect(msg2.source).toBe('user_preference');
    });

    test('mensajes muy cortos deben respetar idioma preferido', () => {
      const mensajesCortos = ['si', 'no', 'ok', 'ya', 'ah', 'mm'];
      
      for (const msg of mensajesCortos) {
        const result = getUserLanguage(msg, 'en');
        expect(result.language).toBe('en');
        expect(result.source).toBe('user_preference');
      }
    });

    test('cambio legítimo de idioma requiere confianza > 0.7', () => {
      // Usuario en español
      const preferred = 'es';
      
      // Mensaje claramente en inglés
      const msg = getUserLanguage('Hello, I need help with my reservation', preferred);
      
      // Debe detectar inglés con alta confianza
      expect(msg.language).toBe('en');
      expect(msg.confidence).toBeGreaterThan(0.7);
    });

    test('mensajes mixtos deben mantener idioma preferido', () => {
      // Usuario escribiendo español con palabras en inglés
      const msg = getUserLanguage('Hola, quiero un hot desk', 'es');
      
      // Debe detectar español (palabras técnicas no cuentan)
      expect(msg.language).toBe('es');
    });
  });

  describe('Secuencia de cambios rápidos', () => {
    test('cambiar entre idiomas cada mensaje NO debe crashear', () => {
      const secuencia = [
        { text: 'Hola buenos días', expected: 'es' },
        { text: 'Hello good morning', expected: 'en' },
        { text: 'Bonjour', expected: 'fr' },
        { text: 'Ciao', expected: 'it' },
        { text: 'Olá', expected: 'pt' },
        { text: 'Hola de nuevo', expected: 'es' }
      ];

      let preferredLang = 'es';
      
      for (const { text, expected } of secuencia) {
        const result = getUserLanguage(text, preferredLang);
        
        // No debe crashear
        expect(result).toBeDefined();
        expect(result.language).toBeDefined();
        
        // Si la confianza es alta, actualizar preferido
        if (result.confidence > 0.7) {
          preferredLang = result.language;
        }
      }
    });

    test('10 cambios de idioma seguidos deben funcionar', () => {
      const idiomas = ['es', 'en', 'fr', 'it', 'pt', 'es', 'en', 'fr', 'it', 'pt'];
      const mensajes = [
        'Hola',
        'Hello',
        'Bonjour',
        'Ciao',
        'Olá',
        'Buenos días',
        'Good morning',
        'Bon matin',
        'Buongiorno',
        'Bom dia'
      ];

      let preferredLang = 'es';
      
      for (let i = 0; i < mensajes.length; i++) {
        expect(() => {
          const result = getUserLanguage(mensajes[i], preferredLang);
          if (result.confidence > 0.7) {
            preferredLang = result.language;
          }
        }).not.toThrow();
      }
    });
  });

  describe('Edge cases problemáticos', () => {
    test('string vacío no debe crashear', () => {
      expect(() => getUserLanguage('', 'es')).not.toThrow();
      const result = getUserLanguage('', 'es');
      expect(result.language).toBe('es'); // Debe usar preferido
    });

    test('solo emojis no debe crashear', () => {
      expect(() => getUserLanguage('😊👍🎉', 'es')).not.toThrow();
      const result = getUserLanguage('😊👍🎉', 'es');
      expect(result.language).toBe('es');
    });

    test('solo números no debe crashear', () => {
      expect(() => getUserLanguage('123456', 'es')).not.toThrow();
      const result = getUserLanguage('123456', 'es');
      expect(result.language).toBe('es');
    });

    test('solo puntuación no debe crashear', () => {
      expect(() => getUserLanguage('...!!!???', 'es')).not.toThrow();
      const result = getUserLanguage('...!!!???', 'es');
      expect(result.language).toBe('es');
    });

    test('mensaje en idioma no soportado debe usar fallback', () => {
      // Mensaje en chino (no soportado)
      const result = getUserLanguage('你好', 'es');
      expect(result.language).toBe('es'); // Debe usar preferido como fallback
    });

    test('null o undefined no debe crashear', () => {
      expect(() => getUserLanguage(null, 'es')).not.toThrow();
      expect(() => getUserLanguage(undefined, 'es')).not.toThrow();
    });
  });

  describe('Umbral de confianza', () => {
    test('confianza baja (<0.3) debe mantener idioma preferido', () => {
      // Mensaje muy ambiguo
      const result = getUserLanguage('ok', 'es');
      
      // Debe mantener español
      expect(result.language).toBe('es');
      expect(result.source).toBe('user_preference');
    });

    test('confianza media (0.3-0.7) debe mantener idioma preferido', () => {
      // Mensaje con palabras en inglés pero estructura española
      const result = getUserLanguage('dame info', 'es');
      
      // Debe mantener español
      expect(result.language).toBe('es');
    });

    test('confianza alta (>0.7) debe cambiar idioma', () => {
      const result = getUserLanguage('I need a coworking space for tomorrow', 'es');
      
      // Debe cambiar a inglés
      expect(result.language).toBe('en');
      expect(result.confidence).toBeGreaterThan(0.7);
    });
  });

  describe('Comandos explícitos', () => {
    test('/spanish debe cambiar a español inmediatamente', () => {
      const result = getUserLanguage('/spanish', 'en');
      expect(result.language).toBe('es');
      expect(result.confidence).toBe(1.0);
      expect(result.source).toBe('explicit_command');
    });

    test('/english debe cambiar a inglés inmediatamente', () => {
      const result = getUserLanguage('/english', 'es');
      expect(result.language).toBe('en');
      expect(result.confidence).toBe(1.0);
    });

    test('comando con mensaje debe priorizar comando', () => {
      const result = getUserLanguage('/french Bonjour', 'es');
      expect(result.language).toBe('fr');
      expect(result.source).toBe('explicit_command');
    });
  });
});
