/**
 * 🧪 Tests del Agente AXEL - Especialista en Enderezada y Pintura
 * 
 * Prueba los flujos completos de:
 * - Handoff a Axel con @axel
 * - Análisis de imagen de vehículo dañado
 * - Generación de cotización con disclaimers
 * - Validación de calidad de imagen
 * - Detección de daños ocultos
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { detectarIntencion } from '../deteccion-intenciones/detectar-intencion.js';
import { AXEL } from '../deteccion-intenciones/axel.js';

describe('🚗 Agente AXEL - Tests Completos', () => {
  
  describe('1. Detección de Handoff @axel', () => {
    
    test('debe detectar @axel y activar handoff', () => {
      const mensajes = [
        '@axel',
        'hola @axel',
        'necesito @axel para cotizar',
        'Quiero hablar con @axel',
        '@AXEL ayuda'
      ];

      mensajes.forEach(msg => {
        const resultado = detectarIntencion(msg);
        
        expect(resultado.agent).toBe('AXEL');
        expect(resultado.reason).toBe('trigger @Axel');
        expect(resultado.flags.agentHandoff).toBe(true);
        expect(resultado.flags.targetAgent).toBe('AXEL');
      });
    });

    test('NO debe detectar axel sin @', () => {
      const mensajes = [
        'hola axel',
        'necesito axel',
        'axel ayuda',
        'pintura y enderezada'
      ];

      mensajes.forEach(msg => {
        const resultado = detectarIntencion(msg);
        
        // No debe ser AXEL (será AURORA por defecto)
        expect(resultado.agent).not.toBe('AXEL');
      });
    });

  });

  describe('2. Configuración del Agente', () => {
    
    test('debe tener estructura completa', () => {
      expect(AXEL.nombre).toBe('Axel');
      expect(AXEL.empresa).toBe('PaintBull');
      expect(AXEL.rol).toBe('Especialista en Enderezada y Pintura Automotriz');
      expect(AXEL.mensajes.entrada).toContain('PaintBull');
      expect(AXEL.mensajes.despedida).toBeTruthy();
    });

    test('debe tener tarifario referencial completo', () => {
      expect(AXEL.conocimiento.tarifarioReferencial).toBeDefined();
      expect(AXEL.conocimiento.tarifarioReferencial.pintura).toBeDefined();
      expect(AXEL.conocimiento.tarifarioReferencial.enderezada).toBeDefined();
      expect(AXEL.conocimiento.tarifarioReferencial.serviciosAdicionales).toBeDefined();
      
      // Verificar rangos de precio
      const pinturaMediana = AXEL.conocimiento.tarifarioReferencial.pintura.piezaMediana;
      expect(pinturaMediana.min).toBeDefined();
      expect(pinturaMediana.max).toBeDefined();
      expect(pinturaMediana.max).toBeGreaterThan(pinturaMediana.min);
    });

    test('debe tener disclaimers de protección legal', () => {
      expect(AXEL.disclaimers.cotizacionReferencial).toContain('referencial');
      expect(AXEL.disclaimers.imagenDefectuosa).toContain('calidad');
      expect(AXEL.disclaimers.dañosOcultos).toContain('ocultos');
      expect(AXEL.disclaimers.proteccionLegal).toContain('no vinculante');
    });

    test('debe tener protocolo de análisis visual', () => {
      expect(AXEL.conocimiento.protocoloAnalisisVisual).toBeDefined();
      expect(AXEL.conocimiento.protocoloAnalisisVisual.pasos).toHaveLength(8);
      expect(AXEL.conocimiento.protocoloAnalisisVisual.calidadImagenRequerida).toBeDefined();
      expect(AXEL.conocimiento.protocoloAnalisisVisual.señalesAlerta).toBeDefined();
    });

  });

  describe('3. System Prompt y Reglas', () => {
    
    test('debe generar system prompt en español', () => {
      const prompt = AXEL.getSystemPrompt('es');
      
      expect(prompt).toContain('Axel');
      expect(prompt).toContain('PaintBull');
      expect(prompt).toContain('15 años');
      expect(prompt).toContain('ANÁLISIS VISUAL ESTRICTO');
      expect(prompt).toContain('NUNCA VALORES CERRADOS');
      expect(prompt).toContain('referencial');
      expect(prompt).toContain('daños ocultos');
    });

    test('debe incluir reglas de protección legal', () => {
      const prompt = AXEL.getSystemPrompt('es');
      
      expect(prompt).toContain('no vinculante');
      expect(prompt).toContain('inspección física');
      expect(prompt).toContain('rangos de precio');
      expect(prompt).toContain('autorización');
    });

    test('debe incluir protocolo de análisis de imágenes', () => {
      const prompt = AXEL.getSystemPrompt('es');
      
      expect(prompt).toContain('VALIDAR CALIDAD DE IMAGEN');
      expect(prompt).toContain('ANÁLISIS VISUAL ESTRUCTURADO');
      expect(prompt).toContain('CLASIFICAR DAÑOS');
      expect(prompt).toContain('GENERAR COTIZACIÓN');
      expect(prompt).toContain('APLICAR DISCLAIMERS');
    });

    test('debe incluir señales de alerta', () => {
      const prompt = AXEL.getSystemPrompt('es');
      
      expect(prompt).toContain('SEÑALES DE ALERTA');
      expect(prompt).toContain('estructura');
      expect(prompt).toContain('chasis');
      expect(prompt).toContain('MÁXIMA cautela');
    });

  });

  describe('4. Validación de Tarifario', () => {
    
    test('todos los servicios deben tener rangos min-max', () => {
      const tarifario = AXEL.conocimiento.tarifarioReferencial;
      
      // Pintura
      Object.values(tarifario.pintura).forEach(servicio => {
        expect(servicio.min).toBeDefined();
        expect(servicio.max).toBeDefined();
        expect(servicio.descripcion).toBeDefined();
        expect(servicio.max).toBeGreaterThan(servicio.min);
      });
      
      // Enderezada
      Object.values(tarifario.enderezada).forEach(servicio => {
        expect(servicio.min).toBeDefined();
        expect(servicio.max).toBeDefined();
        expect(servicio.descripcion).toBeDefined();
        expect(servicio.max).toBeGreaterThan(servicio.min);
      });
      
      // Servicios adicionales
      Object.values(tarifario.serviciosAdicionales).forEach(servicio => {
        expect(servicio.min).toBeDefined();
        expect(servicio.max).toBeDefined();
        expect(servicio.descripcion).toBeDefined();
        expect(servicio.max).toBeGreaterThan(servicio.min);
      });
    });

    test('rangos de precio deben ser realistas', () => {
      const tarifario = AXEL.conocimiento.tarifarioReferencial;
      
      // Pintura pequeña debe ser más barata que grande
      expect(tarifario.pintura.piezaPequeña.min)
        .toBeLessThan(tarifario.pintura.piezaGrande.min);
      
      // Abolladura leve debe ser más barata que moderada
      expect(tarifario.enderezada.abolladuraLeve.max)
        .toBeLessThan(tarifario.enderezada.abolladoraModerada.max);
      
      // Vehículo completo debe ser más caro que piezas individuales
      expect(tarifario.pintura.vehiculoCompleto.min)
        .toBeGreaterThan(tarifario.pintura.piezaGrande.max);
    });

  });

  describe('5. Disclaimers y Protección Legal', () => {
    
    test('disclaimer de cotización referencial debe cubrir todos los riesgos', () => {
      const disclaimer = AXEL.disclaimers.cotizacionReferencial;
      
      expect(disclaimer).toContain('referencial');
      expect(disclaimer).toContain('NO incluye');
      expect(disclaimer).toContain('ocultos');
      expect(disclaimer).toContain('inspección física');
      expect(disclaimer).toContain('autorización');
    });

    test('disclaimer de imagen defectuosa debe especificar requisitos', () => {
      const disclaimer = AXEL.disclaimers.imagenDefectuosa;
      
      expect(disclaimer).toContain('iluminación');
      expect(disclaimer).toContain('ángulos');
      expect(disclaimer).toContain('distancia');
      expect(disclaimer).toContain('enfoque');
    });

    test('disclaimer de daños ocultos debe listar riesgos', () => {
      const disclaimer = AXEL.disclaimers.dañosOcultos;
      
      expect(disclaimer).toContain('estructura');
      expect(disclaimer).toContain('eléctricos');
      expect(disclaimer).toContain('chasis');
      expect(disclaimer).toContain('soldaduras');
      expect(disclaimer).toContain('NO son confirmables');
    });

    test('disclaimer de protección legal debe ser completo', () => {
      const disclaimer = AXEL.disclaimers.proteccionLegal;
      
      expect(disclaimer).toContain('no vinculante');
      expect(disclaimer).toContain('sujeto a inspección');
      expect(disclaimer).toContain('variaciones');
      expect(disclaimer).toContain('autorización previa');
      expect(disclaimer).toContain('garantía');
      expect(disclaimer).toContain('6 meses');
    });

  });

  describe('6. Ejemplos de Respuestas', () => {
    
    test('debe tener ejemplo de bienvenida', () => {
      expect(AXEL.ejemplos.bienvenida).toContain('Axel');
      expect(AXEL.ejemplos.bienvenida).toContain('PaintBull');
      expect(AXEL.ejemplos.bienvenida).toContain('15 años');
      expect(AXEL.ejemplos.bienvenida).toContain('fotos');
    });

    test('debe tener ejemplo de solicitud de fotos', () => {
      expect(AXEL.ejemplos.solicitudFotos).toContain('fotos');
      expect(AXEL.ejemplos.solicitudFotos).toContain('ángulos');
      expect(AXEL.ejemplos.solicitudFotos).toContain('luz');
    });

    test('debe tener ejemplo de análisis con cotización', () => {
      const ejemplo = AXEL.ejemplos.analisisConDaños;
      
      expect(ejemplo).toContain('ANÁLISIS');
      expect(ejemplo).toContain('visible');
      expect(ejemplo).toContain('ocultos');
      expect(ejemplo).toContain('ESTIMACIÓN');
      expect(ejemplo).toContain('$');
      expect(ejemplo).toContain('referencial');
    });

    test('debe tener ejemplo de foto defectuosa', () => {
      expect(AXEL.ejemplos.fotoDefectuosa).toContain('foto');
      expect(AXEL.ejemplos.fotoDefectuosa).toContain('luz');
      expect(AXEL.ejemplos.fotoDefectuosa).toContain('distancia');
    });

    test('debe tener ejemplo de daño complejo con rango amplio', () => {
      const ejemplo = AXEL.ejemplos.dañoComplejo;
      
      expect(ejemplo).toContain('estructura');
      expect(ejemplo).toContain('Estimación');
      expect(ejemplo).toContain('$');
      expect(ejemplo).toContain('rango es amplio');
      expect(ejemplo).toContain('inspección física');
    });

  });

  describe('7. Integración con Sistema', () => {
    
    test('debe estar registrado en AGENTES', async () => {
      const { AGENTES } = await import('../deteccion-intenciones/orquestador.js');
      
      expect(AGENTES.AXEL).toBeDefined();
      expect(AGENTES.AXEL.nombre).toBe('Axel');
      expect(AGENTES.AXEL.empresa).toBe('PaintBull');
    });

    test('debe tener getSystemPrompt funcional', () => {
      expect(typeof AXEL.getSystemPrompt).toBe('function');
      
      const promptEs = AXEL.getSystemPrompt('es');
      const promptEn = AXEL.getSystemPrompt('en');
      
      expect(promptEs).toBeTruthy();
      expect(promptEn).toBeTruthy();
      expect(promptEs).toContain('español');
      expect(promptEn).toContain('English');
    });

  });

  describe('8. Casos de Uso Específicos', () => {
    
    test('cotización debe incluir siempre rangos', () => {
      const prompt = AXEL.getSystemPrompt('es');
      
      // Debe prohibir valores cerrados
      expect(prompt).toContain('NUNCA entregues valores cerrados');
      expect(prompt).toContain('rangos de precio');
      expect(prompt).toContain('$X - $Y');
    });

    test('debe solicitar nuevas fotos si la calidad es mala', () => {
      const prompt = AXEL.getSystemPrompt('es');
      
      expect(prompt).toContain('borrosa');
      expect(prompt).toContain('oscura');
      expect(prompt).toContain('solicita nuevas fotos');
    });

    test('debe mencionar daños ocultos en casos estructurales', () => {
      const prompt = AXEL.getSystemPrompt('es');
      
      expect(prompt).toContain('daños ocultos');
      expect(prompt).toContain('estructura');
      expect(prompt).toContain('NO confirmables');
    });

    test('debe ofrecer siguiente paso lógico', () => {
      const prompt = AXEL.getSystemPrompt('es');
      
      expect(prompt).toContain('siguiente paso');
      expect(prompt).toContain('Inspección física');
      expect(prompt).toContain('agend');
    });

  });

  describe('9. Protecciones Anti-conflicto', () => {
    
    test('debe declarar límites de responsabilidad', () => {
      const prompt = AXEL.getSystemPrompt('es');
      
      expect(prompt).toContain('NUNCA actúes como aseguradora');
      expect(prompt).toContain('NUNCA actúes como perito legal');
      expect(prompt).toContain('asesor técnico de primer contacto');
    });

    test('debe priorizar transparencia sobre venta', () => {
      const prompt = AXEL.getSystemPrompt('es');
      
      expect(prompt).toContain('NO es vender a toda costa');
      expect(prompt).toContain('generar confianza');
      expect(prompt).toContain('transparencia');
      expect(prompt).toContain('relación a largo plazo');
    });

    test('debe incluir autorización previa para trabajos adicionales', () => {
      const prompt = AXEL.getSystemPrompt('es');
      
      expect(prompt).toContain('autorización');
      expect(prompt).toContain('ANTES de continuar');
      expect(prompt).toContain('trabajos adicionales');
    });

  });

  describe('10. Factores de Costo Adicionales', () => {
    
    test('debe listar factores que aumentan precio', () => {
      const factores = AXEL.conocimiento.tarifarioReferencial.factoresAdicionales;
      
      expect(factores).toContain('Color metalizado o perlado (+15-25%)');
      expect(factores).toContain('Vehículo de lujo o importado (+20-40%)');
      expect(factores).toContain('Daños en estructura o chasis (+40-100%)');
      expect(factores.length).toBeGreaterThan(3);
    });

  });

});

describe('🔧 Simulación de Flujo Completo', () => {
  
  test('Flujo: Usuario activa @axel → recibe bienvenida → envía foto', () => {
    // 1. Detectar handoff
    const handoff = detectarIntencion('@axel necesito cotización');
    expect(handoff.agent).toBe('AXEL');
    expect(handoff.flags.agentHandoff).toBe(true);
    
    // 2. Mensaje de bienvenida
    expect(AXEL.mensajes.entrada).toContain('Axel');
    expect(AXEL.mensajes.entrada).toContain('PaintBull');
    
    // 3. Sistema debe tener protocolo para análisis de fotos
    expect(AXEL.conocimiento.protocoloAnalisisVisual).toBeDefined();
    expect(AXEL.disclaimers.cotizacionReferencial).toBeDefined();
  });

  test('Flujo: Foto mala calidad → disclaimer → solicitud nuevas fotos', () => {
    const disclaimer = AXEL.disclaimers.imagenDefectuosa;
    
    expect(disclaimer).toContain('CALIDAD DE IMAGEN INSUFICIENTE');
    expect(disclaimer).toContain('iluminación');
    expect(disclaimer).toContain('nuevas fotos');
  });

  test('Flujo: Foto buena → análisis → cotización con rangos → siguiente paso', () => {
    const prompt = AXEL.getSystemPrompt('es');
    
    // Debe seguir los 5 pasos
    expect(prompt).toContain('PASO 1: VALIDAR CALIDAD');
    expect(prompt).toContain('PASO 2: ANÁLISIS VISUAL ESTRUCTURADO');
    expect(prompt).toContain('PASO 3: CLASIFICAR DAÑOS');
    expect(prompt).toContain('PASO 4: GENERAR COTIZACIÓN');
    expect(prompt).toContain('PASO 5: APLICAR DISCLAIMERS');
  });

});
