/**
 * 👔 Boss Quotes Repository
 * Guarda todas las cotizaciones enviadas por el jefe desde WhatsApp.
 * Un registro por cada vez que el Big Boss ordena una cotización a cualquier agente.
 */

import databaseService from './database.js';

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
