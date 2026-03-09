/**
 * 📧 VALIDADOR DE EMAILS - Enterprise Level
 * Validación robusta con detección de errores comunes y sugerencias inteligentes
 */

// Lista de dominios comunes para sugerencias
const COMMON_DOMAINS = [
  'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com',
  'icloud.com', 'live.com', 'msn.com', 'aol.com',
  'coworkia.com', 'coworkia.ec',
  // Dominios Ecuador
  'ec', 'gob.ec', 'edu.ec', 'com.ec', 'net.ec', 'org.ec',
  // Dominios empresariales Ecuador
  'pichincha.com', 'produbanco.com', 'bolivariano.com',
  'pronaca.com', 'arca.com.ec', 'telconet.ec'
];

// Regex robusto (RFC 5322 simplificado pero efectivo)
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

/**
 * 🔍 Valida formato de email y detecta errores comunes
 * @param {string} email - Email a validar
 * @returns {Object} { valid: boolean, error?: string, suggestion?: string }
 */
export function validateEmail(email) {
  // Limpiar espacios
  const trimmed = (email || '').trim();
  
  // 1. Email vacío
  if (!trimmed) {
    return {
      valid: false,
      error: 'El email no puede estar vacío'
    };
  }
  
  // 2. Verificar espacios internos
  if (trimmed !== email || /\s/.test(trimmed)) {
    return {
      valid: false,
      error: 'El email no puede contener espacios',
      suggestion: trimmed.replace(/\s+/g, '')
    };
  }
  
  // 3. Verificar presencia de @
  if (!trimmed.includes('@')) {
    return {
      valid: false,
      error: 'El email debe contener un @',
      suggestion: detectMissingAt(trimmed)
    };
  }
  
  // 4. Verificar que @ no esté al inicio o final
  if (trimmed.startsWith('@') || trimmed.endsWith('@')) {
    return {
      valid: false,
      error: trimmed.startsWith('@') 
        ? 'El email no puede empezar con @' 
        : 'Falta el dominio después del @'
    };
  }
  
  // 5. Verificar múltiples @
  const atCount = (trimmed.match(/@/g) || []).length;
  if (atCount > 1) {
    return {
      valid: false,
      error: 'El email solo puede tener un @'
    };
  }
  
  // 6. Separar usuario y dominio
  const [localPart, domain] = trimmed.split('@');
  
  // 7. Verificar parte local (antes del @)
  if (!localPart || localPart.length === 0) {
    return {
      valid: false,
      error: 'Falta la parte antes del @ (ej: nombre@dominio.com)'
    };
  }
  
  // 8. Verificar dominio existe
  if (!domain || domain.length === 0) {
    return {
      valid: false,
      error: 'Falta el dominio después del @ (ej: gmail.com)'
    };
  }
  
  // 9. Verificar punto en dominio
  if (!domain.includes('.')) {
    return {
      valid: false,
      error: 'El dominio debe tener un punto (ej: gmail.com)',
      suggestion: suggestDomain(domain)
    };
  }
  
  // 10. Verificar que no empiece o termine con punto
  if (domain.startsWith('.') || domain.endsWith('.')) {
    return {
      valid: false,
      error: 'El dominio no puede empezar o terminar con punto',
      suggestion: domain.replace(/^\.+|\.+$/g, '')
    };
  }
  
  // 11. Verificar dominio vacío antes del punto
  if (domain.startsWith('.') || domain.includes('..')) {
    return {
      valid: false,
      error: 'El dominio tiene formato inválido',
      suggestion: domain.replace(/\.{2,}/g, '.')
    };
  }
  
  // 12. Verificar extensión (después del último punto)
  const parts = domain.split('.');
  const extension = parts[parts.length - 1];
  
  if (!extension || extension.length < 2) {
    return {
      valid: false,
      error: 'La extensión del dominio es muy corta (ej: .com, .ec)',
      suggestion: suggestDomain(domain)
    };
  }
  
  // 13. Verificar caracteres inválidos
  if (!/^[a-zA-Z0-9.-]+$/.test(domain)) {
    return {
      valid: false,
      error: 'El dominio contiene caracteres no permitidos'
    };
  }
  
  // 14. Validación con regex completo
  if (!EMAIL_REGEX.test(trimmed)) {
    return {
      valid: false,
      error: 'El formato del email no es válido',
      suggestion: suggestCorrection(trimmed)
    };
  }
  
  // 15. Sugerencia si detectamos error común
  const suggestion = detectCommonMistakes(trimmed);
  if (suggestion && suggestion !== trimmed) {
    return {
      valid: true, // Técnicamente válido, pero hay sugerencia
      warning: `¿Quisiste decir ${suggestion}?`,
      suggestion
    };
  }
  
  // ✅ Email válido
  return {
    valid: true
  };
}

/**
 * 🔍 Detecta si falta @ y sugiere dónde debería ir
 */
function detectMissingAt(email) {
  // Buscar patrones comunes sin @
  // Ej: "juangmail.com" → "juan@gmail.com"
  const match = email.match(/^([a-zA-Z0-9._-]+)(gmail|yahoo|hotmail|outlook|icloud|live|coworkia)/i);
  if (match) {
    return `${match[1]}@${match[2]}.com`;
  }
  
  return null;
}

/**
 * 💡 Sugiere dominio común basado en texto
 */
function suggestDomain(domain) {
  const lower = domain.toLowerCase();
  
  // Mapeo de errores comunes
  const commonMistakes = {
    'gmail': 'gmail.com',
    'gmailcom': 'gmail.com',
    'gmai': 'gmail.com',
    'gmial': 'gmail.com',
    'yahoo': 'yahoo.com',
    'yahoocom': 'yahoo.com',
    'hotmail': 'hotmail.com',
    'hotmailcom': 'hotmail.com',
    'outlook': 'outlook.com',
    'outlookcom': 'outlook.com',
    'icloud': 'icloud.com',
    'coworkia': 'coworkia.ec'
  };
  
  // Buscar coincidencia exacta
  if (commonMistakes[lower]) {
    return commonMistakes[lower];
  }
  
  // Buscar coincidencia parcial
  for (const [mistake, correct] of Object.entries(commonMistakes)) {
    if (lower.includes(mistake)) {
      return correct;
    }
  }
  
  // Si tiene letters seguidas de "com" sin punto
  if (/[a-z]com$/i.test(lower)) {
    return lower.replace(/com$/i, '.com');
  }
  
  return null;
}

/**
 * 🔍 Detecta errores comunes y sugiere corrección
 */
function detectCommonMistakes(email) {
  const [local, domain] = email.split('@');
  
  if (!domain) return null;
  
  const lower = domain.toLowerCase();
  
  // Errores de escritura comunes
  const corrections = {
    'gmailcom': 'gmail.com',
    'gmai.com': 'gmail.com',
    'gmial.com': 'gmail.com',
    'yahooo.com': 'yahoo.com',
    'yaho.com': 'yahoo.com',
    'hotmial.com': 'hotmail.com',
    'hotmai.com': 'hotmail.com',
    'outlok.com': 'outlook.com',
    'outlok.com': 'outlook.com',
    'coworkiaec': 'coworkia.ec',
    'coworkia.com': 'coworkia.ec' // Corregir a .ec
  };
  
  for (const [mistake, correct] of Object.entries(corrections)) {
    if (lower === mistake) {
      return `${local}@${correct}`;
    }
  }
  
  return null;
}

/**
 * 🔧 Sugiere corrección general
 */
function suggestCorrection(email) {
  const lower = email.toLowerCase();
  
  // Intentar detectar y corregir
  if (!lower.includes('@')) {
    return detectMissingAt(lower);
  }
  
  const [local, domain] = lower.split('@');
  const suggestedDomain = suggestDomain(domain);
  
  if (suggestedDomain) {
    return `${local}@${suggestedDomain}`;
  }
  
  return null;
}

/**
 * ✅ Validación rápida (solo retorna boolean)
 */
export function isValidEmail(email) {
  return validateEmail(email).valid;
}

/**
 * 📝 Formatea mensaje de error amigable para usuarios
 */
export function formatEmailError(validationResult) {
  if (validationResult.valid) {
    if (validationResult.warning) {
      return `💡 ${validationResult.warning}`;
    }
    return null;
  }
  
  let message = `❌ ${validationResult.error}`;
  
  if (validationResult.suggestion) {
    message += `\n\n💡 ¿Quisiste decir: ${validationResult.suggestion}?`;
  }
  
  return message;
}

// Export default
export default {
  validateEmail,
  isValidEmail,
  formatEmailError
};
