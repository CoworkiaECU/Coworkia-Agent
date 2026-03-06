/**
 * 🔢 GENERADOR DE CÓDIGOS DE COTIZACIÓN
 * Genera códigos únicos alfanuméricos para cotizaciones de Axel
 * Formato: AXEL-YYYY-NNNN (ej: AXEL-2026-0001)
 */

import databaseService from '../database/database.js';

/**
 * 📝 Genera código secuencial de cotización
 */
export async function generateQuoteCode() {
  try {
    const year = new Date().getFullYear();
    
    // Obtener el último código del año actual desde collision_quotes
    const lastCode = await databaseService.get(`
      SELECT quote_code
      FROM collision_quotes
      WHERE quote_code LIKE 'AXEL-${year}-%'
      ORDER BY quote_code DESC
      LIMIT 1
    `);
    
    let sequence = 1;
    
    if (lastCode?.quote_code) {
      // Extraer número de secuencia: AXEL-2026-0001 → 0001
      const match = lastCode.quote_code.match(/AXEL-\d{4}-(\d{4})/);
      if (match) {
        sequence = parseInt(match[1]) + 1;
      }
    }
    
    // Formatear código: AXEL-2026-0001
    const code = `AXEL-${year}-${String(sequence).padStart(4, '0')}`;
    
    console.log(`[QUOTE-CODE] 🔢 Código generado: ${code}`);
    
    return {
      success: true,
      code: code,
      year: year,
      sequence: sequence
    };
    
  } catch (error) {
    console.error('[QUOTE-CODE] ❌ Error generando código:', error);
    
    // Fallback: usar timestamp
    const fallbackCode = `AXEL-${Date.now()}`;
    console.log(`[QUOTE-CODE] ⚠️ Usando código fallback: ${fallbackCode}`);
    
    return {
      success: true,
      code: fallbackCode,
      fallback: true
    };
  }
}

/**
 * 🔍 Valida formato de código de cotización
 */
export function validateQuoteCode(code) {
  const regex = /^AXEL-\d{4}-\d{4}$/;
  return regex.test(code);
}

/**
 * 📋 Extrae información del código
 */
export function parseQuoteCode(code) {
  const match = code.match(/^AXEL-(\d{4})-(\d{4})$/);
  
  if (!match) {
    return { valid: false };
  }
  
  return {
    valid: true,
    prefix: 'AXEL',
    year: parseInt(match[1]),
    sequence: parseInt(match[2]),
    formatted: code
  };
}
