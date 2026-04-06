/**
 * 🔢 GENERADOR UNIVERSAL DE CÓDIGOS SECUENCIALES
 *
 * Todos los agentes usan el mismo formato: PREFIX-YYYY-NNNN
 * Prefijos basados en las primeras letras del nombre del agente:
 *
 *   AXL  → Axel  (colisiones)
 *   ADR  → Adriana  (seguros)
 *   GAB  → Gabi  (consultoría legal)
 *   ENZ  → Enzo  (marketing)
 *   PAU  → Paula  (bienes raíces y visitas)
 *   ALU  → Aluna  (membresías)
 */

import databaseService from '../database/database.js';

/**
 * Prefijos oficiales por agente
 */
export const AGENT_CODE_PREFIX = {
  AXEL:    'AXL',
  ADRIANA: 'ADR',
  GABI:    'GAB',
  ENZO:    'ENZ',
  PAULA:   'PAU',
  ALUNA:   'ALU',
  AURORA:  'AUR',
  ANGELA:  'ANG',
};

/**
 * 🔢 Genera código secuencial en formato PREFIX-YYYY-NNNN
 *
 * @param {string} prefix       - Prefijo del agente (ej: 'AXL', 'ADR')
 * @param {string} table        - Nombre de la tabla en DB
 * @param {string} codeColumn   - Columna que almacena el código (ej: 'quote_code', 'id')
 * @param {number} [padLength=4] - Dígitos del número secuencial (default: 4)
 * @returns {Promise<string>}   - Código generado (ej: 'AXL-2026-0001')
 */
export async function generateSequentialCode(prefix, table, codeColumn, padLength = 4) {
  const year = new Date().getFullYear();
  const fullPrefix = `${prefix}-${year}-`;

  try {
    await databaseService.initialize();

    const last = await databaseService.get(
      `SELECT ${codeColumn} FROM ${table} WHERE ${codeColumn} LIKE $1 ORDER BY ${codeColumn} DESC LIMIT 1`,
      [`${fullPrefix}%`]
    );

    let seq = 1;
    if (last?.[codeColumn]) {
      const m = last[codeColumn].match(/-(\d+)$/);
      if (m) seq = parseInt(m[1]) + 1;
    }

    const code = `${fullPrefix}${String(seq).padStart(padLength, '0')}`;
    console.log(`[CODE-GEN] 🔢 Código generado: ${code}`);
    return code;

  } catch (err) {
    console.error(`[CODE-GEN] ❌ Error generando código para ${prefix}:`, err.message);
    // Fallback seguro: timestamp truncado
    return `${fullPrefix}${Date.now().toString().slice(-4)}`;
  }
}
