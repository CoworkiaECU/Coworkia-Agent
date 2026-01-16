/**
 * 🎯 ENZO - MarketingLab Project Form Wrapper
 * 
 * Maneja el proceso de consultoría de marketing digital:
 * 1. Recopila tipo de proyecto (campaña, IA, software, estrategia)
 * 2. Recopila datos de la empresa (nombre, email, teléfono)
 * 3. Recopila presupuesto aproximado
 * 4. Recopila nivel de urgencia
 * 5. Recopila descripción del reto/objetivo
 * 6. Genera mensaje de confirmación con resumen
 * 
 * DIFERENCIAS con otros agentes:
 * - No usa fotos ni AI Vision
 * - No calcula cotización automática
 * - No valida rangos de valores
 * - Consultoría inicial GRATUITA
 * - Proyectos se cotizan después según alcance
 */

import { processGenericFormMessage } from './generic-form-handler.js';

/**
 * 🎯 Procesa el formulario de marketing de Enzo
 * 
 * LÓGICA ESPECIAL:
 * 1. Detecta tipo de proyecto automáticamente
 * 2. Recopila datos progresivamente
 * 3. No requiere fotos
 * 4. No calcula precio (se cotiza después)
 * 5. Agenda consultoría inicial GRATUITA al confirmar
 */
export async function processMarketingForm(userId, message, userProfile) {
  return await processGenericFormMessage(userId, message, 'ENZO');
}

export default {
  processMarketingForm
};
