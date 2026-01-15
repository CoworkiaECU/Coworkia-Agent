/**
 * 🌍 Sistema de Detección Automática de Idioma
 * Detecta el idioma del mensaje del usuario usando patrones nativos
 * Soporta: Español, English, Runasimi (Quechua Ecuador)
 */

// Códigos ISO 639-1 para idiomas soportados
export const SUPPORTED_LANGUAGES = {
  SPANISH: 'es',
  ENGLISH: 'en',
  QUECHUA: 'qu',
  AMHARIC: 'am'
};

// Nombres legibles de idiomas
export const LANGUAGE_NAMES = {
  es: 'Español',
  en: 'English',
  qu: 'Runasimi',
  am: 'አማርኛ'
};

/**
 * Patrones específicos de cada idioma
 */
const LANGUAGE_PATTERNS = {
  // Español - Palabras comunes y acentos
  es: {
    commonWords: [
      'hola', 'buenos', 'días', 'gracias', 'por', 'favor', 'cómo', 'qué', 'cuándo',
      'dónde', 'quiero', 'necesito', 'tengo', 'estoy', 'puedo', 'soy', 'está',
      'para', 'con', 'sin', 'pero', 'porque', 'también', 'aquí', 'ahora',
      'mañana', 'hoy', 'reserva', 'información', 'ayuda', 'precio'
    ],
    specialChars: /[áéíóúñü¿¡]/i,
    questionPattern: /¿.+\?/,
    weight: 1.0
  },

  // English - Common words and structure
  en: {
    commonWords: [
      'hello', 'hi', 'good', 'morning', 'thanks', 'please', 'how', 'what', 'when',
      'where', 'want', 'need', 'have', 'can', 'would', 'like', 'about',
      'this', 'that', 'with', 'from', 'they', 'there', 'here', 'now',
      'tomorrow', 'today', 'booking', 'reservation', 'help', 'price', 'information'
    ],
    specialChars: /\b(the|a|an|is|are|am|was|were|been|being)\b/i,
    weight: 1.0
  },

  // Quechua (Runasimi) - Palabras comunes Ecuador
  qu: {
    commonWords: [
      'allinllachu', 'allin', 'ima', 'may', 'maypi', 'mayman', 'imayna',
      'ñuqa', 'qam', 'pay', 'ari', 'mana', 'yachani', 'munani',
      'tukuy', 'kunan', 'paqarin', 'qayna', 'wasi', 'llaqta', 'pacha',
      'llank', 'wasikunamanta', 'hayk', 'qullqi', 'tiyan', 'p\'unchaypaq',
      'sapalla', 'ufisinata', 'reservay', 'tantakuna', 'kanchu', 'runasimi'
    ],
    specialChars: /[ñqkw]/i,
    weight: 1.2 // Peso ligeramente mayor por ser menos común
  }
};

/**
 * 🎯 Detecta el idioma de un mensaje
 * @param {string} message - Mensaje a analizar
 * @param {string} preferredLanguage - Idioma preferido del usuario (opcional)
 * @returns {object} { language: 'es', confidence: 0.95, name: 'Español' }
 */
export function detectLanguage(message, preferredLanguage = null) {
  if (!message || typeof message !== 'string') {
    return {
      language: SUPPORTED_LANGUAGES.SPANISH,
      confidence: 1.0,
      name: LANGUAGE_NAMES.es,
      reason: 'default'
    };
  }

  const normalizedMessage = message.toLowerCase().trim();
  
  // Si el mensaje es muy corto (< 3 caracteres), usar idioma preferido
  if (normalizedMessage.length < 3) {
    const lang = preferredLanguage || SUPPORTED_LANGUAGES.SPANISH;
    return {
      language: lang,
      confidence: 0.6,
      name: LANGUAGE_NAMES[lang],
      reason: 'short_message_using_preference'
    };
  }

  // Calcular scores para cada idioma
  const scores = {};
  
  for (const [langCode, patterns] of Object.entries(LANGUAGE_PATTERNS)) {
    let score = 0;
    let matchCount = 0;

    // 1. Verificar palabras comunes
    for (const word of patterns.commonWords) {
      if (normalizedMessage.includes(word.toLowerCase())) {
        score += patterns.weight;
        matchCount++;
      }
    }

    // 2. Verificar caracteres especiales
    if (patterns.specialChars && patterns.specialChars.test(message)) {
      score += patterns.weight * 2; // Caracteres especiales son muy indicativos
      matchCount++;
    }

    // 3. Bonus si tiene patrón de pregunta (español)
    if (langCode === 'es' && patterns.questionPattern && patterns.questionPattern.test(message)) {
      score += patterns.weight;
      matchCount++;
    }

    scores[langCode] = {
      score,
      matchCount,
      confidence: matchCount > 0 ? score / (matchCount + 1) : 0
    };
  }

  // Encontrar el idioma con mayor score
  let detectedLang = null;
  let maxScore = 0;
  
  for (const [langCode, data] of Object.entries(scores)) {
    if (data.score > maxScore) {
      maxScore = data.score;
      detectedLang = langCode;
    }
  }

  // Si no se detectó nada claro, usar idioma preferido o español por defecto
  if (!detectedLang || maxScore === 0) {
    const fallbackLang = preferredLanguage || SUPPORTED_LANGUAGES.SPANISH;
    return {
      language: fallbackLang,
      confidence: 0.5,
      name: LANGUAGE_NAMES[fallbackLang],
      reason: 'fallback_to_preference_or_default',
      scores
    };
  }

  // Calcular confianza normalizada (0-1)
  const confidence = Math.min(maxScore / 10, 1.0);

  return {
    language: detectedLang,
    confidence: parseFloat(confidence.toFixed(2)),
    name: LANGUAGE_NAMES[detectedLang],
    reason: 'pattern_matching',
    scores
  };
}

/**
 * 🔍 Detecta comandos explícitos de cambio de idioma
 * Ejemplos: /english, /español, /japanese, cambiar idioma, switch language
 * @param {string} message - Mensaje del usuario
 * @returns {string|null} Código de idioma o null si no hay comando
 */
export function detectLanguageCommand(message) {
  if (!message || typeof message !== 'string') {
    return null;
  }

  const normalized = message.toLowerCase().trim();

  // Comandos con barra diagonal
  const slashCommands = {
    '/spanish': SUPPORTED_LANGUAGES.SPANISH,
    '/español': SUPPORTED_LANGUAGES.SPANISH,
    '/espanol': SUPPORTED_LANGUAGES.SPANISH,
    '/english': SUPPORTED_LANGUAGES.ENGLISH,
    '/inglés': SUPPORTED_LANGUAGES.ENGLISH,
    '/ingles': SUPPORTED_LANGUAGES.ENGLISH,
    '/quechua': SUPPORTED_LANGUAGES.QUECHUA,
    '/runasimi': SUPPORTED_LANGUAGES.QUECHUA
  };

  // Buscar comandos con barra
  for (const [cmd, lang] of Object.entries(slashCommands)) {
    if (normalized.startsWith(cmd)) {
      return lang;
    }
  }

  // Frases naturales de cambio de idioma
  const naturalCommands = [
    { patterns: [
        /cambiar?\s+(a|al)?\s*inglés/i, 
        /habla(r)?\s+inglés/i, 
        /switch\s+to\s+english/i,
        /do\s+you\s+speak\s+english/i,
        /can\s+you\s+speak\s+english/i,
        /hablas\s+inglés/i,
        /hablas\s+ingles/i,
        /english\s+please/i
      ], lang: SUPPORTED_LANGUAGES.ENGLISH },
    { patterns: [
        /cambiar?\s+(a|al)?\s*español/i, 
        /habla(r)?\s+español/i, 
        /switch\s+to\s+spanish/i,
        /do\s+you\s+speak\s+spanish/i,
        /can\s+you\s+speak\s+spanish/i,
        /hablas\s+español/i
      ], lang: SUPPORTED_LANGUAGES.SPANISH },
    { patterns: [
        /cambiar?\s+(a|al)?\s*quechua/i, 
        /habla(r)?\s+quechua/i, 
        /runasimita/i
      ], lang: SUPPORTED_LANGUAGES.QUECHUA },
    { patterns: [
        /cambiar?\s+(a|al)?\s*amárico/i,
        /cambiar?\s+(a|al)?\s*amarico/i,
        /habla(r)?\s+amárico/i,
        /do\s+you\s+speak\s+amharic/i,
        /አማርኛ/
      ], lang: SUPPORTED_LANGUAGES.AMHARIC }
  ];

  for (const { patterns, lang } of naturalCommands) {
    if (patterns.some(pattern => pattern.test(message))) {
      return lang;
    }
  }

  return null;
}

/**
 * 🌐 Obtiene el idioma del usuario considerando:
 * 1. Comando explícito de cambio
 * 2. Idioma preferido guardado
 * 3. Detección automática del mensaje
 * @param {string} message - Mensaje actual
 * @param {string} preferredLanguage - Idioma preferido guardado
 * @returns {object} { language, confidence, name, source }
 */
export function getUserLanguage(message, preferredLanguage = null) {
  // 1. Prioridad máxima: Comando explícito
  const commandLang = detectLanguageCommand(message);
  if (commandLang) {
    return {
      language: commandLang,
      confidence: 1.0,
      name: LANGUAGE_NAMES[commandLang],
      source: 'explicit_command'
    };
  }

  // 2. Detectar idioma del mensaje actual
  const detected = detectLanguage(message, preferredLanguage);
  
  // 3. Si la confianza es alta (>0.7), usar idioma detectado
  if (detected.confidence > 0.7) {
    return {
      ...detected,
      source: 'auto_detected_high_confidence'
    };
  }

  // 4. Si hay idioma preferido y confianza media, usar preferido
  if (preferredLanguage && detected.confidence < 0.7) {
    return {
      language: preferredLanguage,
      confidence: 0.8,
      name: LANGUAGE_NAMES[preferredLanguage],
      source: 'user_preference'
    };
  }

  // 5. Fallback a detección con confianza baja
  return {
    ...detected,
    source: 'auto_detected_low_confidence'
  };
}

/**
 * 📝 Genera mensaje de confirmación de cambio de idioma
 * @param {string} newLanguage - Nuevo idioma
 * @returns {string} Mensaje de confirmación en el nuevo idioma
 */
export function getLanguageChangeConfirmation(newLanguage) {
  const confirmations = {
    es: '✅ Perfecto! Ahora te responderé en español 🇪🇸',
    en: '✅ Perfect! I will now respond in English 🇺🇸',
    qu: '✅ Allinmi! Kunan runasimipi rimanayki 🏔️'
  };

  return confirmations[newLanguage] || confirmations.es;
}

/**
 * 🧪 Función de prueba para verificar detección
 */
export function testLanguageDetection() {
  const testMessages = [
    'Hola, ¿cómo estás?',
    'Hello, how are you?',
    'Allinllachu, imaynallan kashanki?',
    'Quiero hacer una reserva',
    'I want to make a booking',
    'Necesito ayuda',
    'I need help'
  ];

  console.log('🧪 Testing Language Detection:\n');
  
  for (const msg of testMessages) {
    const result = detectLanguage(msg);
    console.log(`Message: "${msg}"`);
    console.log(`Detected: ${result.name} (${result.language}) - Confidence: ${result.confidence}`);
    console.log('---');
  }
}

export default {
  detectLanguage,
  detectLanguageCommand,
  getUserLanguage,
  getLanguageChangeConfirmation,
  SUPPORTED_LANGUAGES,
  LANGUAGE_NAMES,
  testLanguageDetection
};
