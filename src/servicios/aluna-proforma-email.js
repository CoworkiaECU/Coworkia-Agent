/**
 * 💜 ALUNA — Servicio de Proformas de Membresía
 *
 * Permite enviar una proforma elegante al cliente cuando:
 * 1. Aluna recopila membershipType + fullName + email durante la conversación
 * 2. El administrador usa el comando "cotizar [plan] para [nombre] | [email]"
 *
 * La proforma muestra ÚNICAMENTE el plan elegido (no todos los planes).
 */

import { sendEmail, AGENT_FROM_NAMES, DEFAULT_FROM_EMAIL } from './email.js';
import { generateEmailForAgent } from './generic-email-templates.js';
import { saveMembershipLead, trackAlunaProspect } from '../database/alunaRepository.js';
import { validateEmail, formatEmailError } from '../utils/email-validator.js';
import databaseService from '../database/database.js';
import { generateSequentialCode } from '../utils/code-generator.js';
import { CONTACT, MEMBERSHIP_PLANS, normalizePlanKey as normalizeFactPlanKey } from '../utils/coworkia-facts.js';

// ──────────────────────────────────────────────
// 📋 Vista legacy derivada de la fuente canónica de planes.
// ──────────────────────────────────────────────
const toLegacyPlanData = (plan) => Object.freeze({
  key: plan.key,
  name: plan.name,
  price: plan.priceDisplay,
  days: plan.days,
  hours: plan.hours,
  ideal: plan.ideal,
  benefits: plan.benefits,
});

export const PLAN_DATA = Object.freeze(
  Object.fromEntries(
    Object.entries(MEMBERSHIP_PLANS).map(([key, plan]) => [key, toLegacyPlanData(plan)])
  )
);

/**
 * 🔧 Normaliza el texto del plan al key interno
 * Acepta variaciones: "plan10", "Plan 10", "plan mensual", "oficina", etc.
 */
export function normalizePlanKey(rawPlan) {
  return normalizeFactPlanKey(rawPlan);
}

/**
 *  Envía proforma de membresía al cliente
 *
 * @param {Object} opts
 * @param {string} opts.clientName   - Nombre del prospecto
 * @param {string} opts.clientEmail  - Email donde se envía la proforma
 * @param {string} opts.planKey      - Clave del plan (plan10, plan20, oficinavirtual, salareuniones)
 * @param {string} [opts.proformaCode] - Código de proforma (se genera si no se pasa)
 * @param {boolean} [opts.fromAdmin] - true si la envía el administrador
 * @returns {Promise<{success: boolean, proformaCode: string, error?: string}>}
 */
export async function sendAlunaProforma({ clientName, clientEmail, planKey, proformaCode, nota = null, fromAdmin = false }) {
  try {
    // ✅ Validar email antes de continuar
    const emailValidation = validateEmail(clientEmail);
    if (!emailValidation.valid) {
      const errorMsg = formatEmailError(emailValidation);
      console.error(`[ALUNA-PROFORMA] ❌ Email inválido: ${clientEmail}`);
      throw new Error(errorMsg || 'Email inválido');
    }
    
    // ⚠️ Warning si hay sugerencia (email técnicamente válido pero sospechoso)
    if (emailValidation.warning) {
      console.warn(`[ALUNA-PROFORMA] ⚠️ Email sospechoso: ${clientEmail} - ${emailValidation.warning}`);
    }
    
    const plan = PLAN_DATA[normalizePlanKey(planKey)];
    if (!plan) {
      throw new Error(`Plan desconocido: ${planKey}`);
    }

    const code = proformaCode || await generateSequentialCode('ALU', 'membership_leads', 'membership_code', 4);

    const emailContent = generateEmailForAgent('ALUNA', 'proforma', {
      clientName,
      planName: plan.name,
      planPrice: plan.price,
      planDays: plan.days,
      planHours: plan.hours,
      planBenefits: plan.benefits,
      planIdeal: plan.ideal,
      proformaCode: code,
      nota: nota || null,
      coworkiaWhatsApp: CONTACT.phoneWhatsApp,
    });

    const contextualSubject = `Membresía Coworkia ${code} - Aluna`;

    await sendEmail({
      to: clientEmail,
      cc: 'coworkia.ec@gmail.com',
      subject: contextualSubject,
      html: emailContent.html,
      from: { name: AGENT_FROM_NAMES.aluna, address: DEFAULT_FROM_EMAIL }
    });

    console.log(`[ALUNA-PROFORMA] 💜 Proforma enviada a ${clientEmail} (${plan.name}) — ${code}${fromAdmin ? ' [admin]' : ''}`);
    return { success: true, proformaCode: code, planName: plan.name };
  } catch (error) {
    console.error('[ALUNA-PROFORMA] ❌ Error enviando proforma:', error.message);
    return { success: false, proformaCode: '', error: error.message };
  }
}

/**
 * 💾 Guarda el lead al enviar una proforma (sin esperar confirmación SI)
 *
 * @param {Object} opts
 * @param {string} opts.userId       - Número de teléfono del usuario (o admin si fromAdmin)
 * @param {string} opts.clientName   - Nombre del prospecto
 * @param {string} opts.clientEmail  - Email del prospecto
 * @param {string} opts.planKey      - Clave del plan
 * @param {string} [opts.phone]      - Teléfono del prospecto (puede ser null)
 * @param {string} [opts.proformaCode] - Código de proforma
 * @param {boolean} [opts.fromAdmin] - true si fue enviado por admin
 * @returns {Promise<{success: boolean, leadId?: string}>}
 */
export async function saveAlunaLeadFromProforma({ userId, clientName, clientEmail, planKey, phone, proformaCode, nota = null, fromAdmin = false }) {
  try {
    const plan = PLAN_DATA[normalizePlanKey(planKey)];
    const code = proformaCode || await generateSequentialCode('ALU', 'membership_leads', 'membership_code', 4);

    const leadData = {
      id: `PRF-${Date.now()}_${(userId || '').replace(/\D/g, '').slice(-8)}`,
      membershipCode: code,
      userId: userId, // SIEMPRE el WA phone (user en tabla users). phone del cliente va en campo 'phone'
      membershipType: plan?.name || planKey,
      startDate: null,
      clientName,
      email: clientEmail,
      phone: phone || null,
      companyName: null,
      specialRequirements: nota
        ? `${fromAdmin ? 'Admin: ' : ''}${nota}`
        : (fromAdmin ? 'Enviado por administrador' : null),
      monthlyFee: plan?.price ? parseFloat(plan.price.match(/[\d.]+/)?.[0]) || null : null,
    };

    const saved = await saveMembershipLead(leadData);
    console.log(`[ALUNA-PROFORMA] 💾 Lead guardado: ${saved?.id || code}`);
    
    // ✅ Activar seguimiento automático (24h + 3 días)
    const userPhone = fromAdmin ? (phone || userId) : userId;
    await trackAlunaProspect(userPhone, clientName, plan?.name || planKey, code, clientEmail || null);
    console.log(`[ALUNA-PROFORMA] 📌 Seguimiento automático activado para ${userPhone}`);
    
    return { success: true, leadId: saved?.id || code };
  } catch (error) {
    console.error('[ALUNA-PROFORMA] ❌ Error guardando lead:', error.message);
    return { success: false };
  }
}
