/**
 * Utilidades de validación centralizadas
 * Consolida validaciones duplicadas en el codebase
 * 
 * Creado: 26 Mar 2026 - Auditoría duplicados TODO #46
 */

/**
 * Normaliza un número de teléfono eliminando caracteres no numéricos
 * @param {string} phone - Número de teléfono en cualquier formato
 * @returns {string} - Solo dígitos (ej: "593999999999")
 */
export function normalizePhone(phone) {
  if (!phone) return '';
  return String(phone).replace(/\D/g, '');
}

/**
 * Normaliza un teléfono Ecuador al formato internacional +593XXXXXXXXX
 * Convierte: 09XXXXXXXX → +593XXXXXXXX, 9XXXXXXXX → +593XXXXXXXX
 * Preserva formato si ya tiene +593
 * @param {string|null} phone - Teléfono en cualquier formato
 * @returns {string|null} - Teléfono normalizado o null si inválido
 */
export function normalizePhoneEC(phone) {
  if (!phone) return null;
  const cleaned = String(phone).replace(/[\s\-\(\)]/g, '').trim();
  if (!cleaned) return null;
  
  // Ya tiene +593 → solo limpiar
  if (/^\+593\d{9,10}$/.test(cleaned)) return cleaned;
  
  // 593XXXXXXXXX sin + → agregar +
  if (/^593\d{9,10}$/.test(cleaned)) return `+${cleaned}`;
  
  // 09XXXXXXXX → +593XXXXXXXX (Ecuador celular)
  if (/^09\d{8}$/.test(cleaned)) return `+593${cleaned.slice(1)}`;
  
  // 9XXXXXXXX → +593XXXXXXXX
  if (/^9\d{8}$/.test(cleaned)) return `+593${cleaned}`;
  
  // 0[2-7]XXXXXXX → +593[2-7]XXXXXXX (Ecuador fijo)
  if (/^0[2-7]\d{7}$/.test(cleaned)) return `+593${cleaned.slice(1)}`;
  
  // Ya tiene + de otro país → preservar
  if (/^\+\d{10,15}$/.test(cleaned)) return cleaned;
  
  // No reconocido → devolver null (no adivinar)
  return null;
}

/**
 * Valida formato de teléfono Ecuador (+593XXXXXXXXX)
 * @param {string} phone - Número a validar
 * @returns {string} - Teléfono normalizado con +
 * @throws {Error} - Si formato inválido
 */
export function validatePhone(phone) {
  const cleaned = normalizePhone(phone);
  
  if (cleaned.length === 0) {
    throw new Error('Teléfono requerido');
  }
  
  // Formato Ecuador: 593 + 9 dígitos (celular) o 593 + 7-8 dígitos (fijo)
  if (!cleaned.startsWith('593')) {
    throw new Error('Teléfono debe iniciar con código Ecuador +593');
  }
  
  if (cleaned.length < 10 || cleaned.length > 12) {
    throw new Error('Teléfono Ecuador debe tener 10-12 dígitos (593XXXXXXXXX)');
  }
  
  return `+${cleaned}`;
}

/**
 * Compara dos teléfonos ignorando formato
 * @param {string} phone1 - Primer teléfono
 * @param {string} phone2 - Segundo teléfono
 * @returns {boolean} - true si son el mismo número
 */
export function phonesMatch(phone1, phone2) {
  if (!phone1 || !phone2) return false;
  return normalizePhone(phone1) === normalizePhone(phone2);
}

/**
 * Verifica si un teléfono pertenece al admin (teléfono de prueba)
 * @param {string} phone - Teléfono a verificar
 * @param {string} adminPhone - Teléfono admin (process.env.ADMIN_PHONE)
 * @returns {boolean} - true si es el admin
 */
export function isAdminPhone(phone, adminPhone) {
  if (!adminPhone) return false;
  return phonesMatch(phone, adminPhone);
}

/**
 * Valida formato de placa vehicular Ecuador
 * Formatos válidos:
 * - ABC-1234 o ABC1234 (autos)
 * - AB-1234 o AB1234 (motos)
 * @param {string} plate - Placa a validar
 * @returns {string} - Placa normalizada (ABC-1234)
 * @throws {Error} - Si formato inválido
 */
export function validatePlate(plate) {
  if (!plate) {
    throw new Error('Placa requerida');
  }
  
  // Limpiar y normalizar
  const cleaned = plate.toUpperCase().replace(/[^A-Z0-9]/g, '');
  
  // Validar longitud
  if (cleaned.length < 6 || cleaned.length > 7) {
    throw new Error('Placa debe tener formato ABC-1234 o AB-1234');
  }
  
  // Validar patrón: 2-3 letras + 3-4 números
  const match = cleaned.match(/^([A-Z]{2,3})(\d{3,4})$/);
  if (!match) {
    throw new Error('Placa formato inválido (use ABC-1234)');
  }
  
  // Retornar con guión
  return `${match[1]}-${match[2]}`;
}

/**
 * Valida placa extranjera (más permisivo)
 * @param {string} plate - Placa a validar
 * @returns {string} - Placa normalizada
 * @throws {Error} - Si formato completamente inválido
 */
export function validateForeignPlate(plate) {
  if (!plate) {
    throw new Error('Placa requerida');
  }
  
  const cleaned = plate.toUpperCase().trim();
  
  // Validación mínima: al menos 5 caracteres alfanuméricos
  if (cleaned.length < 5 || !/^[A-Z0-9\-\s]+$/.test(cleaned)) {
    throw new Error('Placa extranjera debe tener al menos 5 caracteres (letras/números)');
  }
  
  return cleaned;
}

/**
 * Formatea un monto como moneda USD
 * @param {number} amount - Monto numérico
 * @param {number} decimals - Decimales a mostrar (default: 2)
 * @returns {string} - Formato "$1,234.56"
 */
export function formatPrice(amount, decimals = 2) {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '$0.00';
  }
  
  const num = parseFloat(amount);
  return `$${num.toLocaleString('en-US', { 
    minimumFractionDigits: decimals, 
    maximumFractionDigits: decimals 
  })}`;
}

/**
 * Parsea un string de monto a número
 * Acepta formatos: "1,234.56", "1.234,56", "$1234.56"
 * @param {string} amountStr - String del monto
 * @returns {number} - Número parseado
 * @throws {Error} - Si no es un número válido
 */
export function parseAmount(amountStr) {
  if (!amountStr) return 0;
  
  // Quitar símbolos de moneda y espacios
  let cleaned = String(amountStr).replace(/[$\s]/g, '');
  
  // Validar caracteres permitidos (solo dígitos, puntos, comas)
  if (!/^[\d.,]+$/.test(cleaned)) {
    throw new Error(`Monto inválido: "${amountStr}"`);
  }
  
  // Detectar múltiples puntos decimales (inválido)
  const dotCount = (cleaned.match(/\./g) || []).length;
  const commaCount = (cleaned.match(/,/g) || []).length;
  
  if (dotCount > 1 && commaCount === 0) {
    // Verificar si es separador de miles europeo o error
    if (!/^\d{1,3}(\.\d{3})*$/.test(cleaned)) {
      throw new Error(`Monto inválido: "${amountStr}"`);
    }
  }
  
  // Detectar si usa coma decimal (formato europeo)
  const hasCommaDecimal = /^\d+,\d{2}$/.test(cleaned) || /^\d{1,3}(\.\d{3})*,\d{2}$/.test(cleaned);
  
  if (hasCommaDecimal) {
    // Formato europeo: 1.234,56 → 1234.56
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  } else {
    // Formato americano: 1,234.56 → 1234.56
    cleaned = cleaned.replace(/,/g, '');
  }
  
  const parsed = parseFloat(cleaned);
  
  if (isNaN(parsed)) {
    throw new Error(`Monto inválido: "${amountStr}"`);
  }
  
  return parsed;
}

/**
 * Valida que un monto sea positivo y razonable
 * @param {number} amount - Monto a validar
 * @param {number} min - Monto mínimo (default: 0)
 * @param {number} max - Monto máximo opcional
 * @returns {number} - Monto validado
 * @throws {Error} - Si está fuera de rango
 */
export function validateAmount(amount, min = 0, max = null) {
  const num = typeof amount === 'string' ? parseAmount(amount) : amount;
  
  if (num < min) {
    throw new Error(`Monto debe ser mayor o igual a ${formatPrice(min)}`);
  }
  
  if (max !== null && num > max) {
    throw new Error(`Monto debe ser menor o igual a ${formatPrice(max)}`);
  }
  
  return num;
}

/**
 * Valida código de reserva/cotización
 * Formatos válidos: "ENZO-2026-001", "ADRIANA-2026-ABC123"
 * @param {string} code - Código a validar
 * @param {string} agentPrefix - Prefijo esperado (ej: "ENZO")
 * @returns {string} - Código validado
 * @throws {Error} - Si formato inválido
 */
export function validateCode(code, agentPrefix = null) {
  if (!code) {
    throw new Error('Código requerido');
  }
  
  const cleaned = code.trim().toUpperCase();
  
  // Patrón: AGENTE-YEAR-NUMEROS
  const match = cleaned.match(/^([A-Z]+)-(\d{4})-([A-Z0-9]+)$/);
  
  if (!match) {
    throw new Error('Código debe tener formato AGENTE-2026-001');
  }
  
  if (agentPrefix && match[1] !== agentPrefix.toUpperCase()) {
    throw new Error(`Código debe iniciar con ${agentPrefix.toUpperCase()}`);
  }
  
  return cleaned;
}

/**
 * Genera código único para cotizaciones/reservas
 * @param {string} prefix - Prefijo (ej: "ENZO", "ADRIANA")
 * @param {number} sequenceNumber - Número secuencial
 * @returns {string} - Código generado (ej: "ENZO-2026-001")
 */
export function generateCode(prefix, sequenceNumber) {
  const year = new Date().getFullYear();
  const seq = String(sequenceNumber).padStart(3, '0');
  return `${prefix.toUpperCase()}-${year}-${seq}`;
}
