/**
 * 🔢 GENERADOR DE CÓDIGOS DE COTIZACIÓN
 * Genera códigos únicos alfanuméricos para cotizaciones de Axel
 * Formato: AXEL-YYYY-NNNN (ej: AXEL-2026-0001)
 */

import { generateSequentialCode } from '../utils/code-generator.js';

/**
 * 📝 Genera código secuencial de cotización
 * Wrapper que mantiene {success, code} para compatibilidad con collision-confirmation.js
 */
export async function generateQuoteCode() {
  try {
    const code = await generateSequentialCode('AXL', 'collision_quotes', 'quote_code', 4);
    return { success: true, code, year: new Date().getFullYear() };
  } catch (error) {
    console.error('[QUOTE-CODE] ❌ Error generando código:', error);
    return { success: true, code: `AXL-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`, fallback: true };
  }
}

/**
 * 🔍 Valida formato de código de cotización
 */
export function validateQuoteCode(code) {
  const regex = /^AXL-\d{4}-\d{4}$/;
  return regex.test(code);
}

/**
 * 📋 Extrae información del código
 */
export function parseQuoteCode(code) {
  const match = code.match(/^AXL-(\d{4})-(\d{4})$/);
  
  if (!match) {
    return { valid: false };
  }
  
  return {
    valid: true,
    prefix: 'AXL',
    year: parseInt(match[1]),
    sequence: parseInt(match[2]),
    formatted: code
  };
}
