/**
 * 💜 ALUNA - Flujo Completo de Membresías (PRE-LLM)
 * 
 * Arquitectura: Similar a Aurora Flow
 * - Detecta keywords ANTES del LLM
 * - Activa formulario progresivo
 * - Recopila datos (plan, nombre, email)
 * - Envía proforma automáticamente
 * - Soft-close sin presión
 * 
 * CRÍTICO: Este módulo se ejecuta PRE-LLM para evitar que el modelo
 * responda conversacionalmente sin activar el formulario.
 * 
 * Created: 20 Mar 2026 - Refactorización v981
 */

import { processMembershipForm } from './membership-form.js';
import { sendAlunaProforma, saveAlunaLeadFromProforma, normalizePlanKey } from './aluna-proforma-email.js';
import { getAgentForm, saveAgentForm, clearAgentForm } from './agent-form-manager.js';
import { trackAlunaProspect, captureAlunaLeadFromKeywords } from '../database/alunaRepository.js';
import { enviarWhatsApp } from '../wassenger/wassenger-service.js';
import { saveConversationMessage } from '../database/conversationRepository.js';
import { saveInteraction } from '../database/interactionRepository.js';

/**
 * Detecta si el mensaje muestra interés en membresías
 * @param {string} processedText - Mensaje del usuario (ya procesado)
 * @returns {boolean} true si debe activar el flujo de membresía
 */
export function detectMembershipInterest(processedText) {
  if (!processedText) return false;

  const patterns = {
    // Verbo de acción + plan/membresía - ✅ FIX: \w* acepta tildes
    accionPlan: /\b(quiero|me interesa|necesito|busco|solicito|env[ií]ame|m[aá]ndame|cotiz\w*|proforma|informaci[oó]n|detalles|beneficios|planes|tarifas)\b.*\b(plan|membres[ií]a|oficina|espacio|hot\s*desk|coworking)\b/i,
    
    // Mención directa de plan específico
    planNumero: /\bplan\s*(10|20|diez|veinte|mensual|anual)\b/i,
    
    // Oficina virtual
    oficinaVirtual: /\b(oficina\s*virtual)\b/i,
    
    // Petición de cotización - ✅ FIX: \w* acepta tildes
    cotizacion: /\b(cot[ií]z\w*|env[ií]ame\s+(?:la\s+)?(?:cotizaci[oó]n|proforma|informaci[oó]n|detalles|beneficios)|manda\s*(?:me\s+)?(?:la\s+)?(?:cotizaci[oó]n|proforma))\b/i,
    
    // Detección explícita "por mail/email"
    porMail: /\b(por|v[ií]a)\s+(mail|email|correo)\b/i
  };

  return Object.values(patterns).some(regex => regex.test(processedText));
}

/**
 * Guards: Excluir mensajes que NO deben activar formulario
 * @param {string} processedText - Mensaje del usuario
 * @param {Object} currentForm - Formulario activo (si existe)
 * @returns {Object} { shouldExclude, reason }
 */
function checkGuards(processedText, currentForm) {
  // 🛡️ GUARD 1: Quejas de entrega
  const isComplaint = /\b(no me llega|no lleg[oó]|no funciona|no lo recib[ií]|no recib[ií]|no envió|no envio|nunca lleg[oó]|no llegó|no me llegó|no arrib[oó])\b/i.test(processedText);
  if (isComplaint) {
    return { shouldExclude: true, reason: 'complaint' };
  }

  // 🛡️ GUARD 2: Afirmaciones vacías sin datos de membresía
  const isEmptyAffirmation = /^(si|sí|sip|ok|okay|dale|claro|bueno|bien|perfecto|entendido|gracias|de acuerdo)[,!.]*\s*(por favor)?[,!.]*$/i.test(processedText.trim());
  const formHasNoData = !currentForm?.data?.membershipType && !currentForm?.data?.email;
  if (isEmptyAffirmation && formHasNoData) {
    return { shouldExclude: true, reason: 'empty_affirmation' };
  }

  // 🛡️ GUARD 3: Keywords de Aurora con form activo → handoff
  const auroraKeywords = ['hot desk', 'day pass', 'reserva', 'reservar', 'sala', 'reunión', 'reunion', 'pagar', 'pago', 'transferencia', 'día gratis', 'dia gratis'];
  const hasAuroraKeyword = auroraKeywords.some(k => processedText.toLowerCase().includes(k));
  if (hasAuroraKeyword) {
    return { shouldExclude: true, reason: 'aurora_handoff' };
  }

  return { shouldExclude: false };
}

/**
 * Flujo principal de membresías - PRE-LLM
 * @param {string} userId - Teléfono del usuario
 * @param {string} processedText - Mensaje procesado
 * @param {string} rawText - Mensaje original
 * @param {Object} profile - Perfil del usuario
 * @param {Object} envelope - Metadata del mensaje
 * @returns {Object} { handled, reply } - handled=true significa que el flujo manejó completamente el mensaje
 */
export async function processAlunaMembershipFlow(userId, processedText, rawText, profile, envelope) {
  const userName = profile?.name || 'Cliente';

  // 📋 PASO 1: Verificar formulario activo
  const currentForm = await getAgentForm(userId, 'ALUNA').catch(() => null);
  const hasActiveForm = !!currentForm;

  // 🔍 PASO 2: Detectar interés en membresías
  const membershipInterest = detectMembershipInterest(processedText);

  console.log('[ALUNA-FLOW] 🔍 Detección:', {
    userId: userId.substring(0, 15) + '...',
    membershipInterest,
    hasActiveForm,
    processedText: processedText?.substring(0, 80)
  });

  // 🛡️ PASO 3: Aplicar guards
  if (membershipInterest || hasActiveForm) {
    const guard = checkGuards(processedText, currentForm);
    
    if (guard.shouldExclude) {
      console.log(`[ALUNA-FLOW] 🛡️ Guard activado: ${guard.reason}`);
      
      // Limpiar formulario según el guard
      if (guard.reason === 'complaint' || guard.reason === 'empty_affirmation') {
        await clearAgentForm(userId, 'ALUNA');
        console.log('[ALUNA-FLOW] 🧹 Formulario limpiado por guard');
      }
      
      if (guard.reason === 'aurora_handoff') {
        await clearAgentForm(userId, 'ALUNA');
        console.log('[ALUNA-FLOW] 🔄 Handoff a Aurora - formulario limpiado');
      }
      
      // No manejamos el mensaje - deja que el orquestador decida
      return { handled: false };
    }
  }

  // ❌ PASO 4: Si no hay interés ni form activo → no hacemos nada
  if (!membershipInterest && !hasActiveForm) {
    return { handled: false };
  }

  // ✅ PASO 5: Activar flujo de membresía
  console.log('[ALUNA-FLOW] 💼 Activando formulario de membresía');

  // 📌 Registrar prospecto para follow-up automático (no bloqueante)
  trackAlunaProspect(userId, userName, null).catch(() => {});
  
  // 🎯 Capturar lead en dashboard si detecta keywords (no bloqueante)
  captureAlunaLeadFromKeywords(userId, userName, processedText).catch(() => {});

  try {
    // 📝 Procesar formulario progresivo
    const formResult = await processMembershipForm(userId, processedText, profile);
    formResult.userMessage = rawText;

    // 💜 PASO 6: Si formulario está completo (plan + email) → ENVIAR PROFORMA
    if (formResult.form?.data) {
      const fd = formResult.form.data;
      const proformaName = fd.fullName || userName || 'Cliente';
      
      // ✅ Tenemos plan y email → enviar automáticamente
      if (fd.membershipType && fd.email && !fd.proformaSent) {
        try {
          const planKey = normalizePlanKey(fd.membershipType);
          const proResult = await sendAlunaProforma({
            clientName: proformaName,
            clientEmail: fd.email,
            planKey,
            fromAdmin: false
          });

          if (proResult.success) {
            // Marcar como enviado
            fd.proformaSent = true;
            formResult.form.data.proformaSent = true;
            
            // Guardar lead
            await saveAlunaLeadFromProforma({
              userId,
              clientName: proformaName,
              clientEmail: fd.email,
              planKey,
              phone: fd.phone || null,
              proformaCode: proResult.proformaCode,
              fromAdmin: false
            });

            console.log(`[ALUNA-FLOW] 💜 Proforma enviada: ${fd.email} (${proResult.planName})`);

            // 🎯 SOFT-CLOSE: Mensaje amable sin presión
            const softCloseMessage = `📧 ¡Listo, ${proformaName}! Te envié toda la información detallada de *${proResult.planName}* a ${fd.email}.

Revisa tu bandeja de entrada (y la carpeta de spam, por las dudas). 😊

Si después de revisar tienes alguna pregunta o decides activar tu membresía, simplemente escríbeme @aluna y con gusto te ayudo.

¡Que tengas un excelente día! ✨`;

            await enviarWhatsApp(userId, softCloseMessage);
            await saveConversationMessage(userId, {
              role: 'assistant',
              content: `Proforma de ${proResult.planName} enviada a ${fd.email}. Cliente puede revisar con calma.`,
              agent: 'ALUNA'
            });

            // 🧹 LIMPIAR FORMULARIO - No seguir pidiendo datos
            await clearAgentForm(userId, 'ALUNA');
            console.log('[ALUNA-FLOW] 🧹 Formulario limpiado después de enviar email - soft-close activado');

            // ✅ HANDLED - Terminamos aquí, confiamos en follow-ups automáticos
            return { handled: true, reply: softCloseMessage };
          }
        } catch (proErr) {
          console.error('[ALUNA-FLOW] ⚠️ Error enviando proforma (no crítico):', proErr.message);
          // Continuamos con el flujo normal del formulario
        }
      }
    }

    // 📋 PASO 7: Formulario necesita más datos → enviar pregunta
    if (formResult.needsMoreInfo && formResult.nextQuestion) {
      await enviarWhatsApp(userId, formResult.nextQuestion);
      await saveConversationMessage(userId, {
        role: 'assistant',
        content: formResult.nextQuestion,
        agent: 'ALUNA'
      });

      // Guardar form con actualizaciones
      if (formResult.form && formResult.updates && Object.keys(formResult.updates).length > 0) {
        await saveAgentForm(userId, 'ALUNA', formResult.form.toJSON(), 120);
      }

      await saveInteraction({
        userId,
        agent: 'aluna',
        agentName: 'ALUNA',
        intentReason: 'membership_form_progress',
        input: processedText.substring(0, 500),
        output: formResult.nextQuestion,
        meta: { envelope, formComplete: false }
      });

      return { handled: true, reply: formResult.nextQuestion };
    }

    // 🎯 PASO 8: Manejo de resultado del formulario (validaciones, errores, etc)
    const handleFormResult = (await import('./generic-form-handler.js')).handleFormResult;
    const handled = await handleFormResult(formResult, userId, 'ALUNA', profile);
    
    if (handled) {
      console.log('[ALUNA-FLOW] ✅ Formulario manejado por handleFormResult');
      return { handled: true };
    }

    // Si llegamos aquí, el form no está completo ni necesita más info → dejar que LLM responda
    return { handled: false };

  } catch (error) {
    console.error('[ALUNA-FLOW] ❌ Error procesando formulario:', error);
    // En caso de error, dejamos que el LLM maneje la conversación
    return { handled: false };
  }
}
