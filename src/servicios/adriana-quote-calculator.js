/**
 * 🧮 Adriana Quote Calculator — SegPopular
 * Calculadora de primas vehiculares con tasas VAZ
 *
 * USO:
 *   const result = calculateVehiclePremium({
 *     commercialValue: 28000,
 *     vehicleYear: 2019,
 *     vehicleCategory: VEHICLE_CATEGORIES.LIGHT,
 *     coverage: COVERAGE_TYPES.STANDARD,
 *     insurer: 'VAZ'   // extensible
 *   });
 *
 * @author Adriana — SegPopular S.A.
 */

import {
  VAZ_RATES,
  COVERAGE_TYPES,
  VEHICLE_CATEGORIES,
  FIXED_COSTS,
  COVERAGE_LABELS,
  DEDUCTIBLES_VAZ,
} from './insurance-rates-vaz.js';

// Mapa de aseguradoras disponibles (extensible)
// VAZ_RATES = VAZ_RATES_SIERRA_NORTE (backward-compat alias)
// Estructura: { light: [{min_value, max_value, rate, ...}], pickup: [...], electric: [...] }
const INSURER_RATES = {
  VAZ: VAZ_RATES,
};

// Ajuste de tasa por opción de cobertura:
// BASIC/STANDARD → Taller Designado (deducible 7%) → sin recargo
// PREMIUM        → Libre Designación (deducible 10%) → +5% sobre prima base
const COVERAGE_RATE_MULTIPLIER = {
  [COVERAGE_TYPES.BASIC]:    1.00,
  [COVERAGE_TYPES.STANDARD]: 1.00,
  [COVERAGE_TYPES.PREMIUM]:  1.05,
};

// ─────────────────────────────────────────────────────────────
// FUNCIÓN PRINCIPAL
// ─────────────────────────────────────────────────────────────

/**
 * Calcula la prima completa de un seguro vehicular
 *
 * @param {object} params
 * @param {number} params.commercialValue — Valor comercial del vehículo USD
 * @param {number} params.vehicleYear     — Año del modelo (ej: 2019)
 * @param {string} params.vehicleCategory — VEHICLE_CATEGORIES.*
 * @param {string} params.coverage        — COVERAGE_TYPES.*
 * @param {string} [params.insurer]       — 'VAZ' (default)
 * @returns {object} Resultado con prima, deducible, desglose
 */
export function calculateVehiclePremium({
  commercialValue,
  vehicleYear,
  vehicleCategory = VEHICLE_CATEGORIES.LIGHT,
  coverage = COVERAGE_TYPES.STANDARD,
  insurer = 'VAZ'
}) {
  const rates = INSURER_RATES[insurer];
  if (!rates) {
    return { success: false, error: `Aseguradora no disponible: ${insurer}` };
  }

  // rates[vehicleCategory] es un array de tramos por valor asegurado
  const categoryBrackets = rates[vehicleCategory];
  if (!categoryBrackets || !Array.isArray(categoryBrackets)) {
    return { success: false, error: `Categoría no disponible: ${vehicleCategory}` };
  }

  // Validar cobertura
  if (!COVERAGE_RATE_MULTIPLIER.hasOwnProperty(coverage)) {
    return { success: false, error: `Cobertura ${coverage} no reconocida` };
  }

  // Encontrar tramo por valor comercial
  const bracket = categoryBrackets.find(
    b => commercialValue >= b.min_value && commercialValue <= b.max_value
  );
  if (!bracket) {
    return { success: false, error: `Valor comercial $${commercialValue} fuera de rango para ${vehicleCategory}` };
  }

  // Tasa base + multiplicador según opción de cobertura
  const baseRate = bracket.rate * COVERAGE_RATE_MULTIPLIER[coverage];

  // Seleccionar opción de deducible según coverage
  const deductibleOpt = coverage === COVERAGE_TYPES.PREMIUM
    ? DEDUCTIBLES_VAZ.LIBRE_DESIGNACION
    : DEDUCTIBLES_VAZ.TALLER_DESIGNADO;

  const deductibleDescription =
    `${deductibleOpt.label}: ${(deductibleOpt.partial_loss_pct * 100)}% del daño (mín $${deductibleOpt.partial_loss_min_abs})`;

  // ─── Cálculo ─────────────────────────────────────────────
  const basePremium = commercialValue * baseRate;
  const iva = basePremium * FIXED_COSTS.iva_rate;
  const fees = FIXED_COSTS.emission_fee + FIXED_COSTS.super_fee + FIXED_COSTS.administrative;

  const annualTotal = Math.round(basePremium + iva + fees);
  const monthlyInstallment = Math.round(annualTotal / 12); // hasta 12 cuotas (Ecuador)

  // vehicleAge sigue calculándose para datos informativos
  const currentYear = new Date().getFullYear();
  const vehicleAge = vehicleYear ? currentYear - vehicleYear : null;

  return {
    success: true,
    insurer,
    insurer_full: rates.insurer_full || insurer,
    coverage,
    coverageLabel: COVERAGE_LABELS[coverage]?.name || coverage,
    vehicleAge,
    rate: (baseRate * 100).toFixed(2) + '%',
    rate_bracket: bracket.label,

    breakdown: {
      commercial_value: commercialValue,
      base_premium: Math.round(basePremium),
      iva: Math.round(iva),
      fees: Math.round(fees),
    },

    annual_total: annualTotal,
    monthly_installment: monthlyInstallment,

    deductible: deductibleDescription,
    deductible_option: deductibleOpt.label,
    includes: COVERAGE_LABELS[coverage]?.includes || [],
    excludes: COVERAGE_LABELS[coverage]?.excludes || [],

    liability_limits: {
      rc:      bracket.rc_limit,
      medical: bracket.med_limit,
      death:   bracket.death_limit,
    },
  };
}

// ─────────────────────────────────────────────────────────────
// COTIZACIÓN COMPLETA (las 3 coberturas para comparar)
// ─────────────────────────────────────────────────────────────

/**
 * Genera las 3 opciones de cobertura para un vehículo
 * Ideal para el email comparativo de Adriana
 */
export function calculateAllCoverages({
  commercialValue,
  vehicleYear,
  vehicleCategory = VEHICLE_CATEGORIES.LIGHT,
  insurer = 'VAZ'
}) {
  const options = {};

  for (const cov of Object.values(COVERAGE_TYPES)) {
    const result = calculateVehiclePremium({
      commercialValue,
      vehicleYear,
      vehicleCategory,
      coverage: cov,
      insurer
    });
    options[cov] = result;
  }

  return {
    vehicle: { commercialValue, vehicleYear, vehicleCategory, insurer },
    options
  };
}

// ─────────────────────────────────────────────────────────────
// HELPERS: DETECCIÓN DE CATEGORÍA DESDE TEXTO
// ─────────────────────────────────────────────────────────────

/**
 * Infiere la categoría del vehículo desde el texto del modelo
 * @param {string} modelText — ej: "RAV4", "CAMIÓN", "BAJAJ"
 * @returns {string} VEHICLE_CATEGORIES.*
 */
export function inferVehicleCategory(modelText = '') {
  const text = modelText.toUpperCase();

  if (/MOTO|MOTOCICL|BAJAJ|YAMAHA|HONDA CB|SUZUKI GS|KTM|ROYAL/.test(text)) {
    return VEHICLE_CATEGORIES.MOTORCYCLE;
  }
  if (/CAMIÓN|CAMION|TRUCK|FURGON|VAN DE CARGA|BUS|MINIBUS|MIXTO/.test(text)) {
    return VEHICLE_CATEGORIES.COMMERCIAL;
  }
  return VEHICLE_CATEGORIES.LIGHT; // Default: vehículo liviano
}

// ─────────────────────────────────────────────────────────────
// FORMATEAR RESULTADO PARA WHATSAPP / EMAIL
// ─────────────────────────────────────────────────────────────

/**
 * Genera un string resumido del cálculo (para WhatsApp)
 */
export function formatPremiumForWhatsApp(result, vehicleName = 'tu vehículo') {
  if (!result.success) {
    return `⚠️ No pude calcular la prima: ${result.error}`;
  }
  return (
    `🛡️ *${result.insurer_full}* — ${result.coverageLabel}\n\n` +
    `🚗 ${vehicleName}\n` +
    `💵 Valor asegurado: $${result.breakdown.commercial_value.toLocaleString()}\n\n` +
    `💰 *Prima anual: $${result.annual_total.toLocaleString()}*\n` +
    `📆 En 10 cuotas: $${result.monthly_installment} /mes\n\n` +
    `🔒 Deducible: ${result.deductible}`
  );
}

export { COVERAGE_TYPES, VEHICLE_CATEGORIES };
