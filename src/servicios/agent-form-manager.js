/**
 * 🎯 Agent Form Manager - Sistema unificado de formularios multi-agente
 * 
 * Reemplaza el sistema dual de partial_forms y pending_confirmations
 * con una tabla única agent_forms que soporta múltiples agentes simultáneamente.
 * 
 * Arquitectura:
 * - PK = (user_phone + agent_type): cada usuario puede tener 1 form por agente
 * - JSONB flexible: cada agente usa los campos que necesita
 * - Contexto preservado: cambiar agente NO pierde datos del anterior
 * 
 * @author Coworkia Team
 * @version 1.0.0 - Sistema unificado
 */

import databaseService from '../database/database.js';

/**
 * 💾 Guardar o actualizar formulario de un agente específico
 * @param {string} userId - Teléfono del usuario (ej: +593987770788)
 * @param {string} agentType - Tipo de agente (AURORA, ALUNA, ENZO, etc.)
 * @param {Object} formData - Datos del formulario (objeto plano, se convierte a JSON)
 * @param {number} ttlMinutes - Tiempo de vida del formulario en minutos (default: 120)
 * @returns {Promise<boolean>} true si guardó exitosamente
 */
export async function saveAgentForm(userId, agentType, formData, ttlMinutes = 120) {
  await databaseService.ensureInitialized();
  
  try {
    await databaseService.run(
      `INSERT INTO agent_forms (user_phone, agent_type, form_data, expires_at, updated_at)
       VALUES ($1, $2, $3, NOW() + INTERVAL '${ttlMinutes} minutes', NOW())
       ON CONFLICT (user_phone, agent_type) 
       DO UPDATE SET 
         form_data = EXCLUDED.form_data,
         updated_at = NOW(),
         expires_at = EXCLUDED.expires_at,
         is_active = TRUE,
         cancelled_at = NULL`,
      [userId, agentType, JSON.stringify(formData)]
    );
    
    console.log(`[AGENT-FORM] 💾 Form guardado: ${agentType} para ${userId}`);
    return true;
  } catch (error) {
    console.error(`[AGENT-FORM] ❌ Error guardando form ${agentType}:`, error);
    return false;
  }
}

/**
 * 📂 Obtener formulario activo de un agente específico
 * @param {string} userId - Teléfono del usuario
 * @param {string} agentType - Tipo de agente (AURORA, ALUNA, etc.)
 * @returns {Promise<Object|null>} Datos del formulario o null si no existe/expiró
 */
export async function getAgentForm(userId, agentType) {
  await databaseService.ensureInitialized();
  
  try {
    const row = await databaseService.get(
      `SELECT form_data, form_progress, created_at, updated_at, expires_at 
       FROM agent_forms 
       WHERE user_phone = $1 
         AND agent_type = $2 
         AND is_active = TRUE
         AND (expires_at IS NULL OR expires_at > NOW())
         AND cancelled_at IS NULL`,
      [userId, agentType]
    );
    
    if (!row) {
      console.log(`[AGENT-FORM] 📭 No hay form activo de ${agentType} para ${userId}`);
      return null;
    }
    
    console.log(`[AGENT-FORM] 📂 Form cargado: ${agentType} para ${userId}`);
    return typeof row.form_data === 'string' 
      ? JSON.parse(row.form_data) 
      : row.form_data;
  } catch (error) {
    console.error(`[AGENT-FORM] ❌ Error obteniendo form ${agentType}:`, error);
    return null;
  }
}

/**
 * 📋 Obtener TODOS los formularios activos de un usuario
 * @param {string} userId - Teléfono del usuario
 * @returns {Promise<Object>} Objeto con agente como key: { AURORA: {...}, ALUNA: {...} }
 */
export async function getAllUserForms(userId) {
  await databaseService.ensureInitialized();
  
  try {
    const rows = await databaseService.all(
      `SELECT agent_type, form_data, form_progress 
       FROM agent_forms 
       WHERE user_phone = $1 
         AND is_active = TRUE
         AND (expires_at IS NULL OR expires_at > NOW())
         AND cancelled_at IS NULL
       ORDER BY updated_at DESC`,
      [userId]
    );
    
    const forms = {};
    for (const row of rows) {
      const formData = typeof row.form_data === 'string' 
        ? JSON.parse(row.form_data) 
        : row.form_data;
      forms[row.agent_type] = formData;
    }
    
    console.log(`[AGENT-FORM] 📋 ${Object.keys(forms).length} forms activos para ${userId}`);
    return forms;
  } catch (error) {
    console.error(`[AGENT-FORM] ❌ Error obteniendo forms de usuario:`, error);
    return {};
  }
}

/**
 * 🗑️ Eliminar formulario de un agente específico
 * @param {string} userId - Teléfono del usuario
 * @param {string} agentType - Tipo de agente
 * @returns {Promise<boolean>} true si eliminó exitosamente
 */
export async function clearAgentForm(userId, agentType) {
  await databaseService.ensureInitialized();
  
  try {
    await databaseService.run(
      `DELETE FROM agent_forms 
       WHERE user_phone = $1 AND agent_type = $2`,
      [userId, agentType]
    );
    
    console.log(`[AGENT-FORM] 🗑️ Form eliminado: ${agentType} para ${userId}`);
    return true;
  } catch (error) {
    console.error(`[AGENT-FORM] ❌ Error eliminando form ${agentType}:`, error);
    return false;
  }
}

/**
 * ❌ Cancelar formulario (marcar como cancelado sin eliminar)
 * @param {string} userId - Teléfono del usuario
 * @param {string} agentType - Tipo de agente
 * @param {string} reason - Razón de cancelación (opcional)
 * @returns {Promise<boolean>} true si canceló exitosamente
 */
export async function cancelAgentForm(userId, agentType, reason = null) {
  await databaseService.ensureInitialized();
  
  try {
    await databaseService.run(
      `UPDATE agent_forms 
       SET is_active = FALSE, 
           cancelled_at = NOW(),
           form_progress = $3
       WHERE user_phone = $1 AND agent_type = $2`,
      [userId, agentType, reason || 'cancelled_by_user']
    );
    
    console.log(`[AGENT-FORM] ❌ Form cancelado: ${agentType} para ${userId} - ${reason}`);
    return true;
  } catch (error) {
    console.error(`[AGENT-FORM] ❌ Error cancelando form ${agentType}:`, error);
    return false;
  }
}

/**
 * 🧹 Limpiar formularios expirados (mantenimiento automático)
 * @returns {Promise<number>} Cantidad de formularios limpiados
 */
export async function cleanupExpiredForms() {
  await databaseService.ensureInitialized();
  
  try {
    const result = await databaseService.run(
      `DELETE FROM agent_forms 
       WHERE expires_at IS NOT NULL 
         AND expires_at < NOW()`
    );
    
    const count = result?.changes || 0;
    if (count > 0) {
      console.log(`[AGENT-FORM] 🧹 ${count} forms expirados eliminados`);
    }
    return count;
  } catch (error) {
    console.error(`[AGENT-FORM] ❌ Error limpiando forms expirados:`, error);
    return 0;
  }
}

/**
 * 🔄 Actualizar progreso del formulario
 * @param {string} userId - Teléfono del usuario
 * @param {string} agentType - Tipo de agente
 * @param {string} progress - Estado del progreso (ej: 'awaiting_confirmation', 'collecting_email')
 * @returns {Promise<boolean>} true si actualizó exitosamente
 */
export async function updateFormProgress(userId, agentType, progress) {
  await databaseService.ensureInitialized();
  
  try {
    await databaseService.run(
      `UPDATE agent_forms 
       SET form_progress = $3, updated_at = NOW()
       WHERE user_phone = $1 AND agent_type = $2`,
      [userId, agentType, progress]
    );
    
    console.log(`[AGENT-FORM] 🔄 Progreso actualizado: ${agentType} → ${progress}`);
    return true;
  } catch (error) {
    console.error(`[AGENT-FORM] ❌ Error actualizando progreso:`, error);
    return false;
  }
}
