/**
 * Sistema de traducciones centralizado para mensajes del sistema
 * Soporta: Español (es), English (en), 日本語 (ja), Runasimi (qu), Français (fr), Italiano (it)
 */

export const translations = {
  // === MENSAJES DE CONFIRMACIÓN ===
  reservationConfirmed: {
    es: '✅ Tu reserva ha sido confirmada exitosamente',
    en: '✅ Your reservation has been confirmed successfully',
    ja: '✅ ご予約が正常に確認されました',
    qu: '✅ Reservayniyki allin qhawasqañam',
    fr: '✅ Votre réservation a été confirmée avec succès',
    it: '✅ La tua prenotazione è stata confermata con successo'
  },

  paymentReceived: {
    es: '💰 Pago recibido correctamente. ¡Gracias!',
    en: '💰 Payment received successfully. Thank you!',
    ja: '💰 お支払いを正常に受け取りました。ありがとうございます！',
    qu: '💰 Qullqiyki allin chaskisqam. Añaychani!',
    fr: '💰 Paiement reçu avec succès. Merci !',
    it: '💰 Pagamento ricevuto correttamente. Grazie!'
  },

  emailSent: {
    es: '📧 Correo enviado exitosamente',
    en: '📧 Email sent successfully',
    ja: '📧 メールが正常に送信されました',
    qu: '📧 Correo allin kachasqam',
    fr: '📧 Email envoyé avec succès',
    it: '📧 Email inviato con successo'
  },

  calendarEventCreated: {
    es: '📅 Evento agregado a tu calendario',
    en: '📅 Event added to your calendar',
    ja: '📅 カレンダーにイベントが追加されました',
    qu: '📅 Punchaw qillqayniykiman yapasqam',
    fr: '📅 Événement ajouté à votre calendrier',
    it: '📅 Evento aggiunto al tuo calendario'
  },

  languageChanged: {
    es: '🌍 Idioma cambiado a Español',
    en: '🌍 Language changed to English',
    ja: '🌍 言語が日本語に変更されました',
    qu: '🌍 Rimayniyqa Runasimimanñam',
    fr: '🌍 Langue changée en Français',
    it: '🌍 Lingua cambiata in Italiano'
  },

  // === MENSAJES DE ERROR ===
  genericError: {
    es: '❌ Ha ocurrido un error. Por favor intenta nuevamente',
    en: '❌ An error has occurred. Please try again',
    ja: '❌ エラーが発生しました。もう一度お試しください',
    qu: '❌ Pantasqam. Ama hina kaspa, wakmanta ruraykuy',
    fr: '❌ Une erreur est survenue. Veuillez réessayer',
    it: '❌ Si è verificato un errore. Riprova per favore'
  },

  databaseError: {
    es: '❌ Error de base de datos. Contacta soporte',
    en: '❌ Database error. Contact support',
    ja: '❌ データベースエラー。サポートにお問い合わせください',
    qu: '❌ Base de datos pantasqam. Yanapakuqwan rimanakuy',
    fr: '❌ Erreur de base de données. Contactez le support',
    it: '❌ Errore del database. Contatta il supporto'
  },

  invalidDate: {
    es: '❌ Fecha inválida. Usa formato DD/MM/YYYY',
    en: '❌ Invalid date. Use format MM/DD/YYYY',
    ja: '❌ 無効な日付です。YYYY/MM/DD形式を使用してください',
    qu: '❌ Mana allin punchaw. DD/MM/YYYY nisqapi churay',
    fr: '❌ Date invalide. Utilisez le format JJ/MM/AAAA',
    it: '❌ Data non valida. Usa il formato GG/MM/AAAA'
  },

  noAvailability: {
    es: '❌ No hay disponibilidad para esa fecha',
    en: '❌ No availability for that date',
    ja: '❌ その日は空きがありません',
    qu: '❌ Chay punchawpaqqa mana kanchu',
    fr: '❌ Pas de disponibilité pour cette date',
    it: '❌ Nessuna disponibilità per quella data'
  },

  paymentFailed: {
    es: '❌ El pago ha fallado. Intenta nuevamente',
    en: '❌ Payment failed. Please try again',
    ja: '❌ 支払いに失敗しました。もう一度お試しください',
    qu: '❌ Qullqi quyqa pantarurqam. Wakmanta ruraykuy',
    fr: '❌ Le paiement a échoué. Veuillez réessayer',
    it: '❌ Il pagamento è fallito. Riprova per favore'
  },

  // === NOTIFICACIONES ===
  welcomeBack: {
    es: '👋 ¡Bienvenido de vuelta!',
    en: '👋 Welcome back!',
    ja: '👋 お帰りなさい！',
    qu: '👋 Allin kutimuy!',
    fr: '👋 Bon retour !',
    it: '👋 Bentornato!'
  },

  sessionExpired: {
    es: '⏰ Tu sesión ha expirado. Iniciemos de nuevo',
    en: '⏰ Your session has expired. Let\'s start again',
    ja: '⏰ セッションが期限切れです。もう一度始めましょう',
    qu: '⏰ Sesionniykiqa tukukapunñam. Qallarisun',
    fr: '⏰ Votre session a expiré. Recommençons',
    it: '⏰ La tua sessione è scaduta. Ricominciamo'
  },

  reminder24h: {
    es: '🔔 Recordatorio: Tu reserva es mañana',
    en: '🔔 Reminder: Your reservation is tomorrow',
    ja: '🔔 リマインダー：予約は明日です',
    qu: '🔔 Yuyariy: Reservayniykiqa qhayayam',
    fr: '🔔 Rappel : Votre réservation est demain',
    it: '🔔 Promemoria: La tua prenotazione è domani'
  },

  reminder2h: {
    es: '🔔 Recordatorio: Tu reserva es en 2 horas',
    en: '🔔 Reminder: Your reservation is in 2 hours',
    ja: '🔔 リマインダー：予約は2時間後です',
    qu: '🔔 Yuyariy: Reservayniykiqa iskay horaspiñam',
    fr: '🔔 Rappel : Votre réservation est dans 2 heures',
    it: '🔔 Promemoria: La tua prenotazione è tra 2 ore'
  },

  pendingPayment: {
    es: '💳 Tienes un pago pendiente',
    en: '💳 You have a pending payment',
    ja: '💳 保留中のお支払いがあります',
    qu: '💳 Qullqi quy saqisqaykiqa kanraqmi',
    fr: '💳 Vous avez un paiement en attente',
    it: '💳 Hai un pagamento in sospeso'
  },

  // === RESPUESTAS AUTOMÁTICAS ===
  understandingMessage: {
    es: '🤔 Entiendo...',
    en: '🤔 I understand...',
    ja: '🤔 わかりました...',
    qu: '🤔 Intindini...',
    fr: '🤔 Je comprends...',
    it: '🤔 Capisco...'
  },

  processingRequest: {
    es: '⏳ Procesando tu solicitud...',
    en: '⏳ Processing your request...',
    ja: '⏳ リクエストを処理しています...',
    qu: '⏳ Mañakuyniykita rurachkani...',
    fr: '⏳ Traitement de votre demande...',
    it: '⏳ Elaborazione della tua richiesta...'
  },

  oneMinutePlease: {
    es: '⏱️ Un momento por favor...',
    en: '⏱️ One moment please...',
    ja: '⏱️ 少々お待ちください...',
    qu: '⏱️ Ama hina kaspa, huk ratullata...',
    fr: '⏱️ Un instant s\'il vous plaît...',
    it: '⏱️ Un attimo per favore...'
  },

  // === HANDOVERS ENTRE AGENTES ===
  transferringToAluna: {
    es: '🔄 Te conecto con Aluna, nuestra experta en ventas',
    en: '🔄 Connecting you with Aluna, our sales expert',
    ja: '🔄 営業担当のAlunaにおつなぎします',
    qu: '🔄 Alunawan tinkinakiyki, rantiy yachaqninchik',
    fr: '🔄 Je vous mets en contact avec Aluna, notre experte en vente',
    it: '🔄 Ti collego con Aluna, la nostra esperta di vendite'
  },

  transferringToAngela: {
    es: '🔄 Te conecto con Ángela, especialista en salud',
    en: '🔄 Connecting you with Ángela, health specialist',
    ja: '🔄 健康の専門家Ángelaにおつなぎします',
    qu: '🔄 Angelawan tinkinakiyki, qhali kay yachaqnin',
    fr: '🔄 Je vous mets en contact avec Ángela, spécialiste de la santé',
    it: '🔄 Ti collego con Ángela, specialista della salute'
  },

  transferringToAdriana: {
    es: '🔄 Te conecto con Adriana, asesora de seguros',
    en: '🔄 Connecting you with Adriana, insurance advisor',
    ja: '🔄 保険アドバイザーのAdrianaにおつなぎします',
    qu: '🔄 Adrianawan tinkinakiyki, amachay yachaqnin',
    fr: '🔄 Je vous mets en contact avec Adriana, conseillère en assurance',
    it: '🔄 Ti collego con Adriana, consulente assicurativa'
  },

  transferringToEnzo: {
    es: '🔄 Te conecto con Enzo, experto en marketing',
    en: '🔄 Connecting you with Enzo, marketing expert',
    ja: '🔄 マーケティング専門家のEnzoにおつなぎします',
    qu: '🔄 Enzowan tinkinakiyki, marketing yachaqnin',
    fr: '🔄 Je vous mets en contact avec Enzo, expert en marketing',
    it: '🔄 Ti collego con Enzo, esperto di marketing'
  },

  // === VALIDACIONES DE FORMULARIOS ===
  nameRequired: {
    es: '📝 Por favor proporciona tu nombre completo',
    en: '📝 Please provide your full name',
    ja: '📝 フルネームを入力してください',
    qu: '📝 Ama hina kaspa, sutiykita quy',
    fr: '📝 Veuillez fournir votre nom complet',
    it: '📝 Per favore fornisci il tuo nome completo'
  },

  emailRequired: {
    es: '📝 Necesito tu correo electrónico',
    en: '📝 I need your email address',
    ja: '📝 メールアドレスが必要です',
    qu: '📝 Correo electrónicoykita necesitani',
    fr: '📝 J\'ai besoin de votre adresse e-mail',
    it: '📝 Ho bisogno del tuo indirizzo email'
  },

  phoneRequired: {
    es: '📝 Por favor comparte tu número de teléfono',
    en: '📝 Please share your phone number',
    ja: '📝 電話番号を教えてください',
    qu: '📝 Ama hina kaspa, teléfonoykita willay',
    fr: '📝 Veuillez partager votre numéro de téléphone',
    it: '📝 Per favore condividi il tuo numero di telefono'
  },

  invalidEmail: {
    es: '❌ Correo electrónico inválido',
    en: '❌ Invalid email address',
    ja: '❌ 無効なメールアドレス',
    qu: '❌ Mana allin correo electrónico',
    fr: '❌ Adresse e-mail invalide',
    it: '❌ Indirizzo email non valido'
  },

  // === OPCIONES DE RESERVA ===
  selectPlan: {
    es: '🎯 Selecciona un plan:',
    en: '🎯 Select a plan:',
    ja: '🎯 プランを選択してください:',
    qu: '🎯 Huk planata akllay:',
    fr: '🎯 Sélectionnez un forfait :',
    it: '🎯 Seleziona un piano:'
  },

  selectDate: {
    es: '📅 ¿Qué fecha prefieres?',
    en: '📅 What date do you prefer?',
    ja: '📅 ご希望の日付は？',
    qu: '📅 ¿Ima punchawtaq munanki?',
    fr: '📅 Quelle date préférez-vous ?',
    it: '📅 Che data preferisci?'
  },

  selectTime: {
    es: '⏰ ¿A qué hora?',
    en: '⏰ At what time?',
    ja: '⏰ 何時がよろしいですか？',
    qu: '⏰ ¿Ima horapiñaq?',
    fr: '⏰ À quelle heure ?',
    it: '⏰ A che ora?'
  },

  // === DESPEDIDAS ===
  goodbye: {
    es: '👋 ¡Hasta pronto! Estoy aquí cuando me necesites',
    en: '👋 See you soon! I\'m here when you need me',
    ja: '👋 またすぐにお会いしましょう！必要な時はいつでもどうぞ',
    qu: '👋 Tupananchiskama! Kaypiñam kani necesitawaspayki',
    fr: '👋 À bientôt ! Je suis là quand vous avez besoin de moi',
    it: '👋 A presto! Sono qui quando hai bisogno di me'
  },

  thankYou: {
    es: '🙏 ¡Gracias por confiar en Coworkia!',
    en: '🙏 Thank you for trusting Coworkia!',
    ja: '🙏 Coworkiaをご利用いただきありがとうございます！',
    qu: '🙏 Añaychani Coworkiapi confiasqaykimanta!',
    fr: '🙏 Merci de faire confiance à Coworkia !',
    it: '🙏 Grazie per aver scelto Coworkia!'
  }
};

/**
 * Obtiene un mensaje traducido según el idioma del usuario
 * @param {string} key - Clave del mensaje (ej: 'reservationConfirmed')
 * @param {string} language - Código del idioma ('es', 'en', 'ja', 'qu', 'fr', 'it')
 * @returns {string} Mensaje traducido o mensaje en español por defecto
 */
export function getMessage(key, language = 'es') {
  if (!translations[key]) {
    console.warn(`Translation key not found: ${key}`);
    return '';
  }

  const validLanguage = ['es', 'en', 'ja', 'qu', 'fr', 'it'].includes(language) ? language : 'es';
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
