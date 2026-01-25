/**
 * 📨 MESSAGE SPLITTER - Divide mensajes largos automáticamente
 * 
 * Sistema inteligente para dividir respuestas largas del asistente
 * en múltiples mensajes de WhatsApp para mejor UX.
 * 
 * Casos de uso:
 * - Paula enviando fichas de propiedades (1 mensaje por casa)
 * - Adriana enviando planes de seguro (1 mensaje por plan)
 * - Aluna enviando opciones de membresía
 * - Cualquier respuesta > 500 caracteres con estructura clara
 */

/**
 * 🔍 Detecta si un mensaje necesita ser dividido
 * @param {string} message - Mensaje a analizar
 * @returns {boolean} true si debe dividirse
 */
export function shouldSplitMessage(message) {
  if (!message || typeof message !== 'string') return false;
  
  // Dividir si:
  // 1. Es muy largo (> 800 caracteres)
  // 2. Contiene múltiples bloques estructurados
  // 3. Tiene separadores explícitos del prompt
  
  const hasExplicitSeparators = /⏱️.*?\[ESPERAR.*?SEGUNDOS?\]|━━━━━━━━━━━━━|---mensaje-split---|###SPLIT###/i.test(message);
  const hasMultipleBlocks = (message.match(/🏡\s*\*\*CASA\s*#\d+/gi) || []).length > 1;
  const hasMultiplePlans = (message.match(/📋\s*\*\*PLAN\s*\d+/gi) || []).length > 1;
  const isVeryLong = message.length > 800;
  
  return hasExplicitSeparators || hasMultipleBlocks || hasMultiplePlans || isVeryLong;
}

/**
 * 📝 Divide un mensaje largo en partes lógicas
 * @param {string} message - Mensaje completo
 * @returns {string[]} Array de mensajes divididos
 */
export function splitMessage(message) {
  if (!message || typeof message !== 'string') return [message];
  
  // 1. Intentar dividir por separadores explícitos del prompt
  if (/⏱️.*?\[ESPERAR.*?SEGUNDOS?\]/i.test(message)) {
    return splitByWaitMarkers(message);
  }
  
  // 2. Dividir por bloques estructurados (CASA #1, CASA #2, etc.)
  if (/🏡\s*\*\*CASA\s*#\d+/i.test(message)) {
    return splitByPropertyBlocks(message);
  }
  
  // 3. Dividir por planes de seguro
  if (/📋\s*\*\*PLAN\s*\d+/i.test(message)) {
    return splitByPlanBlocks(message);
  }
  
  // 4. Dividir por separadores genéricos
  if (/━━━━━━━━━━━━━/.test(message)) {
    return splitByDividers(message);
  }
  
  // 5. Si no hay estructura clara pero es muy largo, dividir por párrafos
  if (message.length > 1000) {
    return splitByLength(message);
  }
  
  // 6. No dividir, enviar como está
  return [message];
}

/**
 * ⏱️ Divide mensaje por marcadores [ESPERAR X SEGUNDOS]
 */
function splitByWaitMarkers(message) {
  // Regex para encontrar los marcadores de espera
  const parts = message.split(/⏱️\s*\*\*\[ESPERAR\s+\d+\s+SEGUNDOS?\]\*\*/i);
  
  return parts
    .map(part => part.trim())
    .filter(part => part.length > 0);
}

/**
 * 🏡 Divide mensaje por bloques de propiedades (CASA #1, CASA #2...)
 */
function splitByPropertyBlocks(message) {
  // Regex para capturar bloques que empiezan con 🏡 **CASA #X
  const regex = /(?=🏡\s*\*\*CASA\s*#\d+)/gi;
  
  let parts = message.split(regex);
  
  // El primer elemento puede ser intro general (antes de primera casa)
  const intro = parts[0] && !parts[0].match(/🏡\s*\*\*CASA\s*#\d+/i) ? parts.shift().trim() : null;
  
  // Filtrar partes vacías
  parts = parts.filter(p => p.trim().length > 0);
  
  // Si hay intro, agregarla al inicio
  if (intro && intro.length > 0) {
    parts.unshift(intro);
  }
  
  return parts;
}

/**
 * 📋 Divide mensaje por bloques de planes (PLAN 1, PLAN 2...)
 */
function splitByPlanBlocks(message) {
  const regex = /(?=📋\s*\*\*PLAN\s*\d+)/gi;
  
  let parts = message.split(regex);
  const intro = parts[0] && !parts[0].match(/📋\s*\*\*PLAN\s*\d+/i) ? parts.shift().trim() : null;
  
  parts = parts.filter(p => p.trim().length > 0);
  
  if (intro && intro.length > 0) {
    parts.unshift(intro);
  }
  
  return parts;
}

/**
 * ━ Divide mensaje por líneas divisoras
 */
function splitByDividers(message) {
  // Dividir por líneas de separación largas
  const parts = message.split(/━{10,}/);
  
  return parts
    .map(part => part.trim())
    .filter(part => part.length > 10); // Ignorar fragmentos muy pequeños que son ruido
}

/**
 * 📏 Divide mensaje largo por párrafos (fallback)
 */
function splitByLength(message, maxLength = 1200) {
  const parts = [];
  const paragraphs = message.split(/\n\n+/);
  
  let currentPart = '';
  
  for (const paragraph of paragraphs) {
    if ((currentPart + paragraph).length > maxLength && currentPart.length > 0) {
      parts.push(currentPart.trim());
      currentPart = paragraph;
    } else {
      currentPart += (currentPart ? '\n\n' : '') + paragraph;
    }
  }
  
  if (currentPart.trim().length > 0) {
    parts.push(currentPart.trim());
  }
  
  return parts;
}

/**
 * 📨 Procesa y divide mensaje si es necesario
 * @param {string} message - Mensaje original
 * @returns {{ parts: string[], shouldDelay: boolean, delayMs: number }}
 */
export function processMessage(message) {
  if (!shouldSplitMessage(message)) {
    return {
      parts: [message],
      shouldDelay: false,
      delayMs: 0
    };
  }
  
  const parts = splitMessage(message);
  
  // Calcular delay apropiado según contexto
  let delayMs = 6000; // Default: 6 segundos (aumentado para garantizar orden en Wassenger)
  
  // Para fichas de propiedades o planes, dar más tiempo de lectura
  if (message.includes('🏡 **CASA #') || message.includes('📋 **PLAN')) {
    delayMs = 7000; // 7 segundos
  }
  
  // Para mensajes cortos, delay moderado (mínimo 5s para evitar desorden)
  if (parts.every(p => p.length < 300)) {
    delayMs = 5000; // 5 segundos
  }
  
  return {
    parts,
    shouldDelay: parts.length > 1,
    delayMs
  };
}

/**
 * 🧹 Limpia marcadores internos del prompt que no deben mostrarse al usuario
 */
export function cleanPromptMarkers(message) {
  if (!message) return message;
  
  // Remover marcadores que solo son para el LLM
  let cleaned = message;
  
  // Remover comentarios de espera que quedaron
  cleaned = cleaned.replace(/⏱️\s*\*\*\[ESPERAR\s+\d+\s+SEGUNDOS?\]\*\*/gi, '');
  
  // Remover separadores internos
  cleaned = cleaned.replace(/---mensaje-split---/gi, '');
  cleaned = cleaned.replace(/###SPLIT###/gi, '');
  
  // Limpiar múltiples líneas en blanco
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  
  return cleaned.trim();
}

/**
 * 📊 Estadísticas de división (para debugging)
 */
export function getSplitStats(message) {
  if (!message) return null;
  
  const processed = processMessage(message);
  
  return {
    originalLength: message.length,
    parts: processed.parts.length,
    shouldSplit: processed.shouldDelay,
    avgPartLength: Math.round(
      processed.parts.reduce((sum, p) => sum + p.length, 0) / processed.parts.length
    ),
    delayMs: processed.delayMs,
    totalDelayMs: (processed.parts.length - 1) * processed.delayMs
  };
}
