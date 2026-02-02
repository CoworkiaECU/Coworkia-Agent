/**
 * 📸 AXEL PHOTO SESSION REPOSITORY
 * Maneja persistencia de sesiones de fotos en PostgreSQL
 * - Backup de URLs de Wassenger
 * - Recuperación de sesiones interrumpidas
 * - Auto-limpieza después de 15 días
 */

import { getDb } from './postgres-adapter.js';

/**
 * 💾 Guardar o actualizar sesión de fotos
 */
export async function savePhotoSession(userPhone, photoUrls) {
  const db = getDb();
  
  try {
    await db.run(`
      INSERT INTO axel_photo_sessions (
        user_phone,
        photo_urls,
        photo_count,
        session_status,
        last_photo_at
      ) VALUES (?, ?, ?, 'active', CURRENT_TIMESTAMP)
      ON CONFLICT (user_phone) DO UPDATE SET
        photo_urls = excluded.photo_urls,
        photo_count = excluded.photo_count,
        last_photo_at = CURRENT_TIMESTAMP
    `, [
      userPhone,
      JSON.stringify(photoUrls),
      photoUrls.length
    ]);
    
    console.log(`[AXEL-PHOTO-DB] 💾 Sesión guardada: ${userPhone} - ${photoUrls.length} fotos`);
    return { success: true };
  } catch (error) {
    console.error('[AXEL-PHOTO-DB] ❌ Error guardando sesión:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 🔍 Obtener sesión activa de fotos
 */
export async function getActivePhotoSession(userPhone) {
  const db = getDb();
  
  try {
    const session = await db.get(`
      SELECT 
        user_phone,
        photo_urls,
        photo_count,
        session_status,
        quote_code,
        created_at,
        last_photo_at,
        expires_at
      FROM axel_photo_sessions
      WHERE user_phone = ?
        AND session_status = 'active'
        AND expires_at > CURRENT_TIMESTAMP
    `, [userPhone]);
    
    if (!session) {
      return null;
    }
    
    return {
      userPhone: session.user_phone,
      photoUrls: JSON.parse(session.photo_urls),
      photoCount: session.photo_count,
      status: session.session_status,
      quoteCode: session.quote_code,
      createdAt: session.created_at,
      lastPhotoAt: session.last_photo_at,
      expiresAt: session.expires_at
    };
  } catch (error) {
    console.error('[AXEL-PHOTO-DB] ❌ Error obteniendo sesión:', error);
    return null;
  }
}

/**
 * ✅ Marcar sesión como completada
 */
export async function completePhotoSession(userPhone, quoteCode) {
  const db = getDb();
  
  try {
    await db.run(`
      UPDATE axel_photo_sessions
      SET session_status = 'completed',
          quote_code = ?
      WHERE user_phone = ?
    `, [quoteCode, userPhone]);
    
    console.log(`[AXEL-PHOTO-DB] ✅ Sesión completada: ${userPhone} → ${quoteCode}`);
    return { success: true };
  } catch (error) {
    console.error('[AXEL-PHOTO-DB] ❌ Error completando sesión:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 🗑️ Eliminar sesión (cancelar)
 */
export async function deletePhotoSession(userPhone) {
  const db = getDb();
  
  try {
    await db.run(`
      DELETE FROM axel_photo_sessions
      WHERE user_phone = ?
    `, [userPhone]);
    
    console.log(`[AXEL-PHOTO-DB] 🗑️ Sesión eliminada: ${userPhone}`);
    return { success: true };
  } catch (error) {
    console.error('[AXEL-PHOTO-DB] ❌ Error eliminando sesión:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 🧹 Limpiar sesiones expiradas (llamar desde cron diario)
 */
export async function cleanupExpiredSessions() {
  const db = getDb();
  
  try {
    const result = await db.run(`
      DELETE FROM axel_photo_sessions
      WHERE expires_at < CURRENT_TIMESTAMP
        AND session_status != 'completed'
    `);
    
    console.log(`[AXEL-PHOTO-DB] 🧹 Limpieza: ${result.changes || 0} sesiones expiradas eliminadas`);
    return { success: true, deleted: result.changes || 0 };
  } catch (error) {
    console.error('[AXEL-PHOTO-DB] ❌ Error en limpieza:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 📊 Obtener estadísticas
 */
export async function getPhotoSessionStats() {
  const db = getDb();
  
  try {
    const stats = await db.get(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN session_status = 'active' THEN 1 END) as active,
        COUNT(CASE WHEN session_status = 'completed' THEN 1 END) as completed,
        COUNT(CASE WHEN expires_at < CURRENT_TIMESTAMP THEN 1 END) as expired
      FROM axel_photo_sessions
    `);
    
    return stats;
  } catch (error) {
    console.error('[AXEL-PHOTO-DB] ❌ Error obteniendo stats:', error);
    return { total: 0, active: 0, completed: 0, expired: 0 };
  }
}

export default {
  savePhotoSession,
  getActivePhotoSession,
  completePhotoSession,
  deletePhotoSession,
  cleanupExpiredSessions,
  getPhotoSessionStats
};
