/**
 * 🔨 AXEL - PaintBull Collision Repair Form Wrapper
 * 
 * Maneja el proceso de cotización de reparación de colisiones:
 * 1. Recopila fotos del daño (con delay de 30 segundos)
 * 2. Analiza fotos con AI Vision
 * 3. Recopila datos del vehículo (marca, modelo, año)
 * 4. Recopila datos de contacto (nombre, email, teléfono)
 * 5. Genera mensaje de confirmación con resumen
 * 
 * DIFERENCIAS con Insurance:
 * - No hay validación de ciudad ni rango de valores
 * - No calcula prima, solo presenta análisis de daño
 * - Cotización detallada se genera DESPUÉS de confirmar
 */

import { processGenericFormMessage } from './generic-form-handler.js';

/**
 * 🎯 Procesa el formulario de colisiones de Axel
 * 
 * LÓGICA ESPECIAL:
 * 1. Recopila fotos con delay de 30 segundos
 * 2. Analiza fotos con AI Vision para detectar severidad
 * 3. Recopila marca, modelo, año progresivamente
 * 4. Genera resumen con análisis preliminar
 * 5. La cotización detallada se hace al confirmar con SI
 */
export async function processCollisionForm(userId, message, userProfile) {
  return await processGenericFormMessage(userId, message, 'AXEL');
}

export default {
  processCollisionForm
};
