/**
 * 📸 AXEL PHOTO SESSION REPOSITORY
 * Maneja persistencia de sesiones de fotos en PostgreSQL
 * - Backup de URLs de Wassenger
 * - Recuperación de sesiones interrumpidas
 * - Auto-limpieza después de 15 días
 */

import postgresAdapter from './postgres-adapter.js';

/**
 * 💾 Guardar o actualizar sesión de fotos
 */
export async function savePhotoSession(userPhone, photoUrls) {
  const pool = postgresAdapter.pool;
  if (!pool) throw new Error('PostgreSQL pool no inicializado');
  
  const client = await pool.connect();
  try {
    await client.query(`
      INSERT INTO axel_photo_sessions (
        user_phone,
        photo_urls,
        photo_count,
        session_status,
        last_photo_at
      ) VALUES ($1, $2, $3, 'active', CURRENT_TIMESTAMP)
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
  } finally {
    client.release();
  }
}

/**
 * 🔍 Obtener sesión activa de fotos
 */
export async function getActivePhotoSession(userPhone) {
  const pool = postgresAdapter.pool;
  if (!pool) throw new Error('PostgreSQL pool no inicializado');
  
  const client = await pool.connect();
  try {
    const result = await client.query(`
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
      WHERE user_phone = $1
        AND session_status = 'active'
        AND expires_at > CURRENT_TIMESTAMP
    `, [userPhone]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    const session = result.rows[0];
    return {
      userPhone: session.user_phone,
      photoUrls: session.photo_urls, // JSONB ya viene parseado
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
  } finally {
    client.release();
  }
}

/**
 * ✅ Marcar sesión como completada
 */
export async function completePhotoSession(userPhone, quoteCode) {
  const pool = postgresAdapter.pool;
  if (!pool) throw new Error('PostgreSQL pool no inicializado');
  
  const client = await pool.connect();
  try {
    await client.query(`
      UPDATE axel_photo_sessions
      SET session_status = 'completed',
          quote_code = $1
      WHERE user_phone = $2
    `, [quoteCode, userPhone]);
    
    console.log(`[AXEL-PHOTO-DB] ✅ Sesión completada: ${userPhone} → ${quoteCode}`);
    return { success: true };
  } catch (error) {
    console.error('[AXEL-PHOTO-DB] ❌ Error completando sesión:', error);
    return { success: false, error: error.message };
  } finally {
    client.release();
  }
}

/**
 * 🗑️ Eliminar sesión (cancelar)
 */
export async function deletePhotoSession(userPhone) {
  const pool = postgresAdapter.pool;
  if (!pool) throw new Error('PostgreSQL pool no inicializado');
  
  const client = await pool.connect();
  try {
    await client.query(`
      DELETE FROM axel_photo_sessions
      WHERE user_phone = $1
    `, [userPhone]);
    
    console.log(`[AXEL-PHOTO-DB] 🗑️ Sesión eliminada: ${userPhone}`);
    return { success: true };
  } catch (error) {
    console.error('[AXEL-PHOTO-DB] ❌ Error eliminando sesión:', error);
    return { success: false, error: error.message };
  } finally {
    client.release();
  }
}

/**
 * 🧹 Limpiar sesiones expiradas (llamar desde cron diario)
 */
export async function cleanupExpiredSessions() {
  const pool = postgresAdapter.pool;
  if (!pool) throw new Error('PostgreSQL pool no inicializado');
  
  const client = await pool.connect();
  try {
    const result = await client.query(`
      DELETE FROM axel_photo_sessions
      WHERE expires_at < CURRENT_TIMESTAMP
        AND session_status != 'completed'
    `);
    
    const deleted = result.rowCount || 0;
    console.log(`[AXEL-PHOTO-DB] 🧹 Limpieza: ${deleted} sesiones expiradas eliminadas`);
    return { success: true, deleted };
  } catch (error) {
    console.error('[AXEL-PHOTO-DB] ❌ Error en limpieza:', error);
    return { success: false, error: error.message };
  } finally {
    client.release();
  }
}

/**
 * 📊 Obtener estadísticas
 */
export async function getPhotoSessionStats() {
  const pool = postgresAdapter.pool;
  if (!pool) throw new Error('PostgreSQL pool no inicializado');
  
  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN session_status = 'active' THEN 1 END) as active,
        COUNT(CASE WHEN session_status = 'completed' THEN 1 END) as completed,
        COUNT(CASE WHEN expires_at < CURRENT_TIMESTAMP THEN 1 END) as expired
      FROM axel_photo_sessions
    `);
    
    return result.rows[0];
  } catch (error) {
    console.error('[AXEL-PHOTO-DB] ❌ Error obteniendo stats:', error);
    return { total: 0, active: 0, completed: 0, expired: 0 };
  } finally {
    client.release();
  }
}

// Exportar también como default para compatibilidad
export default {
  savePhotoSession,
  getActivePhotoSession,
  completePhotoSession,
  deletePhotoSession,
  cleanupExpiredSessions,
  getPhotoSessionStats
};
};
