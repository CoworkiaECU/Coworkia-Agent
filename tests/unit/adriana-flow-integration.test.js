/**
 * 🛡️ Tests de integración — Flujo completo Adriana
 * Caso de referencia: Javier Troya — Hyundai Creta 2022, $16,000, VAZ Ensigna
 *
 * Ejecutar: node --experimental-vm-modules npx jest tests/unit/adriana-flow-integration --no-coverage
 */

import { calculateVehiclePremium } from '../../src/servicios/adriana-quote-calculator.js';
import { buildAdrianaComparisonV2HTML, buildEmailTemplate } from '../../src/servicios/email-template-system.js';

// ─── Demo data — caso Javier Troya (canónico) ────────────────────────────────

const JAVIER_TROYA_DEMO = {
  nombre: 'Javier Troya',
  marca: 'Hyundai', modelo: 'Creta', anio: 2022, placa: 'PBC-1234',
  valor_asegurado: '$16,000',
  vaz_prima_anual: '$830', vaz_prima_mensual: '$83', vaz_deducible: '7% (Taller VAZ)',
  analisis_broker: 'Javier, revisé las cotizaciones que me enviaste y VAZ Seguros tiene la tarifa más competitiva para tu Creta 2022. La diferencia clave frente a los competidores es el Amparo Patrimonial INCLUIDO en el plan Ensigna — sin costo adicional. Además, la asistencia vial 24/7 es ilimitada en grúa por accidente.',
  competitors: [
    {
      nombre: 'Seguros Sucre', plan: 'Plan Básico',
      prima_anual: '$1,285', prima_mensual: '$128',
      deducible: '10% (mín.$300)',
      asistencia: '<span class="badge-mid">⚠️ Básica</span>',
      amparo: '<span class="badge-no">❌ No incluido</span>',
    },
    {
      nombre: 'Seguros Unidos', plan: 'Vehículos',
      prima_anual: '$1,190', prima_mensual: '$119',
      deducible: '10% (mín.$250)',
      asistencia: '<span class="badge-no">❌ +$85/año</span>',
      amparo: '<span class="badge-no">❌ No incluido</span>',
    },
  ],
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('Adriana — Flujo completo Javier Troya', () => {

  test('✅ Caso Javier Troya: $16k → prima $830', () => {
    const r = calculateVehiclePremium({
      commercialValue: 16000,
      vehicleCategory: 'light',
      coverage: 'standard',
    });
    expect(r.success).toBe(true);
    expect(r.annual_total).toBe(830);
  });

  test('✅ buildAdrianaComparisonV2HTML genera HTML con ganador VAZ', () => {
    const html = buildAdrianaComparisonV2HTML(JAVIER_TROYA_DEMO);
    expect(html).toContain('VAZ Seguros');
    expect(html).toContain('badge-best');
    expect(html).toContain('Javier Troya');
    expect(html).toContain('$830');
  });

  test('✅ competitor rows aparecen en HTML cuando hay competidores', () => {
    const html = buildAdrianaComparisonV2HTML(JAVIER_TROYA_DEMO);
    expect(html).toContain('Seguros Sucre');
    expect(html).toContain('Seguros Unidos');
  });

  test('✅ competitor rows NO aparecen si competitors=[]', () => {
    const html = buildAdrianaComparisonV2HTML({ ...JAVIER_TROYA_DEMO, competitors: [] });
    expect(html).not.toContain('comp2-row');
    expect(html).not.toContain('Seguros Sucre');
  });

  test('✅ buildEmailTemplate ADRIANA_COMPARISON_V2 delega correctamente', () => {
    const html = buildEmailTemplate('ADRIANA', 'COMPARISON_V2', JAVIER_TROYA_DEMO);
    expect(html).toContain('VAZ Seguros');
    expect(html).toContain('badge-best');
    expect(html).toContain('$830');
  });

  test('✅ analisis_broker aparece en el HTML', () => {
    const html = buildAdrianaComparisonV2HTML(JAVIER_TROYA_DEMO);
    expect(html).toContain('Amparo Patrimonial INCLUIDO');
  });

  test('✅ HTML sin competitors no tiene tabla de competidores', () => {
    const html = buildAdrianaComparisonV2HTML({ ...JAVIER_TROYA_DEMO, competitors: [] });
    expect(html).not.toContain('Comparativa con la Competencia');
  });

  test('✅ HTML con competitors tiene tabla de competidores', () => {
    const html = buildAdrianaComparisonV2HTML(JAVIER_TROYA_DEMO);
    expect(html).toContain('Comparativa con la Competencia');
  });

  test('✅ CTA link apunta al número WA correcto', () => {
    const html = buildAdrianaComparisonV2HTML({ ...JAVIER_TROYA_DEMO, bot_phone: '593994837117' });
    expect(html).toContain('wa.me/593994837117');
  });

  test('✅ valor_asegurado $16,000 aparece en HTML', () => {
    const html = buildAdrianaComparisonV2HTML(JAVIER_TROYA_DEMO);
    expect(html).toContain('$16,000');
  });

});
