/**
 * 📊 Insurance Rates — VAZ Ecuador
 * Tarifas OFICIALES para cálculo de primas de seguro vehicular
 *
 * FUENTE: Presentaciones oficiales VAZ 2026
 *   - PRESENTACIÓN SIERRA NORTE VH.pptx (Quito, Ibarra, etc.)
 *   - VEHÍCULOS SIERRA SUR.pptx (Cuenca, Loja, etc.)
 *   - Costa: pendiente (archivo PPTX corrupto — contactar VAZ)
 *
 * ESTRUCTURA: Las tasas son por TRAMO DE VALOR ASEGURADO
 * (no por antigüedad). Producto único: Todo Riesgo.
 *
 * Producto VAZ "Ensigna" ($20k-$70k) → target de Adriana
 * Incluye: Amparo Patrimonial, RC $40k, Med $6k, Muerte $3k
 *
 * @author Adriana — SegPopular S.A.
 * @updated 21 Mar 2026 — tasas oficiales VAZ 2026 cargadas
 */

// ─────────────────────────────────────────────────────────────
// OPCIONES DE DEDUCIBLE (dentro del mismo producto Todo Riesgo)
// ─────────────────────────────────────────────────────────────

export const COVERAGE_TYPES = {
  // Mantener nombres para compatibilidad con código existente
  BASIC: 'basic',        // Alias: Taller Designado + repuestos alternos (deducible 7%)
  STANDARD: 'standard',  // Alias: Taller Designado + repuestos alternos (deducible 7%)
  PREMIUM: 'premium',    // Alias: Libre Designación + repuestos originales (deducible 10%)
};

// ─────────────────────────────────────────────────────────────
// CATEGORÍAS DE VEHÍCULOS
// ─────────────────────────────────────────────────────────────

export const VEHICLE_CATEGORIES = {
  LIGHT: 'light',         // Vehículos livianos: sedanes, SUV, hatchback
  PICKUP: 'pickup',       // Camionetas
  ELECTRIC: 'electric',   // Vehículos eléctricos
  COMMERCIAL: 'commercial', // Vehículos comerciales
  MOTORCYCLE: 'motorcycle', // Motocicletas
};

// ─────────────────────────────────────────────────────────────
// TASAS VAZ OFICIALES 2026 — SIERRA NORTE
// (Quito, Ibarra, Cayambe, Tulcán, Latacunga, Ambato, Riobamba, Guaranda, Baños)
// Fuente: PRESENTACIÓN SIERRA NORTE VH.pptx (VAZ, 12 Mar 2026)
// ─────────────────────────────────────────────────────────────

// Estructura: rate_by_value[] → buscar el tramo que incluya el valor asegurado
// Producto único: TODO RIESGO (no hay cobertura básica o parcial)
// Deducible: 2 opciones (ver DEDUCTIBLES_VAZ)
// Amparo Patrimonial: incluido en Ensigna y Gama Alta, +0.2% en entry level

export const VAZ_RATES_SIERRA_NORTE = {
  insurer: 'VAZ',
  insurer_full: 'Seguros VAZ Ecuador',
  region: 'SIERRA_NORTE',

  // Vehículos livianos (sedanes, SUV, hatchback, pick-up ≤3.5T)
  light: [
    // Entry level (sin amparo patrimonial; +0.2% si se desea)
    { label: 'Entry',    min_value: 0,      max_value: 14999,  rate: 0.0480, rc_limit: 20000, med_limit: 5000, death_limit: 2500, amparo_included: false },
    { label: 'Entry',    min_value: 15000,  max_value: 19999,  rate: 0.0430, rc_limit: 20000, med_limit: 5000, death_limit: 2500, amparo_included: false },
    // Ensigna (amparo patrimonial incluido)
    { label: 'Ensigna',  min_value: 20000,  max_value: 24999,  rate: 0.0380, rc_limit: 30000, med_limit: 6000, death_limit: 3000, amparo_included: true  },
    { label: 'Ensigna',  min_value: 25000,  max_value: 29999,  rate: 0.0260, rc_limit: 30000, med_limit: 6000, death_limit: 3000, amparo_included: true  },
    { label: 'Ensigna',  min_value: 30000,  max_value: 34999,  rate: 0.0240, rc_limit: 40000, med_limit: 6000, death_limit: 3000, amparo_included: true  },
    { label: 'Ensigna',  min_value: 35000,  max_value: 69999,  rate: 0.0220, rc_limit: 40000, med_limit: 6000, death_limit: 3000, amparo_included: true  },
    // Gama Alta (amparo patrimonial incluido)
    { label: 'Gama Alta', min_value: 70000, max_value: 999999, rate: 0.0200, rc_limit: 50000, med_limit: 7000, death_limit: 3500, amparo_included: true  },
  ],

  // Camionetas (pickup trucks)
  pickup: [
    { label: 'Entry',    min_value: 0,      max_value: 14999,  rate: 0.0525, rc_limit: 20000, med_limit: 5000, death_limit: 2500, amparo_included: false },
    { label: 'Entry',    min_value: 15000,  max_value: 19999,  rate: 0.0525, rc_limit: 20000, med_limit: 5000, death_limit: 2500, amparo_included: false },
    { label: 'Ensigna',  min_value: 20000,  max_value: 24999,  rate: 0.0425, rc_limit: 30000, med_limit: 6000, death_limit: 3000, amparo_included: true  },
    { label: 'Ensigna',  min_value: 25000,  max_value: 29999,  rate: 0.0425, rc_limit: 30000, med_limit: 6000, death_limit: 3000, amparo_included: true  },
    { label: 'Ensigna',  min_value: 30000,  max_value: 34999,  rate: 0.0240, rc_limit: 40000, med_limit: 6000, death_limit: 3000, amparo_included: true  },
    { label: 'Ensigna',  min_value: 35000,  max_value: 69999,  rate: 0.0220, rc_limit: 40000, med_limit: 6000, death_limit: 3000, amparo_included: true  },
    { label: 'Gama Alta', min_value: 70000, max_value: 999999, rate: 0.0220, rc_limit: 50000, med_limit: 7000, death_limit: 3500, amparo_included: true  },
  ],

  // Vehículos eléctricos
  electric: [
    { label: 'Entry',    min_value: 0,      max_value: 14999,  rate: 0.0530, rc_limit: 20000, med_limit: 5000, death_limit: 2500, amparo_included: false },
    { label: 'Entry',    min_value: 15000,  max_value: 19999,  rate: 0.0480, rc_limit: 20000, med_limit: 5000, death_limit: 2500, amparo_included: false },
    { label: 'Ensigna',  min_value: 20000,  max_value: 24999,  rate: 0.0430, rc_limit: 30000, med_limit: 6000, death_limit: 3000, amparo_included: true  },
    { label: 'Ensigna',  min_value: 25000,  max_value: 29999,  rate: 0.0290, rc_limit: 30000, med_limit: 6000, death_limit: 3000, amparo_included: true  },
    { label: 'Ensigna',  min_value: 30000,  max_value: 34999,  rate: 0.0270, rc_limit: 40000, med_limit: 6000, death_limit: 3000, amparo_included: true  },
    { label: 'Ensigna',  min_value: 35000,  max_value: 69999,  rate: 0.0250, rc_limit: 40000, med_limit: 6000, death_limit: 3000, amparo_included: true  },
    { label: 'Gama Alta', min_value: 70000, max_value: 999999, rate: 0.0230, rc_limit: 50000, med_limit: 7000, death_limit: 3500, amparo_included: true  },
  ],
};

// ─────────────────────────────────────────────────────────────
// TASAS VAZ OFICIALES 2026 — SIERRA SUR
// (Cuenca, Loja, Azogues, Cariamanga, Catamayo, Gualaceo, Paute)
// Fuente: VEHÍCULOS SIERRA SUR.pptx (VAZ, 12 Mar 2026)
// ─────────────────────────────────────────────────────────────

export const VAZ_RATES_SIERRA_SUR = {
  insurer: 'VAZ',
  insurer_full: 'Seguros VAZ Ecuador',
  region: 'SIERRA_SUR',

  light: [
    { label: 'Entry',    min_value: 0,      max_value: 14999,  rate: 0.0450, rc_limit: 20000, med_limit: 5000, death_limit: 2500, amparo_included: false },
    { label: 'Entry',    min_value: 15000,  max_value: 19999,  rate: 0.0390, rc_limit: 20000, med_limit: 5000, death_limit: 2500, amparo_included: false },
    { label: 'Ensigna',  min_value: 20000,  max_value: 24999,  rate: 0.0350, rc_limit: 30000, med_limit: 6000, death_limit: 3000, amparo_included: true  },
    { label: 'Ensigna',  min_value: 25000,  max_value: 29999,  rate: 0.0260, rc_limit: 30000, med_limit: 6000, death_limit: 3000, amparo_included: true  },
    { label: 'Ensigna',  min_value: 30000,  max_value: 34999,  rate: 0.0240, rc_limit: 40000, med_limit: 6000, death_limit: 3000, amparo_included: true  },
    { label: 'Ensigna',  min_value: 35000,  max_value: 69999,  rate: 0.0220, rc_limit: 40000, med_limit: 6000, death_limit: 3000, amparo_included: true  },
    { label: 'Gama Alta', min_value: 70000, max_value: 999999, rate: 0.0200, rc_limit: 50000, med_limit: 7000, death_limit: 3500, amparo_included: true  },
  ],

  pickup: [
    { label: 'Entry',    min_value: 0,      max_value: 14999,  rate: 0.0490, rc_limit: 20000, med_limit: 5000, death_limit: 2500, amparo_included: false },
    { label: 'Entry',    min_value: 15000,  max_value: 19999,  rate: 0.0490, rc_limit: 20000, med_limit: 5000, death_limit: 2500, amparo_included: false },
    { label: 'Ensigna',  min_value: 20000,  max_value: 24999,  rate: 0.0390, rc_limit: 30000, med_limit: 6000, death_limit: 3000, amparo_included: true  },
    { label: 'Ensigna',  min_value: 25000,  max_value: 29999,  rate: 0.0390, rc_limit: 30000, med_limit: 6000, death_limit: 3000, amparo_included: true  },
    { label: 'Ensigna',  min_value: 30000,  max_value: 34999,  rate: 0.0240, rc_limit: 40000, med_limit: 6000, death_limit: 3000, amparo_included: true  },
    { label: 'Ensigna',  min_value: 35000,  max_value: 69999,  rate: 0.0220, rc_limit: 40000, med_limit: 6000, death_limit: 3000, amparo_included: true  },
    { label: 'Gama Alta', min_value: 70000, max_value: 999999, rate: 0.0220, rc_limit: 50000, med_limit: 7000, death_limit: 3500, amparo_included: true  },
  ],

  // Sin datos de eléctricos en Sierra Sur — usar Sierra Norte como fallback
  electric: null,
};

// ─────────────────────────────────────────────────────────────
// COSTA — TASAS PENDIENTES
// (Guayaquil, Manta, Esmeraldas, etc.)
// NOTA: Archivo PPTX "PRESENTACIÓN COSTA VH.pptx" recibido pero
//       corrupto. Verificar con VAZ. Por ahora NO operar en Costa.
// ─────────────────────────────────────────────────────────────

export const VAZ_RATES_COSTA = null; // pendiente datos oficiales

// ─────────────────────────────────────────────────────────────
// MAPA REGIÓN → TASAS (para lookup rápido)
// ─────────────────────────────────────────────────────────────

export const VAZ_RATES_BY_REGION = {
  SIERRA_NORTE: VAZ_RATES_SIERRA_NORTE,
  SIERRA_SUR:   VAZ_RATES_SIERRA_SUR,
  COSTA:        VAZ_RATES_COSTA,
};

// Backward-compat: VAZ_RATES apunta a Sierra Norte
// (mayoría de leads de Adriana son de Quito)
export const VAZ_RATES = VAZ_RATES_SIERRA_NORTE;

// ─────────────────────────────────────────────────────────────
// DEDUCIBLES VAZ — Todo Riesgo
// Aplican a TODOS los tramos de valor y regiones
// ─────────────────────────────────────────────────────────────

export const DEDUCTIBLES_VAZ = {
  // Opción A: libre designación de talleres y repuestos originales
  LIBRE_DESIGNACION: {
    label: 'Libre Designación',
    description: 'Elige tú el taller y repuestos originales de fábrica',
    partial_loss_pct: 0.10,       // 10% del valor del siniestro
    partial_loss_min_pct: 0.01,   // mínimo: 1% del valor asegurado
    partial_loss_min_abs: 200,    // no menor a $200
    total_loss_damage_pct: 0.15,  // 15% del valor asegurado (pérdida total por daños)
    total_loss_theft_pct: 0.20,   // 20% del valor asegurado (pérdida total por robo)
  },
  // Opción B: taller designado por VAZ y repuestos alternos
  TALLER_DESIGNADO: {
    label: 'Taller Designado',
    description: 'Taller asignado por VAZ, repuestos de calidad equivalente',
    partial_loss_pct: 0.07,       // 7% del valor del siniestro
    partial_loss_min_pct: 0.007,  // mínimo: 0.7% del valor asegurado
    partial_loss_min_abs: 150,    // no menor a $150
    total_loss_damage_pct: 0.15,  // 15% del valor asegurado
    total_loss_theft_pct: 0.20,   // 20% del valor asegurado
  },
};

// ─────────────────────────────────────────────────────────────
// COBERTURAS INCLUIDAS (Todo Riesgo VAZ)
// Igual para todos los tramos/regiones
// ─────────────────────────────────────────────────────────────

export const VAZ_COVERAGES_INCLUDED = [
  'Choque y vuelco',
  'Incendio y rayo',
  'Robo total y parcial',
  'Vandalismo',
  'Huelgas y motines',
  'Eventos de la naturaleza (granizo, inundación)',
  'Rotura de vidrios',
  'Responsabilidad Civil (RC)',
  'Cobertura de gastos médicos',
  'Muerte accidental',
];

// ─────────────────────────────────────────────────────────────
// VAZ ASISTENCIA — incluida en todos los planes
// Fuente: DOC_EC_COM_Terminos_de_Asistencia_Vial_Livianos_Vaz_Seguros.pdf
// ─────────────────────────────────────────────────────────────

export const VAZ_ASISTENCIA = {
  remolque: {
    label: 'Remolque / Grúa',
    accident_limit_usd: 300,    accident_events: 'ilimitados',
    breakdown_limit_usd: 300,   breakdown_events_per_year: 3,
  },
  auxilio_vial: {
    label: 'Auxilio Vial (llanta, combustible, corriente)',
    limit_usd: 200,
    events_per_year: 3,
  },
  cerrajeria: {
    label: 'Cerrajería Vial',
    limit_usd: 200,
    events_per_year: 3,
  },
  llave_protegida: {
    label: 'Llave Protegida (robo de llaves)',
    limit_usd: 250,
    events_per_year: 1,
  },
  asistencia_legal: {
    label: 'Asistencia Legal Telefónica',
    limit: 'sin límite',
    events_per_year: 'sin límite',
  },
  conductor_elegido: {
    label: 'Conductor Elegido (si toma licor)',
    limit: 'sin límite de alcance',
    events_per_year: 3,
    advance_notice_hrs: 2,
  },
  liberacion_vehiculo: {
    label: 'Liberación del Vehículo (detenido por autoridad)',
    limit: 'sin límite',
    events_per_year: 'sin límite',
  },
  defensa_legal: {
    label: 'Defensa Legal y Penal',
    limit: 'sin límite',
    events_per_year: 'sin límite',
  },
};

// ─────────────────────────────────────────────────────────────
// COSTOS FIJOS Y FISCALES (Ecuador)
// ─────────────────────────────────────────────────────────────

export const FIXED_COSTS = {
  iva_rate: 0.15,         // IVA Ecuador 15%
  emission_fee: 25,       // Derecho de emisión de póliza
  super_fee: 3.5,         // Aporte a la Superintendencia de Compañías
  administrative: 10,     // Gastos administrativos
};

// ─────────────────────────────────────────────────────────────
// COBERTURAS EN PALABRAS (para emails/whatsapp)
// Backward-compat con adriana-quote-calculator.js
// En VAZ: BASIC/STANDARD = Taller Designado, PREMIUM = Libre Designación
// ─────────────────────────────────────────────────────────────

export const COVERAGE_LABELS = {
  [COVERAGE_TYPES.BASIC]: {
    name: 'Todo Riesgo (Taller Designado)',
    includes: VAZ_COVERAGES_INCLUDED,
    deductible: 'Taller designado, 7% del daño (mín 0.7% V/Asegurado, no menor a $150)',
    excludes: []
  },
  [COVERAGE_TYPES.STANDARD]: {
    name: 'Todo Riesgo (Taller Designado)',
    includes: VAZ_COVERAGES_INCLUDED,
    deductible: 'Taller designado, 7% del daño (mín 0.7% V/Asegurado, no menor a $150)',
    excludes: []
  },
  [COVERAGE_TYPES.PREMIUM]: {
    name: 'Todo Riesgo (Libre Designación)',
    includes: [...VAZ_COVERAGES_INCLUDED, 'Libre elección de taller', 'Repuestos originales de fábrica'],
    deductible: 'Libre designación, 10% del daño (mín 1% V/Asegurado, no menor a $200)',
    excludes: []
  }
};

// ─────────────────────────────────────────────────────────────
// HELPER: obtener tasa por valor asegurado y región
// ─────────────────────────────────────────────────────────────

/**
 * Retorna el tramo de tasa VAZ para un valor y región dados.
 *
 * @param {number} commercialValue — Valor comercial del vehículo USD
 * @param {string} [vehicleType]   — 'light' | 'pickup' | 'electric' (default: 'light')
 * @param {string} [region]        — 'SIERRA_NORTE' | 'SIERRA_SUR' (default: 'SIERRA_NORTE')
 * @returns {{ rate, label, rc_limit, med_limit, death_limit, amparo_included } | null}
 */
export function getVazRateBracket(commercialValue, vehicleType = 'light', region = 'SIERRA_NORTE') {
  const regionRates = VAZ_RATES_BY_REGION[region];
  if (!regionRates) return null;

  const table = regionRates[vehicleType] || regionRates.light;
  if (!table) return null;

  return table.find(t => commercialValue >= t.min_value && commercialValue <= t.max_value) || null;
}

/**
 * Calcula la prima anual VAZ (Todo Riesgo) para un vehículo.
 * Reemplaza el uso de age-based rates por value-bracket rates.
 *
 * @param {number} commercialValue
 * @param {string} [vehicleType]  — 'light' | 'pickup' | 'electric'
 * @param {string} [region]       — 'SIERRA_NORTE' | 'SIERRA_SUR'
 * @param {string} [deductibleOpt] — 'LIBRE_DESIGNACION' | 'TALLER_DESIGNADO'
 * @returns {object} { success, rate, base_premium, iva, fees, annual_total, monthly, bracket }
 */
export function calculateVazPremiumOfficial(commercialValue, vehicleType = 'light', region = 'SIERRA_NORTE', deductibleOpt = 'TALLER_DESIGNADO') {
  const bracket = getVazRateBracket(commercialValue, vehicleType, region);
  if (!bracket) {
    return { success: false, error: `No hay tasa para valor $${commercialValue} en ${region}` };
  }

  const basePremium = commercialValue * bracket.rate;
  const iva = basePremium * FIXED_COSTS.iva_rate;
  const fees = FIXED_COSTS.emission_fee + FIXED_COSTS.super_fee + FIXED_COSTS.administrative;
  const annualTotal = Math.round(basePremium + iva + fees);
  const monthly = Math.round(annualTotal / 10); // 10 cuotas Ecuador

  const deductible = DEDUCTIBLES_VAZ[deductibleOpt];

  return {
    success: true,
    rate: bracket.rate,
    rate_pct: (bracket.rate * 100).toFixed(2) + '%',
    product_label: bracket.label,
    region,
    amparo_included: bracket.amparo_included,

    breakdown: {
      commercial_value: commercialValue,
      base_premium: Math.round(basePremium),
      iva: Math.round(iva),
      fees: Math.round(fees),
    },

    annual_total: annualTotal,
    monthly_installment: monthly,

    liability_limits: {
      rc: bracket.rc_limit,
      medical: bracket.med_limit,
      death: bracket.death_limit,
    },

    deductible_option: deductibleOpt,
    deductible_label: deductible.label,
    deductible_description: deductible.description,
    deductible_partial_pct: (deductible.partial_loss_pct * 100) + '%',
    deductible_partial_min: `$${deductible.partial_loss_min_abs}`,
  };
}

// ─────────────────────────────────────────────────────────────
// TEMPLATE EXTENSIBLE PARA OTRAS ASEGURADORAS
// Para agregar Mapfre, Equinoccial, etc., seguir misma estructura
// ─────────────────────────────────────────────────────────────

