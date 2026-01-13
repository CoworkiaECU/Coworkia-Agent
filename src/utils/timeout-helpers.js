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
 * Wrapper especializado para loadProfile con fallback
 * @param {Function} loadProfileFn - Función loadProfile original
 * @param {string} userId - ID del usuario
 * @param {number} timeoutMs - Timeout en milisegundos (default: 5000ms)
 * @returns {Promise} Perfil cargado o perfil vacío como fallback
 */
export async function loadProfileWithTimeout(loadProfileFn, userId, timeoutMs = 5000) {
  const fallbackProfile = {
    userId,
    name: null,
    email: null,
    firstVisit: true,
    activeAgent: 'AURORA',
    preferredLanguage: 'es',
    conversationCount: 0,
    lastMessageAt: new Date(),
    _fallback: true, // Flag para indicar que es fallback
    _reason: 'timeout'
  };
  
  try {
    const profile = await withTimeout(
      loadProfileFn(userId),
      timeoutMs,
      `loadProfile(${userId})`,
      fallbackProfile
    );
    
    // Si es fallback, loggear para monitoreo
    if (profile._fallback) {
      console.warn(`[TIMEOUT] ⚠️ loadProfile timeout, usando perfil vacío para ${userId}`);
    }
    
    return profile;
  } catch (error) {
    console.error(`[TIMEOUT] ❌ Error en loadProfile:`, error.message);
    return fallbackProfile;
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
