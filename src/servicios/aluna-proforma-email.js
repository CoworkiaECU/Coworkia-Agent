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

// ──────────────────────────────────────────────
// 📋 Datos de los planes (fuente de verdad)
// ──────────────────────────────────────────────
export const PLAN_DATA = {
  plan10: {
    key: 'plan10',
    name: 'Plan 10',
    price: '$140 USD / mes',
    days: '10 días + 1 GRATIS = 11 días al mes de Hot Desk',
    hours: 'Jornada completa en cada visita (horario de oficina)',
    ideal: 'Freelancers y profesionales independientes con horario flexible',
    benefits: [
      'Locker o cajonera privada (a elegir)',
      '2 invitados gratis al mes (registro obligatorio)',
      '2 usos de Sala de Reuniones por mes (2 horas c/u, vía Aurora)',
      'WiFi 300 Mbps + café ilimitado incluido',
      'Impresiones básicas incluidas',
      'Secretaria Virtual con IA (en contratos de 9+ meses)',
    ],
  },
  plan20: {
    key: 'plan20',
    name: 'Plan 20',
    price: '$250 USD / mes',
    days: '20 días + 2 GRATIS = 22 días al mes de Hot Desk',
    hours: 'Jornada completa en cada visita (horario de oficina)',
    ideal: 'Profesionales con rutina de trabajo regular que necesitan presencia constante',
    benefits: [
      'Locker o cajonera privada (a elegir)',
      '4 invitados gratis al mes (registro obligatorio)',
      '4 usos de Sala de Reuniones por mes (2 horas c/u, vía Aurora)',
      'WiFi 300 Mbps + café ilimitado incluido',
      'Impresiones básicas incluidas',
      'Secretaria Virtual con IA (en contratos de 9+ meses)',
    ],
  },
  oficinavirtual: {
    key: 'oficinavirtual',
    name: 'Oficina Virtual',
    price: '$365 USD / año ($1 por día equivalente)',
    days: 'Dirección comercial oficial — sin acceso físico diario',
    hours: 'Sala de Reuniones incluida: 1 vez al mes por 2 horas',
    ideal: 'Emprendedores remotos, startups o empresas extranjeras que necesitan presencia legal en Quito',
    benefits: [
      'Dirección comercial oficial (Whymper 403, Quito)',
      'Recepción y notificación de correspondencia física',
      'Cumplimiento legal con SRI y entidades de control',
      'Sala de Reuniones incluida (1 x mes, 2 horas)',
      'Acceso a red de contactos y comunidad Coworkia',
    ],
  },
  salareuniones: {
    key: 'salareuniones',
    name: 'Sala de Reuniones',
    price: '$39 USD / sesión',
    days: 'Reserva por sesión individual — sin contrato',
    hours: '2 horas por sesión, capacidad: 3-4 personas',
    ideal: 'Reuniones de trabajo, presentaciones, entrevistas o workshops puntuales',
    benefits: [
      'Pantalla para presentaciones incluida',
      'WiFi de alta velocidad',
      'Espacio privado y profesional',
      'Reserva previa vía Aurora (WhatsApp)',
      'Sin contrato ni permanencia',
    ],
  },
};

/**
 * 🔧 Normaliza el texto del plan al key interno
 * Acepta variaciones: "plan10", "Plan 10", "plan mensual", "oficina", etc.
 */
export function normalizePlanKey(rawPlan) {
  if (!rawPlan) return 'plan10';
  const t = rawPlan.toLowerCase().replace(/\s+/g, '');
  if (t.includes('20')) return 'plan20';
  if (t.includes('10')) return 'plan10';
  if (t.includes('oficina') || t.includes('virtual') || t.includes('ov')) return 'oficinavirtual';
  if (t.includes('sala') || t.includes('reunion')) return 'salareuniones';
  // Fallback: si dice "plan" sin número, Plan 10 es el más popular
  if (t.includes('plan') || t.includes('mensual') || t.includes('membresia')) return 'plan10';
  return 'plan10';
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
      coworkiaWhatsApp: '593994837117',
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
    await trackAlunaProspect(userPhone, clientName, plan?.name || planKey);
    console.log(`[ALUNA-PROFORMA] 📌 Seguimiento automático activado para ${userPhone}`);
    
    return { success: true, leadId: saved?.id || code };
  } catch (error) {
    console.error('[ALUNA-PROFORMA] ❌ Error guardando lead:', error.message);
    return { success: false };
  }
}
