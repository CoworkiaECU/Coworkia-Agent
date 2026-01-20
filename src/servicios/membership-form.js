/**
 * 💼 ALUNA - Formulario de Membresías
 * 
 * Wrapper simple que conecta el endpoint de wassenger.js
 * con el sistema genérico de formularios.
 * 
 * Flujo:
 * 1. Usuario muestra interés en membresía
 * 2. Sistema activa formulario progresivo
 * 3. Recopila datos necesarios
 * 4. Genera resumen para confirmación
 * 5. Usuario confirma con SI
 * 6. Se ejecuta membership-confirmation.js
 */

import { processGenericForm } from './generic-form-handler.js';

/**
 * Procesa formulario de membresía para Aluna
 * @param {string} userId - Teléfono del usuario (+593...)
 * @param {string} message - Mensaje del usuario
 * @param {Object} profile - Perfil del usuario
 * @returns {Object} Estado del formulario
 */
export async function processMembershipForm(userId, message, profile) {
  return await processGenericForm(userId, message, profile, 'ALUNA');
}

/**
 * Re-exporta getPendingConfirmation para mantener compatibilidad
 * con wassenger.js que ya lo importa
 */
export { getPendingConfirmation } from './reservation-state.js';
