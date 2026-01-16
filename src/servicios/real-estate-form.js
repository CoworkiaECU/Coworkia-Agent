/**
 * 🏡 PAULA - PropElite Real Estate Form Wrapper
 * 
 * Maneja el proceso de búsqueda de propiedades:
 * 1. Recopila tipo de operación (compra, venta, alquiler)
 * 2. Recopila tipo de propiedad y ubicación
 * 3. Recopila presupuesto y preferencias
 * 4. Recopila datos de contacto
 * 5. Genera mensaje de confirmación con resumen
 * 
 * DIFERENCIAS con otros agentes:
 * - No usa fotos ni AI Vision (propiedades se muestran después)
 * - No calcula precio automático (asesoría gratuita)
 * - No crea evento de calendario inmediato (visitas se coordinan después)
 * - No requiere fecha específica (proceso largo: 30-90 días)
 * - Focus en match perfecto entre necesidad y propiedad
 */

import { processGenericFormMessage } from './generic-form-handler.js';

/**
 * 🎯 Procesa el formulario inmobiliario de Paula
 * 
 * LÓGICA ESPECIAL:
 * 1. Detecta país (Ecuador vs Rep. Dominicana)
 * 2. Valida ciudad según país
 * 3. Recopila presupuesto y preferencias
 * 4. NO requiere fotos (Paula muestra opciones después)
 * 5. Genera resumen de búsqueda deseada
 * 6. Al confirmar con SI: Guarda lead y agenda primera visita
 */
export async function processRealEstateForm(userId, message, userProfile) {
  return await processGenericFormMessage(userId, message, 'PAULA');
}

export default {
  processRealEstateForm
};
