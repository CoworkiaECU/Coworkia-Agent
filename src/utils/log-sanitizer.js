/**
 * 🔒 SANITIZACIÓN DE LOGS - Seguridad
 * 
 * Remueve datos sensibles de URLs y objetos antes de loggear
 */

/**
 * Sanitiza URL removiendo tokens y parámetros sensibles
 */
export function sanitizeUrl(url) {
  if (!url || typeof url !== 'string') return url;
  
  try {
    const urlObj = new URL(url);
    
    // Remover parámetros sensibles
    const sensitiveParams = ['token', 'apiKey', 'api_key', 'auth', 'authorization', 'password', 'secret'];
    sensitiveParams.forEach(param => {
      if (urlObj.searchParams.has(param)) {
        urlObj.searchParams.set(param, '***');
      }
    });
    
    return urlObj.toString();
  } catch {
    // Si no es URL válida, hacer regex simple
    return url
      .replace(/([?&])(token|apiKey|api_key|auth|authorization|password|secret)=([^&]+)/gi, '$1$2=***')
      .replace(/(Bearer\s+)[^\s]+/gi, '$1***');
  }
}

/**
 * Sanitiza objeto removiendo campos sensibles
 */
export function sanitizeObject(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  
  const sensitive = ['token', 'apiKey', 'api_key', 'authorization', 'password', 'secret', 'bearer'];
  const sanitized = { ...obj };
  
  for (const key of Object.keys(sanitized)) {
    const keyLower = key.toLowerCase();
    if (sensitive.some(s => keyLower.includes(s))) {
      sanitized[key] = '***';
    }
  }
  
  return sanitized;
}

/**
 * Sanitiza mensaje completo para logging seguro
 */
export function sanitizeForLog(data) {
  if (!data) return data;
  
  if (typeof data === 'string') {
    return sanitizeUrl(data);
  }
  
  if (typeof data === 'object') {
    return sanitizeObject(data);
  }
  
  return data;
}
