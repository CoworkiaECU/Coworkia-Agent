/**
 * ⚖️ GABI - GR Consulting Legal/Accounting Form Wrapper
 * 
 * Maneja el proceso de consultoría legal y contable:
 * 1. Recopila tipo de consulta (contabilidad, legal, RRHH, fiscal, otro)
 * 2. Recopila datos empresa (nombre, RUC opcional, email, teléfono)
 * 3. Recopila descripción del problema/necesidad
 * 4. Recopila nivel de urgencia (urgente 24h, normal 72h, planificación 1 semana+)
 * 5. Genera mensaje de confirmación con resumen
 * 
 * DIFERENCIAS con otros agentes:
 * - RUC es opcional (personas naturales también consultan)
 * - Validación RUC con RapidAPI (si está disponible)
 * - No usa fotos ni AI Vision
 * - No calcula cotización automática
 * - Primera consulta GRATUITA (30 min)
 * - Servicios especializados se cotizan después
 * - Agenda reunión inicial automáticamente
 */

import { processGenericFormMessage } from './generic-form-handler.js';

/**
 * 🎯 Procesa el formulario de consultoría de Gabi
 * 
 * LÓGICA ESPECIAL:
 * 1. Detecta tipo de consulta automáticamente
 * 2. RUC opcional (valida si se proporciona)
 * 3. Recopila datos progresivamente
 * 4. No requiere fotos
 * 5. No calcula precio (primera consulta gratis, resto se cotiza después)
 * 6. Agenda reunión inicial al confirmar (48h después)
 */
export async function processLegalForm(userId, message, userProfile) {
  return await processGenericFormMessage(userId, message, 'GABI');
}

export default {
  processLegalForm
};
