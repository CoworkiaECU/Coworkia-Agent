/**
 * Sistema de traducciones centralizado para mensajes del sistema
 * Soporta: Español (es), English (en), Runasimi/Quechua (qu)
 */

export const translations = {
  // === MENSAJES DE CONFIRMACIÓN ===
  reservationConfirmed: {
    es: '✅ Tu reserva ha sido confirmada exitosamente',
    en: '✅ Your reservation has been confirmed successfully',
    qu: '✅ Reservayniyki allin qhawasqañam',
  },

  paymentReceived: {
    es: '💰 Pago recibido correctamente. ¡Gracias!',
    en: '💰 Payment received successfully. Thank you!',
    qu: '💰 Qullqiyki allin chaskisqam. Añaychani!',
  },

  emailSent: {
    es: '📧 Correo enviado exitosamente',
    en: '📧 Email sent successfully',
    qu: '📧 Correo allin kachasqam',
  },

  calendarEventCreated: {
    es: '📅 Evento agregado a tu calendario',
    en: '📅 Event added to your calendar',
    qu: '📅 Punchaw qillqayniykiman yapasqam',
  },

  languageChanged: {
    es: '🌍 Idioma cambiado a Español',
    en: '🌍 Language changed to English',
    qu: '🌍 Rimayniyqa Runasimimanñam',
  },

  // === MENSAJES DE ERROR ===
  genericError: {
    es: '❌ Ha ocurrido un error. Por favor intenta nuevamente',
    en: '❌ An error has occurred. Please try again',
    qu: '❌ Pantasqam. Ama hina kaspa, wakmanta ruraykuy',
  },

  databaseError: {
    es: '❌ Error de base de datos. Contacta soporte',
    en: '❌ Database error. Contact support',
    qu: '❌ Base de datos pantasqam. Yanapakuqwan rimanakuy',
  },

  invalidDate: {
    es: '❌ Fecha inválida. Usa formato DD/MM/YYYY',
    en: '❌ Invalid date. Use format MM/DD/YYYY',
    qu: '❌ Mana allin punchaw. DD/MM/YYYY nisqapi churay',
  },

  noAvailability: {
    es: '❌ No hay disponibilidad para esa fecha',
    en: '❌ No availability for that date',
    qu: '❌ Chay punchawpaqqa mana kanchu',
  },

  paymentFailed: {
    es: '❌ El pago ha fallado. Intenta nuevamente',
    en: '❌ Payment failed. Please try again',
    qu: '❌ Qullqi quyqa pantarurqam. Wakmanta ruraykuy',
  },

  // === NOTIFICACIONES ===
  welcomeBack: {
    es: '👋 ¡Bienvenido de vuelta!',
    en: '👋 Welcome back!',
    qu: '👋 Allin kutimuy!',
  },

  sessionExpired: {
    es: '⏰ Tu sesión ha expirado. Iniciemos de nuevo',
    en: '⏰ Your session has expired. Let\'s start again',
    qu: '⏰ Sesionniykiqa tukukapunñam. Qallarisun',
  },

  reminder24h: {
    es: '🔔 Recordatorio: Tu reserva es mañana',
    en: '🔔 Reminder: Your reservation is tomorrow',
    qu: '🔔 Yuyariy: Reservayniykiqa qhayayam',
  },

  reminder2h: {
    es: '🔔 Recordatorio: Tu reserva es en 2 horas',
    en: '🔔 Reminder: Your reservation is in 2 hours',
    qu: '🔔 Yuyariy: Reservayniykiqa iskay horaspiñam',
  },

  pendingPayment: {
    es: '💳 Tienes un pago pendiente',
    en: '💳 You have a pending payment',
    qu: '💳 Qullqi quy saqisqaykiqa kanraqmi',
  },

  // === RESPUESTAS AUTOMÁTICAS ===
  understandingMessage: {
    es: '🤔 Entiendo...',
    en: '🤔 I understand...',
    qu: '🤔 Intindini...',
  },

  processingRequest: {
    es: '⏳ Procesando tu solicitud...',
    en: '⏳ Processing your request...',
    qu: '⏳ Mañakuyniykita rurachkani...',
  },

  oneMinutePlease: {
    es: '⏱️ Un momento por favor...',
    en: '⏱️ One moment please...',
    qu: '⏱️ Ama hina kaspa, huk ratullata...',
  },

  // === HANDOVERS ENTRE AGENTES ===
  transferringToAluna: {
    es: '🔄 Te conecto con Aluna, nuestra experta en ventas',
    en: '🔄 Connecting you with Aluna, our sales expert',
    qu: '🔄 Alunawan tinkinakiyki, rantiy yachaqninchik',
  },

  transferringToAngela: {
    es: '🔄 Te conecto con Ángela, especialista en salud',
    en: '🔄 Connecting you with Ángela, health specialist',
    qu: '🔄 Angelawan tinkinakiyki, qhali kay yachaqnin',
  },

  transferringToAdriana: {
    es: '🔄 Te conecto con Adriana, asesora de seguros',
    en: '🔄 Connecting you with Adriana, insurance advisor',
    qu: '🔄 Adrianawan tinkinakiyki, amachay yachaqnin',
  },

  transferringToEnzo: {
    es: '🔄 Te conecto con Enzo, experto en marketing',
    en: '🔄 Connecting you with Enzo, marketing expert',
    qu: '🔄 Enzowan tinkinakiyki, marketing yachaqnin',
  },

  // === VALIDACIONES DE FORMULARIOS ===
  nameRequired: {
    es: '📝 Por favor proporciona tu nombre completo',
    en: '📝 Please provide your full name',
    qu: '📝 Ama hina kaspa, sutiykita quy',
  },

  emailRequired: {
    es: '📝 Necesito tu correo electrónico',
    en: '📝 I need your email address',
    qu: '📝 Correo electrónicoykita necesitani',
  },

  phoneRequired: {
    es: '📝 Por favor comparte tu número de teléfono',
    en: '📝 Please share your phone number',
    qu: '📝 Ama hina kaspa, teléfonoykita willay',
  },

  invalidEmail: {
    es: '❌ Correo electrónico inválido',
    en: '❌ Invalid email address',
    qu: '❌ Mana allin correo electrónico',
  },

  // === OPCIONES DE RESERVA ===
  selectPlan: {
    es: '🎯 Selecciona un plan:',
    en: '🎯 Select a plan:',
    qu: '🎯 Huk planata akllay:',
  },

  selectDate: {
    es: '📅 ¿Qué fecha prefieres?',
    en: '📅 What date do you prefer?',
    qu: '📅 ¿Ima punchawtaq munanki?',
  },

  selectTime: {
    es: '⏰ ¿A qué hora?',
    en: '⏰ At what time?',
    qu: '⏰ ¿Ima horapiñaq?',
  },

  // === DESPEDIDAS ===
  goodbye: {
    es: '👋 ¡Hasta pronto! Estoy aquí cuando me necesites',
    en: '👋 See you soon! I\'m here when you need me',
    qu: '👋 Tupananchiskama! Kaypiñam kani necesitawaspayki',
  },

  thankYou: {
    es: '🙏 ¡Gracias por confiar en Coworkia!',
    en: '🙏 Thank you for trusting Coworkia!',
    qu: '🙏 Añaychani Coworkiapi confiasqaykimanta!',
  }
};

/**
 * Obtiene un mensaje traducido según el idioma del usuario
 * @param {string} key - Clave del mensaje (ej: 'reservationConfirmed')
 * @param {string} language - Código del idioma ('es', 'en', 'qu')
 * @returns {string} Mensaje traducido o mensaje en español por defecto
 */
export function getMessage(key, language = 'es') {
  if (!translations[key]) {
    console.warn(`Translation key not found: ${key}`);
    return '';
  }

  const validLanguage = ['es', 'en', 'fr', 'it', 'pt', 'qu'].includes(language) ? language : 'es';
  return translations[key][validLanguage] || translations[key]['es'];
}

/**
 * Obtiene múltiples mensajes traducidos
 * @param {string[]} keys - Array de claves de mensajes
 * @param {string} language - Código del idioma
 * @returns {Object} Objeto con los mensajes traducidos
 */
export function getMessages(keys, language = 'es') {
  const messages = {};
  keys.forEach(key => {
    messages[key] = getMessage(key, language);
  });
  return messages;
}

/**
 * Reemplaza variables en mensajes traducidos
 * @param {string} message - Mensaje con placeholders {variable}
 * @param {Object} variables - Objeto con variables a reemplazar
 * @returns {string} Mensaje con variables reemplazadas
 */
export function formatMessage(message, variables = {}) {
  let formatted = message;
  Object.keys(variables).forEach(key => {
    formatted = formatted.replace(new RegExp(`{${key}}`, 'g'), variables[key]);
  });
  return formatted;
}

export default { translations, getMessage, getMessages, formatMessage };
