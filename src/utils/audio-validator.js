/**
 * 🎤 VALIDADOR DE AUDIO PARA WHISPER
 * Validaciones de formato, tamaño y calidad antes de transcribir
 * Paridad con Vision AI validation
 */

// Formatos soportados por Whisper API
const SUPPORTED_FORMATS = [
  'mp3', 'mp4', 'mpeg', 'mpga', 'm4a', 'wav', 'webm', 'ogg'
];

// Tamaños límite
const MAX_FILE_SIZE_MB = 25; // Límite de Whisper API
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const RECOMMENDED_MAX_MB = 10; // Recomendado para performance

// Duraciones
const MAX_DURATION_SECONDS = 300; // 5 minutos recomendado
const MIN_DURATION_SECONDS = 1; // Mínimo 1 segundo

/**
 * Valida formato de archivo de audio
 * @param {string} url - URL del archivo de audio
 * @returns {{valid: boolean, format?: string, error?: string}}
 */
export function validateAudioFormat(url) {
  if (!url || typeof url !== 'string') {
    return { valid: false, error: 'URL inválida' };
  }

  // Extraer extensión de la URL
  const urlLower = url.toLowerCase();
  const format = SUPPORTED_FORMATS.find(fmt => 
    urlLower.includes(`.${fmt}`) || urlLower.includes(`/${fmt}`)
  );

  if (!format) {
    return { 
      valid: false, 
      error: `Formato no soportado. Formatos válidos: ${SUPPORTED_FORMATS.join(', ')}` 
    };
  }

  return { valid: true, format };
}

/**
 * Valida tamaño de archivo de audio
 * @param {number} sizeBytes - Tamaño en bytes
 * @returns {{valid: boolean, sizeMB?: number, warning?: string, error?: string}}
 */
export function validateAudioSize(sizeBytes) {
  if (typeof sizeBytes !== 'number' || sizeBytes <= 0) {
    return { valid: false, error: 'Tamaño inválido' };
  }

  const sizeMB = sizeBytes / (1024 * 1024);

  // Error: Excede límite de API
  if (sizeBytes > MAX_FILE_SIZE_BYTES) {
    return { 
      valid: false, 
      sizeMB,
      error: `Audio demasiado grande (${sizeMB.toFixed(2)}MB). Máximo: ${MAX_FILE_SIZE_MB}MB` 
    };
  }

  // Warning: Excede recomendado pero dentro de límite
  if (sizeMB > RECOMMENDED_MAX_MB) {
    return { 
      valid: true, 
      sizeMB,
      warning: `Audio grande (${sizeMB.toFixed(2)}MB). Recomendado: <${RECOMMENDED_MAX_MB}MB. Puede tardar más.` 
    };
  }

  return { valid: true, sizeMB };
}

/**
 * Valida duración de audio (si está disponible)
 * @param {number} durationSeconds - Duración en segundos
 * @returns {{valid: boolean, warning?: string, error?: string}}
 */
export function validateAudioDuration(durationSeconds) {
  if (typeof durationSeconds !== 'number') {
    return { valid: true }; // Duración opcional
  }

  if (durationSeconds < MIN_DURATION_SECONDS) {
    return { 
      valid: false, 
      error: `Audio demasiado corto (${durationSeconds}s). Mínimo: ${MIN_DURATION_SECONDS}s` 
    };
  }

  if (durationSeconds > MAX_DURATION_SECONDS) {
    return { 
      valid: true, 
      warning: `Audio largo (${durationSeconds}s). Recomendado: <${MAX_DURATION_SECONDS}s (5 min)` 
    };
  }

  return { valid: true };
}

/**
 * Validación completa de audio antes de transcribir
 * @param {string} audioUrl - URL del archivo de audio
 * @param {Object} metadata - Metadatos opcionales (size, duration)
 * @returns {{valid: boolean, warnings: string[], errors: string[], details: Object}}
 */
export function validateAudio(audioUrl, metadata = {}) {
  const warnings = [];
  const errors = [];
  const details = {};

  // 1. Validar formato
  const formatCheck = validateAudioFormat(audioUrl);
  if (!formatCheck.valid) {
    errors.push(formatCheck.error);
  } else {
    details.format = formatCheck.format;
  }

  // 2. Validar tamaño (si está disponible)
  if (metadata.size) {
    const sizeCheck = validateAudioSize(metadata.size);
    if (!sizeCheck.valid) {
      errors.push(sizeCheck.error);
    } else {
      details.sizeMB = sizeCheck.sizeMB;
      if (sizeCheck.warning) {
        warnings.push(sizeCheck.warning);
      }
    }
  }

  // 3. Validar duración (si está disponible)
  if (metadata.duration) {
    const durationCheck = validateAudioDuration(metadata.duration);
    if (!durationCheck.valid) {
      errors.push(durationCheck.error);
    } else if (durationCheck.warning) {
      warnings.push(durationCheck.warning);
    }
  }

  return {
    valid: errors.length === 0,
    warnings,
    errors,
    details
  };
}

/**
 * Mensajes de error localizados
 * @param {string} error - Mensaje de error
 * @param {string} language - Código de idioma
 * @returns {string} Mensaje localizado
 */
export function getLocalizedAudioError(error, language = 'es') {
  const errorMessages = {
    'URL inválida': {
      es: '🎤 Audio inválido. Por favor, envía otro audio.',
      en: '🎤 Invalid audio. Please send another audio.',
      fr: '🎤 Audio invalide. Veuillez envoyer un autre audio.',
      it: '🎤 Audio non valido. Per favore invia un altro audio.',
      pt: '🎤 Áudio inválido. Por favor, envie outro áudio.',
      qu: '🎤 Mana allin audio. Ama hina huk audio apachimuy.'
    },
    'formato': { // Contiene "formato"
      es: '🎤 Formato de audio no soportado. Envía: voz, nota de voz o archivo de audio.',
      en: '🎤 Audio format not supported. Send: voice, voice note or audio file.',
      fr: '🎤 Format audio non supporté. Envoyez: voix, note vocale ou fichier audio.',
      it: '🎤 Formato audio non supportato. Invia: voce, nota vocale o file audio.',
      pt: '🎤 Formato de áudio não suportado. Envie: voz, nota de voz ou arquivo de áudio.',
      qu: '🎤 Audio formato mana yanapasqa. Apachiy: kunka, kunka qillqa utaq audio willakuna.'
    },
    'grande': { // Contiene "grande" o "largo"
      es: '🎤 Audio demasiado grande. Máximo: 25MB. Envía uno más corto.',
      en: '🎤 Audio too large. Maximum: 25MB. Send a shorter one.',
      fr: '🎤 Audio trop volumineux. Maximum: 25MB. Envoyez-en un plus court.',
      it: '🎤 Audio troppo grande. Massimo: 25MB. Invia uno più breve.',
      pt: '🎤 Áudio muito grande. Máximo: 25MB. Envie um mais curto.',
      qu: '🎤 Audio ancha hatun. Máximo: 25MB. Huk aswan pisi apachiy.'
    },
    'corto': { // Contiene "corto"
      es: '🎤 Audio demasiado corto. Graba al menos 1 segundo.',
      en: '🎤 Audio too short. Record at least 1 second.',
      fr: '🎤 Audio trop court. Enregistrez au moins 1 seconde.',
      it: '🎤 Audio troppo breve. Registra almeno 1 secondo.',
      pt: '🎤 Áudio muito curto. Grave pelo menos 1 segundo.',
      qu: '🎤 Audio ancha pisi. Grabay 1 segundo nisqamanta.'
    }
  };

  // Buscar mensaje que coincida
  for (const [key, translations] of Object.entries(errorMessages)) {
    if (error.toLowerCase().includes(key.toLowerCase())) {
      return translations[language] || translations.es;
    }
  }

  // Fallback genérico
  const fallback = {
    es: '🎤 No pude procesar tu audio. ¿Puedes escribirlo por texto? 😊',
    en: "🎤 I couldn't process your audio. Could you write it as text? 😊",
    fr: "🎤 Je n'ai pas pu traiter votre audio. Pouvez-vous l'écrire en texte? 😊",
    it: "🎤 Non ho potuto elaborare il tuo audio. Puoi scriverlo come testo? 😊",
    pt: "🎤 Não consegui processar seu áudio. Pode escrever em texto? 😊",
    qu: '🎤 Mana atinichu audio ruwayta. ¿Qillqasqapi apachiwankimanchu? 😊'
  };

  return fallback[language] || fallback.es;
}

// Exportar constantes para tests
export const AUDIO_VALIDATION_CONSTANTS = {
  SUPPORTED_FORMATS,
  MAX_FILE_SIZE_MB,
  MAX_FILE_SIZE_BYTES,
  RECOMMENDED_MAX_MB,
  MAX_DURATION_SECONDS,
  MIN_DURATION_SECONDS
};
