import { describe, expect, test } from '@jest/globals';

import { detectarIntencion } from '../../src/deteccion-intenciones/detectar-intencion.js';
import { conocimientoEnzo } from '../../src/deteccion-intenciones/enzo-knowledge.js';
import { ENZO } from '../../src/deteccion-intenciones/enzo.js';
import { HOURS, MEMBERSHIP_PLANS } from '../../src/utils/coworkia-facts.js';

describe('Lote 2 Enzo routing y pricing', () => {
  test('una intención explícita de marketing enruta hacia Enzo', () => {
    const result = detectarIntencion('@enzo necesito automatizar marketing y leads');

    expect(result.agent).toBe('ENZO');
    expect(result.flags.agentHandoff).toBe(true);
    expect(result.flags.targetAgent).toBe('ENZO');
  });

  test('el guard anti-hijack conserva un especialista activo ante promo ambigua de agente virtual', () => {
    const promo = 'Quiero un agente virtual como Aurora para mi empresa';

    const fromAurora = detectarIntencion(promo, 'AURORA');
    expect(fromAurora.flags.virtualAgentSalesPromo).toBe(true);

    const fromEnzo = detectarIntencion(promo, 'ENZO');
    expect(fromEnzo.agent).toBe('ENZO');
    expect(fromEnzo.flags.maintainingActive).toBe(true);
    expect(fromEnzo.flags.requiresExplicitMention).toBe(true);
    expect(fromEnzo.flags.virtualAgentSalesPromo).toBeUndefined();

    const fromAdriana = detectarIntencion(promo, 'ADRIANA');
    expect(fromAdriana.agent).toBe('ADRIANA');
    expect(fromAdriana.flags.requiresExplicitMention).toBe(true);
  });

  test('mensajes ambiguos no activan Enzo sin mención explícita', () => {
    const result = detectarIntencion('ok, me interesa saber más', 'AURORA');

    expect(result.agent).toBe('AURORA');
    expect(result.flags.agentHandoff).toBeFalsy();
  });

  test('los precios de coworking expuestos por Enzo salen de coworkia-facts', () => {
    const planes = conocimientoEnzo.ecosistemaCoworkia.ALUNA.modeloNegocio.planesQueVende;

    expect(planes.plan10).toContain(MEMBERSHIP_PLANS.plan10.priceDisplay);
    expect(planes.plan20).toContain(MEMBERSHIP_PLANS.plan20.priceDisplay);
    expect(planes.oficinaVirtual).toContain(MEMBERSHIP_PLANS.oficinavirtual.priceDisplay);
    expect(planes.salaReuniones).toContain(MEMBERSHIP_PLANS.salareuniones.priceDisplay);
    expect(planes.plan10).toContain(HOURS.display);

    const rendered = JSON.stringify(planes);
    expect(rendered).not.toMatch(/\$265|\$39|8:00am|8:00 AM|8:00am-7pm/);
    expect(rendered).not.toMatch(/undefined|null|\[object Object\]/);
  });

  test('la regla de precio de Enzo evita repreguntar indefinidamente', () => {
    const prompt = ENZO.getSystemPrompt('es', 2);

    expect(prompt).toContain('REGLA ANTI-BUCLE DE PRECIO');
    expect(prompt).toContain('NO repreguntes');
    expect(prompt).toContain('CTA');
  });
});
