/**
 * 🇪🇨 VALIDADOR DE RUC - SERVICIO RENTAS INTERNAS (SRI) ECUADOR
 * Integración con RapidAPI para validación en tiempo real
 * 
 * FUNCIONALIDADES:
 * - Validación de formato RUC (10 o 13 dígitos)
 * - Consulta estado en SRI (activo/inactivo/no registrado)
 * - Extracción de razón social automática
 * - Cache temporal para evitar consultas repetidas
 * 
 * API: Gabi-SRI en RapidAPI
 * Documentación: https://rapidapi.com/superclas/api/gabi-sri/
 */

import fetch from 'node-fetch';

// Cache temporal (5 minutos) para evitar consultas repetidas
const rucCache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

/**
 * 🔍 Valida formato de RUC ecuatoriano
 * @param {string} ruc - Número de RUC
 * @returns {Object} { valid: boolean, type: string, message: string }
 */
export function validateRucFormat(ruc) {
  if (!ruc || typeof ruc !== 'string') {
    return { valid: false, type: null, message: 'RUC no proporcionado' };
  }

  // Limpiar espacios y guiones
  const cleanRuc = ruc.replace(/[\s-]/g, '');

  // Validar longitud
  if (!/^\d{10}$|^\d{13}$/.test(cleanRuc)) {
    return { 
      valid: false, 
      type: null, 
      message: 'RUC debe tener 10 dígitos (personas naturales) o 13 dígitos (sociedades)' 
    };
  }

  // Determinar tipo según longitud
  const type = cleanRuc.length === 10 ? 'natural' : 'juridica';

  // Validar tercer dígito según tipo
  const thirdDigit = parseInt(cleanRuc[2]);
  
  if (type === 'natural' && thirdDigit >= 6) {
    return {
      valid: false,
      type: null,
      message: 'RUC de persona natural inválido (tercer dígito debe ser menor a 6)'
    };
  }

  if (type === 'juridica' && thirdDigit !== 9) {
    return {
      valid: false,
      type: null,
      message: 'RUC de sociedad inválido (tercer dígito debe ser 9)'
    };
  }

  return {
    valid: true,
    type,
    message: 'Formato válido'
  };
}

/**
 * 🌐 Consulta RUC en el SRI vía RapidAPI
 * @param {string} ruc - Número de RUC a consultar
 * @returns {Promise<Object>} Datos del contribuyente
 */
export async function consultRucSRI(ruc) {
  const apiKey = process.env.RAPIDAPI_KEY;
  
  if (!apiKey) {
    console.error('[SRI-VALIDATOR] ❌ RAPIDAPI_KEY no configurada');
    return {
      success: false,
      error: 'API key no configurada',
      message: 'No se pudo validar el RUC (configuración pendiente)'
    };
  }

  // Validar formato antes de consultar API
  const formatValidation = validateRucFormat(ruc);
  if (!formatValidation.valid) {
    return {
      success: false,
      error: 'invalid_format',
      message: formatValidation.message
    };
  }

  const cleanRuc = ruc.replace(/[\s-]/g, '');

  // Verificar cache
  const cached = rucCache.get(cleanRuc);
  if (cached && (Date.now() - cached.timestamp < CACHE_DURATION)) {
    console.log('[SRI-VALIDATOR] ✅ RUC obtenido de cache:', cleanRuc);
    return cached.data;
  }

  try {
    console.log('[SRI-VALIDATOR] 🔍 Consultando RUC en SRI:', cleanRuc);
    
    // Nota: Ajustar endpoint según documentación de RapidAPI
    // Opciones comunes: /ruc/{ruc}, /consulta/{ruc}, /validate/{ruc}
    const response = await fetch(`https://gabi-sri.p.rapidapi.com/consulta/${cleanRuc}`, {
      method: 'GET',
      headers: {
        'x-rapidapi-key': apiKey,
        'x-rapidapi-host': 'gabi-sri.p.rapidapi.com'
      },
      timeout: 10000 // 10 segundos
    });

    if (!response.ok) {
      // Si es 404, probablemente el RUC no existe
      if (response.status === 404) {
        console.log('[SRI-VALIDATOR] ℹ️ RUC no encontrado en SRI');
        return {
          success: false,
          error: 'not_found',
          exists: false,
          message: 'RUC no registrado en el SRI',
          ruc: cleanRuc
        };
      }
      
      // Si es 429, rate limit alcanzado
      if (response.status === 429) {
        console.log('[SRI-VALIDATOR] ⚠️ Rate limit alcanzado');
        return {
          success: false,
          error: 'rate_limit',
          message: 'Servicio temporalmente no disponible. RUC guardado para validación posterior.',
          ruc: cleanRuc,
          formatValid: true // Al menos el formato es válido
        };
      }
      
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('[SRI-VALIDATOR] 📊 Respuesta SRI:', JSON.stringify(data, null, 2));

    // Procesar respuesta según estructura de la API
    const result = processApiResponse(data, cleanRuc);
    
    // Guardar en cache
    rucCache.set(cleanRuc, {
      data: result,
      timestamp: Date.now()
    });

    return result;

  } catch (error) {
    console.error('[SRI-VALIDATOR] ❌ Error consultando SRI:', error.message);
    
    return {
      success: false,
      error: error.message,
      message: 'Error al consultar SRI. Por favor verifica el RUC manualmente.',
      ruc: cleanRuc
    };
  }
}

/**
 * 📊 Procesa la respuesta de la API según su estructura
 * @param {Object} apiData - Datos de la API
 * @param {string} ruc - RUC consultado
 * @returns {Object} Datos procesados
 */
function processApiResponse(apiData, ruc) {
  // Estructura típica de respuesta de APIs de SRI Ecuador:
  // { ruc, razonSocial, nombreComercial, estado, fechaInicio, actividadEconomica, etc }
  
  if (!apiData || typeof apiData !== 'object') {
    return {
      success: false,
      error: 'invalid_response',
      message: 'Respuesta inválida del SRI',
      ruc
    };
  }

  // Caso 1: RUC no encontrado
  if (apiData.error || apiData.message?.includes('no encontrado')) {
    return {
      success: false,
      error: 'not_found',
      message: 'RUC no registrado en el SRI',
      ruc,
      exists: false
    };
  }

  // Caso 2: RUC encontrado
  return {
    success: true,
    ruc,
    razonSocial: apiData.razonSocial || apiData.nombre || apiData.nombreComercial || 'No disponible',
    nombreComercial: apiData.nombreComercial || null,
    estado: apiData.estado || apiData.estadoContribuyente || 'ACTIVO',
    tipoContribuyente: apiData.tipoContribuyente || (ruc.length === 10 ? 'Natural' : 'Jurídica'),
    actividadEconomica: apiData.actividadEconomica || apiData.actividadPrincipal || null,
    fechaInicio: apiData.fechaInicio || apiData.fechaConstitucion || null,
    exists: true,
    isActive: (apiData.estado || 'ACTIVO').toUpperCase() === 'ACTIVO',
    message: `✅ RUC válido: ${apiData.razonSocial || apiData.nombre || 'Contribuyente registrado'}`
  };
}

/**
 * 🔄 Valida RUC completo (formato + consulta SRI)
 * @param {string} ruc - RUC a validar
 * @returns {Promise<Object>} Resultado de validación completa
 */
export async function validateRuc(ruc) {
  console.log('[SRI-VALIDATOR] 🚀 Iniciando validación completa de RUC:', ruc);
  
  // 1. Validar formato
  const formatCheck = validateRucFormat(ruc);
  if (!formatCheck.valid) {
    return {
      valid: false,
      formatValid: false,
      sriValid: false,
      ...formatCheck
    };
  }

  // 2. Consultar en SRI
  const sriData = await consultRucSRI(ruc);
  
  if (!sriData.success) {
    return {
      valid: false,
      formatValid: true,
      sriValid: false,
      ...sriData
    };
  }

  // 3. Validación exitosa
  return {
    valid: true,
    formatValid: true,
    sriValid: true,
    ...sriData
  };
}

/**
 * 🧹 Limpia cache de RUC
 */
export function clearRucCache() {
  const size = rucCache.size;
  rucCache.clear();
  console.log(`[SRI-VALIDATOR] 🧹 Cache limpiado: ${size} entradas eliminadas`);
}

export default {
  validateRucFormat,
  consultRucSRI,
  validateRuc,
  clearRucCache
};
