/**
 * 👔 Boss Quotes Repository
 * Guarda todas las cotizaciones enviadas por el jefe desde WhatsApp.
 * Un registro por cada vez que el Big Boss ordena una cotización a cualquier agente.
 */

import databaseService from './database.js';
import { AGENT_CODE_PREFIX } from '../utils/code-generator.js';

/**
 * 💾 Guarda una cotización del jefe en boss_quotes
 *
 * @param {Object} opts
 * @param {string} opts.agent          - Agente que envió: GABI, ENZO, PAULA, AXEL, ALUNA
 * @param {string} [opts.clientName]   - Nombre del cliente
 * @param {string} [opts.clientEmail]  - Email del cliente
 * @param {string} [opts.clientPhone]  - Teléfono del cliente
 * @param {string} [opts.companyName]  - Empresa (ENZO)
 * @param {string} [opts.serviceInfo]  - Área/plan/propiedad/vehículo/nivel
 * @param {number} [opts.amountMin]    - Precio mínimo o precio único
 * @param {number} [opts.amountMax]    - Precio máximo (para rangos, ej: AXEL)
 * @param {string} [opts.quoteCode]    - Código de cotización (AXEL, ALUNA generan uno)
 * @param {boolean} [opts.emailSent]   - ¿El email fue enviado con éxito?
 */
export async function saveBossQuote({
  agent,
  clientName   = null,
  clientEmail  = null,
  clientPhone  = null,
  companyName  = null,
  serviceInfo  = null,
  amountMin    = null,
  amountMax    = null,
  quoteCode    = null,
  emailSent    = true,
}) {
  try {
    await databaseService.ensureInitialized();

    await databaseService.run(
      `INSERT INTO boss_quotes
        (agent, client_name, client_email, client_phone,
         company_name, service_info, amount_min, amount_max,
         quote_code, email_sent)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        agent, clientName, clientEmail, clientPhone,
        companyName, serviceInfo, amountMin, amountMax,
        quoteCode, emailSent,
      ]
    );

    console.log(`[BOSS-QUOTES] 💾 Quote guardada — ${agent} → ${clientEmail} (${serviceInfo || quoteCode || ''})`);
  } catch (err) {
    // No bloquear el flujo principal si falla el guardado
    console.error('[BOSS-QUOTES] ⚠️ Error guardando quote (no bloquea envío):', err.message);
  }
}

// ─── PREFIJOS POR AGENTE ─────────────────────────────────────────────────────
const AGENT_PREFIX = AGENT_CODE_PREFIX;

/**
 * 🔢 Genera código secuencial de documento por agente y año.
 * Consulta boss_quotes para encontrar el último número usado y avanza uno.
 * Formatos: GRC-2026-0001 · ML-2026-0001 · PRE-2026-0001 · PRO-2026-0001
 *
 * @param {string} agent - GABI | ENZO | PAULA | AXEL | ALUNA
 * @returns {Promise<string>}
 */
export async function generateBossQuoteCode(agent) {
  const prefix = AGENT_PREFIX[agent] || agent;
  const year   = new Date().getFullYear();
  try {
    await databaseService.ensureInitialized();
    const last = await databaseService.get(
      `SELECT quote_code FROM boss_quotes WHERE agent = $1 AND quote_code LIKE $2 ORDER BY id DESC LIMIT 1`,
      [agent, `${prefix}-${year}-%`]
    );
    let seq = 1;
    if (last?.quote_code) {
      const m = last.quote_code.match(/-(\d+)$/);
      if (m) seq = parseInt(m[1]) + 1;
    }
    return `${prefix}-${year}-${String(seq).padStart(4, '0')}`;
  } catch (err) {
    console.error('[BOSS-QUOTES] ⚠️ Error generando código secuencial:', err.message);
    return `${prefix}-${Date.now().toString(36).toUpperCase()}`;
  }
}
