/**
 * 📊 Insurance Rates — VAZ Ecuador
 * Tarifas para cálculo de primas de seguro vehicular
 *
 * ESTRUCTURA EXTENSIBLE:
 * Se puede agregar cualquier aseguradora con la misma forma.
 * Actualmente: VAZ (Seguros Oriente/VAZ Ecuador)
 *
 * NOTA: Tasas aproximadas de mercado. Actualizar con
 * la tabla tarifaria oficial recibida de VAZ.
 *
 * @author Adriana — SegPopular S.A.
 */

// ─────────────────────────────────────────────────────────────
// TIPOS DE COBERTURA
// ─────────────────────────────────────────────────────────────

export const COVERAGE_TYPES = {
  BASIC: 'basic',          // Responsabilidad Civil (RC) - terceros
  STANDARD: 'standard',    // Todo Riesgo, deducible estándar
  PREMIUM: 'premium',      // Todo Riesgo, deducible reducido + asistencia
};

// ─────────────────────────────────────────────────────────────
// CATEGORÍAS DE VEHÍCULOS
// ─────────────────────────────────────────────────────────────

export const VEHICLE_CATEGORIES = {
  LIGHT: 'light',         // Vehículos livianos: sedanes, SUV, hatchback, pickup ≤3.5T
  COMMERCIAL: 'commercial', // Vehículos comerciales: furgonetas, vans de trabajo
  MOTORCYCLE: 'motorcycle', // Motocicletas
};

// ─────────────────────────────────────────────────────────────
// TASAS VAZ — VEHÍCULOS LIVIANOS
// Tasa sobre el valor comercial del vehículo (%)
// Separadas por antigüedad (años desde fabricación)
// ─────────────────────────────────────────────────────────────

export const VAZ_RATES = {
  insurer: 'VAZ',
  insurer_full: 'Seguros VAZ Ecuador',

  [VEHICLE_CATEGORIES.LIGHT]: {
    [COVERAGE_TYPES.BASIC]: {
      // Solo responsabilidad civil (sin daños propios)
      rate_by_age: [
        { max_age: 3,  rate: 0.0045 },  // 0-3 años: 0.45%
        { max_age: 7,  rate: 0.0060 },  // 4-7 años: 0.60%
        { max_age: 12, rate: 0.0080 },  // 8-12 años: 0.80%
        { max_age: 99, rate: 0.0120 }   // 13+ años: 1.20%
      ],
      min_premium: 150,   // Prima mínima USD
      deductible: 500,    // Deducible fijo USD
      max_insured_age: 20 // Máxima antigüedad a asegurar
    },

    [COVERAGE_TYPES.STANDARD]: {
      // Todo riesgo estándar
      rate_by_age: [
        { max_age: 3,  rate: 0.0300 },  // 0-3 años: 3.00%
        { max_age: 7,  rate: 0.0340 },  // 4-7 años: 3.40%
        { max_age: 12, rate: 0.0400 },  // 8-12 años: 4.00%
        { max_age: 15, rate: 0.0500 },  // 13-15 años: 5.00%
        { max_age: 99, rate: null }      // +15 años: no aplica todo-riesgo
      ],
      min_premium: 280,
      deductible_pct: 0.05,   // 5% del valor del daño
      deductible_min: 300,    // Mínimo de deducible USD
      max_insured_age: 15
    },

    [COVERAGE_TYPES.PREMIUM]: {
      // Todo riesgo + deducible reducido + asistencia en carretera
      rate_by_age: [
        { max_age: 3,  rate: 0.0360 },  // 0-3 años: 3.60%
        { max_age: 7,  rate: 0.0410 },  // 4-7 años: 4.10%
        { max_age: 10, rate: 0.0490 },  // 8-10 años: 4.90%
        { max_age: 99, rate: null }      // +10 años: no aplica premium
      ],
      min_premium: 400,
      deductible_pct: 0.03,   // 3% del valor del daño
      deductible_min: 200,    // Mínimo deducible USD
      max_insured_age: 10
    }
  },

  [VEHICLE_CATEGORIES.COMMERCIAL]: {
    [COVERAGE_TYPES.BASIC]: {
      rate_by_age: [
        { max_age: 5,  rate: 0.0070 },
        { max_age: 10, rate: 0.0100 },
        { max_age: 99, rate: 0.0150 }
      ],
      min_premium: 200,
      deductible: 600,
      max_insured_age: 15
    },
    [COVERAGE_TYPES.STANDARD]: {
      rate_by_age: [
        { max_age: 5,  rate: 0.0380 },
        { max_age: 10, rate: 0.0450 },
        { max_age: 99, rate: null }
      ],
      min_premium: 350,
      deductible_pct: 0.05,
      deductible_min: 400,
      max_insured_age: 10
    },
    [COVERAGE_TYPES.PREMIUM]: null // No aplica para comerciales
  },

  [VEHICLE_CATEGORIES.MOTORCYCLE]: {
    [COVERAGE_TYPES.BASIC]: {
      rate_by_age: [
        { max_age: 5,  rate: 0.0060 },
        { max_age: 10, rate: 0.0090 },
        { max_age: 99, rate: 0.0130 }
      ],
      min_premium: 80,
      deductible: 300,
      max_insured_age: 15
    },
    [COVERAGE_TYPES.STANDARD]: {
      rate_by_age: [
        { max_age: 5,  rate: 0.0420 },
        { max_age: 8,  rate: 0.0500 },
        { max_age: 99, rate: null }
      ],
      min_premium: 200,
      deductible_pct: 0.06,
      deductible_min: 250,
      max_insured_age: 8
    },
    [COVERAGE_TYPES.PREMIUM]: null
  }
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
// ─────────────────────────────────────────────────────────────

export const COVERAGE_LABELS = {
  [COVERAGE_TYPES.BASIC]: {
    name: 'Responsabilidad Civil (Terceros)',
    includes: [
      'Daños a terceros (propiedad y personas)',
      'Defensa jurídica básica',
    ],
    excludes: ['Daños propios al vehículo', 'Robo/hurto']
  },
  [COVERAGE_TYPES.STANDARD]: {
    name: 'Todo Riesgo Estándar',
    includes: [
      'Daños propios por colisión',
      'Robo total y parcial',
      'Daños a terceros',
      'Daños naturales (granizo, inundación)',
      'Asistencia en carretera básica',
      'Defensa jurídica',
    ],
    excludes: []
  },
  [COVERAGE_TYPES.PREMIUM]: {
    name: 'Todo Riesgo Premium',
    includes: [
      'Daños propios por colisión',
      'Robo total y parcial',
      'Daños a terceros con mayor límite',
      'Daños naturales',
      'Asistencia 24h en carretera',
      'Auto de reemplazo (7 días)',
      'Defensa jurídica ampliada',
      'Vidrios y llantas',
    ],
    excludes: []
  }
};

// ─────────────────────────────────────────────────────────────
// TEMPLATE EXTENSIBLE PARA OTRAS ASEGURADORAS
// ─────────────────────────────────────────────────────────────
// Para agregar Mapfre, Equinoccial, etc., copiar la estructura de VAZ_RATES
// y exportarla con un nombre distinto, ej: MAPFRE_RATES.
// El calculador acepta cualquier objeto que siga la misma forma.
