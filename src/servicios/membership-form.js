/**
 * 💼 ALUNA - Coworkia Membership Form Wrapper
 * 
 * Maneja el proceso de venta de membresías:
 * 1. Recopila tipo de membresía deseada
 * 2. Recopila fecha de inicio preferida
 * 3. Recopila datos de contacto
 * 4. Genera mensaje de confirmación con resumen
 * 5. Al confirmar: Guarda lead, envía email a admin, agenda tour
 * 
 * DIFERENCIAS con otros agentes:
 * - No usa fotos ni AI Vision (es venta de espacio)
 * - No calcula precio (precios fijos por plan)
 * - Agenda tour del espacio (visita presencial obligatoria)
 * - Focus en cerrar venta y agendar primera visita
 */

import { processGenericFormMessage } from './generic-form-handler.js';

/**
 * 🎯 Procesa el formulario de membresías de Aluna
 * 
 * LÓGICA ESPECIAL:
 * 1. Detecta tipo de membresía (Plan 10, Plan 20, Oficina Ejecutiva, Oficina Virtual)
 * 2. Valida fecha inicio (debe ser futuro o max 30 días)
 * 3. Recopila datos de contacto completos
 * 4. Genera resumen con precio y beneficios
 * 5. Al confirmar con SI: Guarda lead y agenda tour
 */
export async function processMembershipForm(userId, message, userProfile) {
  return await processGenericFormMessage(userId, message, 'ALUNA');
}

export default {
  processMembershipForm
};
