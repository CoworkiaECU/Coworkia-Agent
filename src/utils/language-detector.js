/**
 * 🌍 Sistema de Detección Automática de Idioma
 * Detecta el idioma del mensaje del usuario usando patrones nativos
 * Soporta: Español, English, Français, Runasimi (Quechua Ecuador)
 */

// Códigos ISO 639-1 para idiomas soportados
// Alineado con handoff-messages.js: es, en, fr, it, pt
export const SUPPORTED_LANGUAGES = {
  SPANISH: 'es',
  ENGLISH: 'en',
  FRENCH: 'fr',
  ITALIAN: 'it',
  PORTUGUESE: 'pt'
};

// Nombres legibles de idiomas
export const LANGUAGE_NAMES = {
  es: 'Español',
  en: 'English',
  fr: 'Français',
  it: 'Italiano',
  pt: 'Português'
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

  // French - Mots communs et structure
  fr: {
    commonWords: [
      'bonjour', 'salut', 'merci', 'sil', 'vous', 'plaît', 'comment', 'quoi', 'quand',
      'où', 'veux', 'besoin', 'avoir', 'être', 'suis', 'est', 'sont',
      'pour', 'avec', 'sans', 'mais', 'parce', 'que', 'aussi', 'ici', 'maintenant',
      'demain', 'aujourd', 'hui', 'réservation', 'information', 'aide', 'prix'
    ],
    specialChars: /[àâäéèêëïîôùûüÿœæç]/i,
    weight: 1.0
  },

  // Italian - Parole comuni e struttura
  it: {
    commonWords: [
      'ciao', 'buongiorno', 'salve', 'grazie', 'prego', 'come', 'cosa', 'quando',
      'dove', 'voglio', 'bisogno', 'avere', 'essere', 'sono', 'siamo', 'hanno',
      'per', 'con', 'senza', 'ma', 'perché', 'anche', 'qui', 'adesso',
      'domani', 'oggi', 'prenotazione', 'informazione', 'aiuto', 'prezzo'
    ],
    specialChars: /[àèéìòù]/i,
    weight: 1.0
  },

  // Portuguese - Palavras comuns e estrutura
  pt: {
    commonWords: [
      'olá', 'oi', 'bom', 'dia', 'obrigado', 'obrigada', 'por', 'favor', 'como', 'que', 'quando',
      'onde', 'quero', 'preciso', 'ter', 'estar', 'sou', 'estou', 'são',
      'para', 'com', 'sem', 'mas', 'porque', 'também', 'aqui', 'agora',
      'amanhã', 'hoje', 'reserva', 'informação', 'ajuda', 'preço'
    ],
    specialChars: /[ãõáâàéêíóôúç]/i,
    weight: 1.0
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
 * ⚡ MODO: Una sola palabra activa el idioma
 * Ejemplos: "english", "español", "français"
 * @param {string} message - Mensaje del usuario
 * @returns {string|null} Código de idioma o null si no hay comando
 */
export function detectLanguageCommand(message) {
  if (!message || typeof message !== 'string') {
    return null;
  }

  const normalized = message.toLowerCase().trim();

  // ⚡ UNA PALABRA ACTIVA EL IDIOMA - Comandos simples
  const singleWordCommands = {
    'english': SUPPORTED_LANGUAGES.ENGLISH,
    'inglés': SUPPORTED_LANGUAGES.ENGLISH,
    'ingles': SUPPORTED_LANGUAGES.ENGLISH,
    'español': SUPPORTED_LANGUAGES.SPANISH,
    'espanol': SUPPORTED_LANGUAGES.SPANISH,
    'spanish': SUPPORTED_LANGUAGES.SPANISH,
    'français': SUPPORTED_LANGUAGES.FRENCH,
    'francais': SUPPORTED_LANGUAGES.FRENCH,
    'french': SUPPORTED_LANGUAGES.FRENCH,
    'italiano': SUPPORTED_LANGUAGES.ITALIAN,
    'italian': SUPPORTED_LANGUAGES.ITALIAN,
    'português': SUPPORTED_LANGUAGES.PORTUGUESE,
    'portugues': SUPPORTED_LANGUAGES.PORTUGUESE,
    'portuguese': SUPPORTED_LANGUAGES.PORTUGUESE
  };

  // Si el mensaje es EXACTAMENTE una palabra de idioma
  if (singleWordCommands[normalized]) {
    return singleWordCommands[normalized];
  }

  // Comandos con barra diagonal
  const slashCommands = {
    '/spanish': SUPPORTED_LANGUAGES.SPANISH,
    '/español': SUPPORTED_LANGUAGES.SPANISH,
    '/espanol': SUPPORTED_LANGUAGES.SPANISH,
    '/english': SUPPORTED_LANGUAGES.ENGLISH,
    '/inglés': SUPPORTED_LANGUAGES.ENGLISH,
    '/ingles': SUPPORTED_LANGUAGES.ENGLISH,
    '/français': SUPPORTED_LANGUAGES.FRENCH,
    '/francais': SUPPORTED_LANGUAGES.FRENCH,
    '/french': SUPPORTED_LANGUAGES.FRENCH,
    '/italiano': SUPPORTED_LANGUAGES.ITALIAN,
    '/italian': SUPPORTED_LANGUAGES.ITALIAN,
    '/português': SUPPORTED_LANGUAGES.PORTUGUESE,
    '/portugues': SUPPORTED_LANGUAGES.PORTUGUESE,
    '/portuguese': SUPPORTED_LANGUAGES.PORTUGUESE
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
        /cambiar?\s+(a|al)?\s*francés/i,
        /habla(r)?\s+francés/i,
        /french\s+please/i,
        /parlez\s+vous\s+français/i
      ], lang: SUPPORTED_LANGUAGES.FRENCH },
    { patterns: [
        /cambiar?\s+(a|al)?\s*italiano/i,
        /habla(r)?\s+italiano/i,
        /italian\s+please/i,
        /parli\s+italiano/i
      ], lang: SUPPORTED_LANGUAGES.ITALIAN },
    { patterns: [
        /cambiar?\s+(a|al)?\s*portugués/i,
        /habla(r)?\s+portugués/i,
        /portuguese\s+please/i,
        /fala\s+português/i,
        /você\s+fala\s+português/i
      ], lang: SUPPORTED_LANGUAGES.PORTUGUESE }
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
 * 🌐 Traduce un mensaje al idioma solicitado usando OpenAI
 * @param {string} message - Mensaje a traducir
 * @param {string} targetLanguage - Idioma destino ('es', 'en', 'fr', 'it', 'pt')
 * @returns {Promise<string>} Mensaje traducido
 */
export async function translateMessage(message, targetLanguage) {
  try {
    const { Configuration, OpenAIApi } = await import('openai');
    
    const configuration = new Configuration({
      apiKey: process.env.OPENAI_API_KEY
    });
    const openai = new OpenAIApi(configuration);
    
    const languageNames = {
      es: 'Spanish',
      en: 'English',
      fr: 'French',
      it: 'Italian',
      pt: 'Portuguese'
    };
    
    const targetName = languageNames[targetLanguage] || 'English';
    
    const response = await openai.createChatCompletion({
      model: 'gpt-4o-mini',
      messages: [{
        role: 'system',
        content: `You are a professional translator. Translate the following message to ${targetName}. Maintain the tone, emojis, and formatting. Only return the translation, nothing else.`
      }, {
        role: 'user',
        content: message
      }],
      temperature: 0.3,
      max_tokens: 500
    });
    
    return response.data.choices[0].message.content.trim();
  } catch (error) {
    console.error('[TRANSLATE] Error:', error);
    return message; // Si falla, devolver original
  }
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
    fr: '✅ Parfait! Je vais maintenant répondre en français 🇫🇷',
    it: '✅ Perfetto! Adesso risponderò in italiano 🇮🇹',
    pt: '✅ Perfeito! Agora vou responder em português 🇵🇹'
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
