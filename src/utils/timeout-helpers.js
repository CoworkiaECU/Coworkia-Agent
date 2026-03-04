/**
 * 🛡️ Timeout Wrapper para operaciones async críticas
 * Previene bloqueos indefinidos con timeout configurables y fallbacks
 */

/**
 * Ejecuta una promesa con timeout
 * @param {Promise} promise - Promesa a ejecutar
 * @param {number} timeoutMs - Timeout en milisegundos
 * @param {string} operationName - Nombre de la operación para logging
 * @param {*} fallbackValue - Valor de fallback si hay timeout
 * @returns {Promise} Resultado de la promesa o fallback
 */
export async function withTimeout(promise, timeoutMs, operationName = 'operation', fallbackValue = null) {
  let timeoutId;
  
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`Timeout: ${operationName} excedió ${timeoutMs}ms`));
    }, timeoutMs);
  });
  
  try {
    const result = await Promise.race([promise, timeoutPromise]);
    clearTimeout(timeoutId);
    return result;
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error.message.includes('Timeout')) {
      console.error(`[TIMEOUT] ⏱️ ${operationName} timeout después de ${timeoutMs}ms`);
      
      if (fallbackValue !== null) {
        console.log(`[TIMEOUT] 🔄 Usando fallback para ${operationName}`);
        return fallbackValue;
      }
    }
    
    throw error;
  }
}

/**
 * Wrapper especializado para loadProfile con fallback INTELIGENTE
 * 
 * Si timeout ocurre, intenta cargar SOLO user básico (query simple)
 * para preservar activeAgent real en vez de usar AURORA default
 * 
 * @param {Function} loadProfileFn - Función loadProfile original
 * @param {string} userId - ID del usuario
 * @param {number} timeoutMs - Timeout en milisegundos (default: 15000ms - aumentado de 5s)
 * @returns {Promise} Perfil cargado o fallback inteligente
 */
export async function loadProfileWithTimeout(loadProfileFn, userId, timeoutMs = 15000) {
  try {
    // Intentar carga completa con timeout aumentado
    const profile = await withTimeout(
      loadProfileFn(userId),
      timeoutMs,
      `loadProfile(${userId})`,
      null // No usar fallback automático
    );
    
    return profile;
  } catch (error) {
    // Si timeout, intentar fallback inteligente
    if (error.message.includes('Timeout')) {
      console.warn(`[TIMEOUT] ⚠️ loadProfile timeout, intentando fallback inteligente para ${userId}`);
      
      try {
        // Importar dinámicamente para evitar circular dependency
        const { default: userRepository } = await import('../database/userRepository.js');
        
        // Cargar SOLO user (query simple y rápida)
        const user = await withTimeout(
          userRepository.findByPhone(userId),
          5000,
          `userRepository.findByPhone(${userId})`,
          null
        );
        
        if (user) {
          console.log(`[TIMEOUT] ✅ Fallback inteligente: activeAgent=${user.active_agent || 'AURORA'} preservado`);
          
          // Retornar perfil mínimo con activeAgent REAL de BD
          return {
            userId: user.phone_number,
            name: user.name,
            email: user.email,
            whatsappDisplayName: user.whatsapp_display_name,
            firstVisit: user.first_visit || false,
            freeTrialUsed: Boolean(user.free_trial_used),
            freeTrialDate: user.free_trial_date || null,
            activeAgent: user.active_agent || 'AURORA', // ✅ Preservar agente real
            preferredLanguage: user.preferred_language || 'es',
            conversationCount: user.conversation_count || 0,
            lastMessageAt: user.last_message_at || new Date(),
            createdAt: user.created_at,
            updatedAt: user.updated_at,
            reservationHistory: [],
            upcomingReservations: [],
            _fallback: 'intelligent', // Flag para monitoreo
            _reason: 'timeout_with_user_query'
          };
        }
      } catch (fallbackError) {
        console.error(`[TIMEOUT] ❌ Fallback inteligente falló:`, fallbackError.message);
      }
    }
    
    // Último recurso: perfil completamente vacío
    console.error(`[TIMEOUT] ❌ Usando perfil vacío por defecto para ${userId}`);
    return {
      userId,
      name: null,
      email: null,
      firstVisit: false,
      freeTrialUsed: true,
      freeTrialDate: null,
      activeAgent: 'AURORA',
      preferredLanguage: 'es',
      conversationCount: 0,
      lastMessageAt: new Date(),
      _fallback: 'empty',
      _reason: 'complete_failure'
    };
  }
}

/**
 * Wrapper para operaciones de base de datos con retry
 * @param {Function} operation - Operación a ejecutar
 * @param {number} maxRetries - Número máximo de reintentos
 * @param {number} timeoutMs - Timeout por intento
 * @param {string} operationName - Nombre para logging
 * @returns {Promise} Resultado de la operación
 */
export async function withRetry(operation, maxRetries = 3, timeoutMs = 5000, operationName = 'db_operation') {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await withTimeout(
        operation(),
        timeoutMs,
        `${operationName} (intento ${attempt}/${maxRetries})`
      );
      
      if (attempt > 1) {
        console.log(`[RETRY] ✅ ${operationName} exitoso en intento ${attempt}`);
      }
      
      return result;
    } catch (error) {
      lastError = error;
      console.warn(`[RETRY] ⚠️ ${operationName} falló (intento ${attempt}/${maxRetries}): ${error.message}`);
      
      // Si no es el último intento, esperar antes de reintentar (backoff exponencial)
      if (attempt < maxRetries) {
        const backoffMs = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        console.log(`[RETRY] 🔄 Reintentando en ${backoffMs}ms...`);
        await new Promise(resolve => setTimeout(resolve, backoffMs));
      }
    }
  }
  
  // Si llegamos aquí, todos los intentos fallaron
  console.error(`[RETRY] ❌ ${operationName} falló después de ${maxRetries} intentos`);
  throw lastError;
}

/**
 * Ejecuta múltiples promesas en paralelo con timeout individual
 * @param {Array<Promise>} promises - Array de promesas
 * @param {number} timeoutMs - Timeout por promesa
 * @param {string} operationName - Nombre para logging
 * @returns {Promise<Array>} Array con resultados (null si falla)
 */
export async function allWithTimeout(promises, timeoutMs, operationName = 'parallel_operations') {
  const startTime = Date.now();
  
  const wrappedPromises = promises.map((promise, index) =>
    withTimeout(promise, timeoutMs, `${operationName}[${index}]`)
      .catch(error => {
        console.warn(`[TIMEOUT] ⚠️ ${operationName}[${index}] falló:`, error.message);
        return null; // Retornar null en lugar de fallar todo
      })
  );
  
  const results = await Promise.all(wrappedPromises);
  const elapsedMs = Date.now() - startTime;
  
  const successCount = results.filter(r => r !== null).length;
  console.log(`[TIMEOUT] ✅ ${operationName}: ${successCount}/${promises.length} exitosos en ${elapsedMs}ms`);
  
  return results;
}

export default {
  withTimeout,
  loadProfileWithTimeout,
  withRetry,
  allWithTimeout
};
