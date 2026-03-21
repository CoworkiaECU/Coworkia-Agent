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
  COVERAGE_LABELS
} from './insurance-rates-vaz.js';

// Mapa de aseguradoras disponibles (extensible)
const INSURER_RATES = {
  VAZ: VAZ_RATES,
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

  const categoryRates = rates[vehicleCategory];
  if (!categoryRates) {
    return { success: false, error: `Categoría no disponible: ${vehicleCategory}` };
  }

  const coverageRates = categoryRates[coverage];
  if (!coverageRates) {
    return { success: false, error: `Cobertura ${coverage} no disponible para ${vehicleCategory} en ${insurer}` };
  }

  // Calcular antigüedad del vehículo
  const currentYear = new Date().getFullYear();
  const vehicleAge = currentYear - vehicleYear;

  // Validar antigüedad máxima
  if (vehicleAge > coverageRates.max_insured_age) {
    return {
      success: false,
      error: `Vehículo con ${vehicleAge} años de antigüedad supera el máximo aceptado (${coverageRates.max_insured_age} años) para cobertura ${coverage}`
    };
  }

  // Obtener tasa según antigüedad
  const rateEntry = coverageRates.rate_by_age.find(r => vehicleAge <= r.max_age);
  const rate = rateEntry?.rate;

  if (!rate) {
    return { success: false, error: `No hay tasa disponible para vehículo de ${vehicleAge} años con cobertura ${coverage}` };
  }

  // ─── Cálculo ─────────────────────────────────────────────
  const basePremium = commercialValue * rate;
  const premiumBeforeIva = Math.max(basePremium, coverageRates.min_premium || 0);
  const iva = premiumBeforeIva * FIXED_COSTS.iva_rate;
  const fees = FIXED_COSTS.emission_fee + FIXED_COSTS.super_fee + FIXED_COSTS.administrative;

  const annualTotal = Math.round(premiumBeforeIva + iva + fees);
  const monthlyInstallment = Math.round(annualTotal / 10); // 10 cuotas (Ecuador)

  // ─── Deducible ───────────────────────────────────────────
  let deductibleDescription;
  if (coverageRates.deductible) {
    // Deducible fijo
    deductibleDescription = `$${coverageRates.deductible} fijo por siniestro`;
  } else if (coverageRates.deductible_pct) {
    const pct = coverageRates.deductible_pct * 100;
    const minD = coverageRates.deductible_min;
    deductibleDescription = `${pct}% del monto del daño (mínimo $${minD})`;
  } else {
    deductibleDescription = 'Consultar con Adriana';
  }

  return {
    success: true,
    insurer,
    insurer_full: rates.insurer_full || insurer,
    coverage,
    coverageLabel: COVERAGE_LABELS[coverage]?.name || coverage,
    vehicleAge,
    rate: (rate * 100).toFixed(2) + '%',

    breakdown: {
      commercial_value: commercialValue,
      base_premium: Math.round(premiumBeforeIva),
      iva: Math.round(iva),
      fees: Math.round(fees),
    },

    annual_total: annualTotal,
    monthly_installment: monthlyInstallment,

    deductible: deductibleDescription,
    includes: COVERAGE_LABELS[coverage]?.includes || [],
    excludes: COVERAGE_LABELS[coverage]?.excludes || [],
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
