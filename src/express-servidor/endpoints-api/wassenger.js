// src/express-servidor/endpoints-api/wassenger.js
import { Router } from 'express';

import { procesarMensaje } from '../../deteccion-intenciones/orquestador.js';
import { complete, transcribeAudio } from '../../servicios-ia/openai.js';
import { loggers } from '../../utils/logger.js';
import { checkRateLimit, recordMessage } from '../../utils/rate-limiter.js';
import { validateAudio, getLocalizedAudioError } from '../../utils/audio-validator.js';

import { processPaymentReceipt, isReceiptImage } from '../../servicios/payment-receipts.js';
import { processMembershipPayment, findPendingMembershipLead } from '../../servicios/membership-payment-verification.js';
import { analyzeMedicalImage } from '../../servicios/angela-vision-analysis.js';
import { processConfirmationResponse, hasPendingConfirmation, isPositiveResponse, isNegativeResponse } from '../../servicios/confirmation-flow.js';
import { enhanceAuroraResponse } from '../../servicios/aurora-confirmation-helper.js';
import { addPhoto, getSession, completeSession, canProcessQuote, startTimeout, queueTask, clearQueue } from '../../servicios/axel-photo-collector.js';
import { processAxelFormMessage, generateFormSummary } from '../../servicios/axel-quote-form.js';
import { generateQuoteCode } from '../../servicios/axel-quote-code.js';
import { analyzeCollisionPhotos } from '../../servicios/axel-vision-analysis.js';
import { generateQuote } from '../../servicios/axel-quote-generator.js';
import { sendQuoteEmail } from '../../servicios/axel-quote-email.js';
import { processMembershipForm } from '../../servicios/membership-form.js';

import { detectCampaignMessage, personalizeCampaignResponse, CAMPAIGN_PROMPTS } from '../../servicios/campaign-prompts.js';
import { validateWebhookSignature, rateLimitByPhone } from '../middleware/webhook-security.js';

import { processMessageWithForm, clearForm as clearPartialForm } from '../../servicios/partial-reservation-form.js';
import { buildReplyContext, getReplyContextMetadata } from '../../servicios/reply-context-handler.js';
import { getUserLanguage, detectLanguageCommand, getLanguageChangeConfirmation } from '../../utils/language-detector.js';
import { processMessage as splitLongMessage, cleanPromptMarkers } from '../../utils/message-splitter.js';

import {
  loadProfile,
  saveProfile,
  saveInteraction,
  loadConversationHistory,
  saveConversationMessage,
  savePartialForm,
  getPartialForm,
  getPendingConfirmation
} from '../../perfiles-interacciones/memoria-sqlite.js';

import { loadProfileWithTimeout } from '../../utils/timeout-helpers.js';
import { dispatchHttpRequest } from '../../servicios/external-dispatcher.js';
import { clearJustConfirmed, clearPendingConfirmation } from '../../servicios/reservation-state.js';

const router = Router();

/* ─────────────────────────────────────────────────────────────
   🔒 Seguridad & estabilidad global (NO dentro del webhook)
───────────────────────────────────────────────────────────── */
if (!globalThis.__AURORA_CORE_UNHANDLED__) {
  globalThis.__AURORA_CORE_UNHANDLED__ = true;
  process.on('unhandledRejection', (reason) => {
    loggers.webhook.error('Unhandled promise rejection', {}, reason);
  });
  process.on('uncaughtException', (err) => {
    loggers.webhook.error('Uncaught exception', {}, err);
  });
}

/* ─────────────────────────────────────────────────────────────
   🧼 Helpers
───────────────────────────────────────────────────────────── */
function safeStr(v) {
  return (typeof v === 'string' ? v : '').trim();
}

function nowUnix() {
  return Math.floor(Date.now() / 1000);
}

function isIncomingEvent(evt) {
  return evt && evt.includes('message:in') && !evt.includes('message:out');
}

function isGroupOrBroadcast(userId) {
  return userId.includes('@g.us') || userId.includes('@broadcast');
}

function normalizeUserId(data) {
  return safeStr(data.fromNumber || data.from || '');
}

function normalizeName(data) {
  return safeStr(data.chat?.name || data.contact?.name || data.fromName || data.name || '');
}

function normalizeText(data) {
  return safeStr(data.body || data.message || '');
}

function normalizeType(data) {
  return safeStr(data.type || 'text') || 'text';
}

function buildMediaUrl(data) {
  let mediaUrl = data.mediaUrl || data.media?.url || null;

  // Wassenger a veces entrega links.download relativo
  if (!mediaUrl && data.media?.links?.download) {
    const token = process.env.WASSENGER_TOKEN;
    mediaUrl = `https://api.wassenger.com${data.media.links.download}?token=${token}`;
  }

  return mediaUrl;
}

/**
 * 🧹 Limpia nombres de WhatsApp Business para extraer nombre real
 * Remueve emojis, keywords empresariales, números de teléfono
 */
function cleanWhatsAppName(whatsappName) {
  if (!whatsappName || typeof whatsappName !== 'string') return null;
  
  let cleaned = whatsappName.trim();
  
  // Remover emojis comunes
  cleaned = cleaned.replace(/[🏠🏢💼🔥⭐🎯💪👑🚀💯😊😎🤝🌟❤️🎉💻📱🏆☎️]/g, '');
  
  // Remover texto común de WhatsApp Business
  const businessKeywords = [
    'whatsapp business', 'business', 'empresa', 'company', 
    'servicio', 'service', 'oficial', 'official', '\\+593', '\\+1',
    'contacto', 'contact', 'ventas', 'sales', 'info', 'atención'
  ];
  
  for (const keyword of businessKeywords) {
    const regex = new RegExp(keyword, 'gi');
    cleaned = cleaned.replace(regex, '');
  }
  
  // Remover números de teléfono
  cleaned = cleaned.replace(/\+?\d{1,4}[\s-]?\d{6,}/g, '');
  
  // Limpiar espacios y caracteres especiales (mantener acentos españoles)
  cleaned = cleaned.replace(/[^\w\sñáéíóúüÑÁÉÍÓÚÜ]/g, ' ').replace(/\s+/g, ' ').trim();
  
  // Solo tomar el primer nombre si es muy largo
  if (cleaned.length > 20) {
    cleaned = cleaned.split(' ')[0];
  }
  
  // Capitalizar cada palabra (Title Case)
  if (cleaned.length > 0) {
    cleaned = cleaned
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }
  
  return cleaned.length > 1 ? cleaned : null;
}

/**
 * 🔍 Detecta nombre desde mensaje de presentación
 */
function extractNameFromMessage(message) {
  if (!message) return null;
  
  // Patrones comunes de presentación
  const patterns = [
    /(?:soy|me llamo|mi nombre es|soy de)\s+([A-Za-záéíóúüñÁÉÍÓÚÜÑ]+)/i,
    /(?:hola|buenos días|buenas tardes|buenas noches),?\s*(?:soy)?\s+([A-Za-záéíóúüñÁÉÍÓÚÜÑ]+)/i
  ];
  
  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match && match[1].length > 1) {
      return match[1].charAt(0).toUpperCase() + match[1].slice(1).toLowerCase();
    }
  }
  
  return null;
}

function buildMessageEnvelope({ userId, name, text, type, mediaUrl, data, evt }) {
  // Esto es lo que “ve” Aurora Core. No hay agentes aquí.
  return {
    channel: 'whatsapp',
    provider: 'wassenger',
    event: evt,
    userId,
    name,
    type,
    text,
    mediaUrl,
    timestamp: data.timestamp || nowUnix(),
    raw: {
      // guardamos lo mínimo útil (sin reventar logs)
      fromMe: data.fromMe,
      isBot: data.isBot,
      mime: data.media?.mime
    }
  };
}

async function enviarWhatsApp(numero, mensaje) {
  const WASSENGER_TOKEN = process.env.WASSENGER_TOKEN;
  const WASSENGER_DEVICE = process.env.WASSENGER_DEVICE || process.env.WASSENGER_DEVICE_ID;
  const BOT_NUMBER = process.env.WHATSAPP_BOT_NUMBER || process.env.WASSENGER_DEVICE_ID || process.env.WASSENGER_DEVICE;

  if (!WASSENGER_TOKEN || !WASSENGER_DEVICE) {
    console.warn('[WASSENGER] Token o Device no configurado');
    return { ok: false, error: 'NO_WASSENGER_CONFIG' };
  }

  // No auto-mensajearse
  if (BOT_NUMBER && numero.includes(String(BOT_NUMBER).replace(/\D/g, ''))) {
    console.warn('[WASSENGER] Intento de enviar mensaje al propio bot bloqueado');
    return { ok: false, error: 'SELF_MESSAGE_BLOCKED' };
  }

  try {
    const response = await dispatchHttpRequest({
      url: 'https://api.wassenger.com/v1/messages',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Token: WASSENGER_TOKEN },
      body: JSON.stringify({ phone: numero, message: mensaje, device: WASSENGER_DEVICE }),
      circuitId: 'wassenger:messages',
      timeoutMs: 8000,
      maxRetries: 2
    });

    const data = await response.json().catch(() => ({}));
    
    if (!response.ok) {
      loggers.wassenger.warn('Failed to send message', { userId: numero, status: response.status });
    }
    
    return { ok: response.ok, data };
  } catch (error) {
    loggers.wassenger.error('Error sending message', { userId: numero }, error);
    return { ok: false, error: error.message };
  }
}

function detectBotLight(data, userId) {
  // Mantenerlo mínimo (sin “matar” humanos por error)
  if (data.isBot === true || data.type === 'bot' || data.fromBot === true) return { detected: true, reason: 'explicit_isBot' };
  if (isGroupOrBroadcast(userId)) return { detected: true, reason: 'group_or_broadcast' };
  return { detected: false, reason: null };
}

/**
 * 🎯 Maneja resultado de formulario de forma consistente para TODOS los agentes
 * Función compartida - DRY principle
 * Evita duplicación de lógica entre Aurora, Aluna, etc.
 * 
 * @param {Object} formResult - Resultado del procesamiento del formulario
 * @param {string} userId - ID del usuario
 * @param {string} agentName - Nombre del agente (AURORA, ALUNA, etc.)
 * @param {Object} profile - Perfil del usuario
 * @returns {boolean} - true si manejó el resultado y debe hacer return, false si debe continuar
 */
async function handleFormResult(formResult, userId, agentName, profile) {
  if (!formResult) return false;

  // 🚨 Validaciones del formulario (ej: domingo/feriado) → respuesta inmediata
  if (formResult.validationError) {
    const errorMessage = formResult.validationError.message;
    await enviarWhatsApp(userId, errorMessage);
    await saveConversationMessage(userId, { role: 'assistant', content: errorMessage, agent: agentName });
    await saveInteraction({
      userId,
      agent: agentName,
      agentName: agentName === 'AURORA' ? 'Aurora Core' : agentName,
      intentReason: 'validation_error',
      input: formResult.userMessage || '',
      output: errorMessage,
      meta: { errorType: formResult.validationError.type }
    });
    if (agentName === 'AURORA') {
      await clearPartialForm(userId);
    }
    return true; // Manejado - hacer return
  }

  // ✅ Formulario completo → mensaje de confirmación
  if (formResult.isComplete) {
    const confirmationMessage = `Perfecto! Déjame confirmar todos los datos:

📋 RESUMEN:
${formResult.summary}

${formResult.benefits ? `✨ BENEFICIOS INCLUIDOS:\n${formResult.benefits}\n\n` : ''}¿Todo correcto? Responde SI para confirmar 🏢`;

    await enviarWhatsApp(userId, confirmationMessage);
    await saveConversationMessage(userId, { role: 'assistant', content: confirmationMessage, agent: agentName });
    return true; // Manejado - hacer return
  }

  // 📝 Formulario incompleto → siguiente pregunta
  if (formResult.needsMoreInfo && formResult.nextQuestion) {
    await enviarWhatsApp(userId, formResult.nextQuestion);
    await saveConversationMessage(userId, { role: 'assistant', content: formResult.nextQuestion, agent: agentName });
    return true; // Manejado - hacer return
  }

  return false; // No manejado - continuar flujo normal
}

/**
 * 🔍 Detecta si el mensaje es continuación de un formulario de reserva
 * Reconoce patrones como: email, "ya te dije", horarios, fechas, personas
 */
function detectFormContinuation(text) {
  if (!text) return false;
  
  const continuationPatterns = [
    /mi\s+(email|correo|mail|e-mail)/i,
    /ya\s+te\s+(dije|dij[eé]|mencion[eé]|coment[eé]|dí|di)/i,
    /te\s+(dije|mencion[eé]|coment[eé])/i,
    /somos\s+\d+/i,
    /\d+\s+personas?/i,
    /(voy|vamos|iremos)\s+(con|a ser)/i,
    /mi\s+nombre\s+es/i,
    /\w+@\w+\.\w+/i, // Email pattern
    /\d{4}[-\/]\d{1,2}[-\/]\d{1,2}/i, // Fecha completa
    /(mañana|ma\u00f1ana|hoy|pasado\s+ma\u00f1ana|tarde|noche)/i,
    /(\d{1,2})(:|\.)?(\d{2})?\s*(am|pm|AM|PM)/i, // Horarios
    /a\s+las\s+\d+/i, // "a las 9"
    /para\s+(hoy|mañana|ma\u00f1ana)/i,
    /el\s+(lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado|domingo)/i,
    /\b(efectivo|tarjeta|transferencia|cash|credito|crédit|débito|debito|transfer)\b/i // Métodos de pago
  ];
  
  return continuationPatterns.some(pattern => pattern.test(text));
}/* ─────────────────────────────────────────────────────────────
   💰 AXEL QUOTE PROCESSOR
───────────────────────────────────────────────────────────── */
async function processAxelQuote(userId, photoUrls, profile) {
  const startTime = Date.now();
  const DELAY_BETWEEN_MESSAGES = 800; // 800ms entre mensajes para garantizar orden
  
  try {
    loggers.axel.info('Starting quote processing', { userId, photoCount: photoUrls.length });
    
    // 1. Procesar formulario - verificar si tenemos todos los datos
    const formResult = await processAxelFormMessage(userId, '');
    
    if (formResult.needsMoreInfo) {
      // Faltan datos del formulario
      console.log('[AXEL-QUOTE] ⏳ Formulario incompleto, solicitando datos...');
      await enviarWhatsApp(userId, `Perfecto! Ya tengo las fotos 📸\n\nAhora necesito algunos datos para preparar tu cotización:\n\n${formResult.prompt}`);
      return { success: true, needsMoreData: true };
    }
    
    // 2. Analizar fotos con Vision AI
    console.log('[AXEL-QUOTE] 📤 Enviando mensaje: Analizando daños...');
    await enviarWhatsApp(userId, `Analizando daños con IA... 🤖`);
    await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_MESSAGES));
    
    loggers.axel.info('Analyzing collision photos', { userId, photoCount: photoUrls.length });
    const visionAnalysis = await analyzeCollisionPhotos(photoUrls);
    
    if (!visionAnalysis.success) {
      await enviarWhatsApp(userId, `Disculpa, tuve un problema analizando las fotos. ¿Podrías enviarlas nuevamente?`);
      return { success: false, error: visionAnalysis.error };
    }
    
    // 3. Generar cotización con IA
    console.log('[AXEL-QUOTE] 📤 Enviando mensaje: Preparando cotización...');
    await enviarWhatsApp(userId, `Preparando cotización personalizada... 📋`);
    await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_MESSAGES));
    
    const quoteResult = await generateQuote({
      vehicleData: formResult.data,
      damageAnalysis: visionAnalysis,
      photoUrls
    });
    
    if (!quoteResult.success) {
      await enviarWhatsApp(userId, `Hubo un problema generando la cotización. Déjame contactarte en un momento.`);
      return { success: false, error: quoteResult.error };
    }
    
    // 4. Generar código único
    const { code: quoteCode } = await generateQuoteCode();
    
    // 5. Enviar cotización por WhatsApp
    console.log('[AXEL-QUOTE] 📤 Enviando cotización final...');
    const whatsappMessage = `
🎯 *COTIZACIÓN PAINTBULL*

${quoteResult.quote}

📋 *Código:* ${quoteCode}

---

📧 *Te envío copia detallada por email...*

_The PaintBull - Expertos en colisiones_ 🚗💥
    `.trim();
    
    await enviarWhatsApp(userId, whatsappMessage);
    await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_MESSAGES));
    
    // 6. Enviar email con cotización formal
    if (formResult.data.email) {
      const emailResult = await sendQuoteEmail({
        customerName: formResult.data.nombre || profile.whatsappDisplayName || 'Cliente',
        customerEmail: formResult.data.email,
        vehicleData: formResult.data,
        damageAnalysis: visionAnalysis.analysis,
        quote: quoteResult.quote,
        priceRange: quoteResult.priceRange,
        photoUrls: photoUrls,
        quoteCode: quoteCode
      });
      
      if (emailResult.success) {
        console.log('[AXEL-QUOTE] 📤 Enviando confirmación de email...');
        await enviarWhatsApp(userId, `✅ Email enviado a ${formResult.data.email}\n\nRevisa tu bandeja de entrada (y spam por si acaso).`);
      } else {
        console.error('[AXEL-QUOTE] ❌ Error enviando email:', emailResult.error);
      }
    }
    
    // 7. Cotización completada - Axel permanece activo
    // Usuario puede seguir consultando con Axel sobre la cotización
    // Para cambiar de agente, usuario debe usar @aurora, @aluna, etc.
    
    // ⏱️ T14: Limpiar transacción (cotización enviada exitosamente)
    profile.transactionStartedAt = null;
    profile.transactionAgent = null;
    profile.followUpSentAt = null;
    await saveProfile(userId, profile);
    console.log('[T14] ✅ Transacción completada (cotización enviada):', { userId, quoteCode });
    
    const duration = Date.now() - startTime;
    loggers.axel.timing('Quote processing complete', duration, { userId, quoteCode });
    
    return { success: true, quoteCode };
    
  } catch (error) {
    loggers.axel.error('Quote processing failed', { userId }, error);
    await enviarWhatsApp(userId, `Hubo un problema técnico. Déjame contactarte manualmente para ayudarte.`);
    return { success: false, error: error.message };
  }
}
function isOldMessage(data) {
  const ts = Number(data.timestamp || 0);
  if (!ts) return false;
  const diff = nowUnix() - ts;
  return diff > 3600; // 1h
}

function isCasualGreetingOnly(text) {
  const t = (text || '').toLowerCase().trim();
  return [
    /^hola[!.?\s]*$/,
    /^hi[!.?\s]*$/,
    /^hey[!.?\s]*$/,
    /^buenas[!.?\s]*$/,
    /^buenos días[!.?\s]*$/,
    /^buenas tardes[!.?\s]*$/,
    /^buenas noches[!.?\s]*$/,
    /^qué tal[!.?\s]*$/,
    /^como estas[!.?\s]*$/,
    /^hola aurora[!.?\s]*$/,
    /^hola como estas[!.?\s]*$/
  ].some(r => r.test(t));
}

function isReservationIntent(text) {
  const t = (text || '').toLowerCase();
  const reservationKeywords = ['reserva', 'reservar', 'hot desk', 'sala', 'espacio', 'quiero venir', 'me gustaría'];
  const questionKeywords = ['servicios', 'ofrecen', 'tienen', 'precios', 'cuesta', 'quiero saber', 'información', 'ubicación', 'donde', 'horario'];
  if (isCasualGreetingOnly(text)) return false;
  return reservationKeywords.some(k => t.includes(k)) || questionKeywords.some(k => t.includes(k));
}

/* ─────────────────────────────────────────────────────────────
   ✅ Webhook POST (tonto + rápido)
───────────────────────────────────────────────────────────── */
router.post('/webhooks/wassenger', validateWebhookSignature, rateLimitByPhone, async (req, res) => {
  const wassengerEnabled = process.env.WASSENGER_ENABLED !== 'false';
  if (!wassengerEnabled) {
    return res.json({ ok: true, ignored: true, reason: 'wassenger_disabled' });
  }

  const body = req.body || {};
  const evt = safeStr(body.event || '');
  const data = body.data || {};
  const debug = process.env.DEBUG_MODE === 'true';
  const isProd = process.env.NODE_ENV === 'production';

  if (!evt || !data) {
    return res.status(400).json({ ok: false, error: 'INVALID_PAYLOAD' });
  }

  // Sólo entrantes
  if (!isIncomingEvent(evt)) {
    return res.json({ ok: true, ignored: true, reason: 'not_incoming_message' });
  }

  // Responder inmediato para evitar timeouts
  res.json({ ok: true, processing: 'async' });

  // Background
  setImmediate(async () => {
    const userId = normalizeUserId(data);
    const name = normalizeName(data);
    let text = normalizeText(data);
    const type = normalizeType(data);
    const mediaUrl = buildMediaUrl(data);

    if (debug) {
      console.log('[WASSENGER] Incoming:', {
        event: evt,
        userId: userId || 'NULL',
        type,
        hasText: !!text,
        hasMedia: !!mediaUrl,
        prod: isProd
      });
    }

    if (!userId) return;

    loggers.webhook.info('Processing incoming message', { userId, type, hasMedia: !!mediaUrl });

    // Filtros básicos (no destructivos)
    const BOT_NUMBER = process.env.WHATSAPP_BOT_NUMBER || process.env.WASSENGER_DEVICE_ID || process.env.WASSENGER_DEVICE;
    if (BOT_NUMBER && userId.includes(String(BOT_NUMBER).replace(/\D/g, ''))) return;
    if (data.fromMe === true || data.fromMe === 'true') return;
    if (isOldMessage(data)) return;

    const botCheck = detectBotLight(data, userId);
    if (botCheck.detected) {
      if (debug) console.log('[WASSENGER] Ignorado (bot):', botCheck.reason);
      return;
    }

    // 🚦 Rate limiting - Prevenir spam/abuso
    const rateLimitCheck = checkRateLimit(userId);
    if (!rateLimitCheck.allowed) {
      const message = rateLimitCheck.reason === 'minute_limit'
        ? `⏱️ Por favor, espera ${rateLimitCheck.retryAfter} segundos antes de enviar más mensajes.\n\nLímite: ${rateLimitCheck.limit} mensajes por minuto.`
        : `⏱️ Has alcanzado el límite de mensajes por hora.\n\nIntenta nuevamente en ${Math.ceil(rateLimitCheck.retryAfter / 60)} minutos.`;
      
      await enviarWhatsApp(userId, message);
      return;
    }

    // 🚫 BLOQUEO: Tipos de archivo NO permitidos (stickers, documentos, ubicaciones, contactos)
    // Solo permitimos: text, image, audio, voice, ptt, video (en casos específicos)
    const BLOCKED_TYPES = ['sticker', 'document', 'location', 'contact', 'vcard', 'poll', 'live_location'];
    
    if (BLOCKED_TYPES.includes(type)) {
      console.log(`[WEBHOOK] 🚫 Tipo bloqueado: ${type} de usuario ${userId}`);
      
      // Obtener idioma del usuario para mensaje personalizado
      const current = await loadProfileWithTimeout(loadProfile, userId, 5000).catch(() => ({})) || {};
      const userLanguage = current.preferredLanguage || 'es';
      
      const blockedMessages = {
        es: '📝 Por favor envía tu mensaje por texto, imagen o audio.\n\nNo puedo procesar este tipo de archivo.',
        en: '📝 Please send your message as text, image or audio.\n\nI cannot process this type of file.',
        qu: '📝 Ama hina willayta qillqasqapi, imaynapi utaq uyarinapaq apachimuy.\n\nMana atinichu kay laya willakuna ruwayta.'
      };
      
      await enviarWhatsApp(userId, blockedMessages[userLanguage] || blockedMessages.es);
      return; // 🛑 No procesar
    }

    // 🎤 Voz → transcribir (MULTIIDIOMA + VALIDACIÓN)
    if (type === 'audio' || type === 'voice' || type === 'ptt') {
      if (!mediaUrl) return;
      
      // Obtener idioma del usuario (si ya está guardado)
      const current = await loadProfileWithTimeout(loadProfile, userId, 5000).catch(() => ({})) || {};
      const userLanguage = current.preferredLanguage || 'es';
      
      console.log(`[Whisper] 🎤 Procesando audio para usuario ${userId} en idioma: ${userLanguage}`);
      
      // ✅ Validar audio antes de transcribir
      const validation = validateAudio(mediaUrl);
      
      if (!validation.valid) {
        console.error('[Whisper] ❌ Audio inválido:', validation.errors);
        const errorMsg = getLocalizedAudioError(validation.errors[0], userLanguage);
        await enviarWhatsApp(userId, errorMsg);
        return;
      }
      
      // ⚠️ Warnings (tamaño grande, etc.)
      if (validation.warnings.length > 0) {
        console.warn('[Whisper] ⚠️ Advertencias:', validation.warnings);
      }
      
      // 🎤 Transcribir
      const tr = await transcribeAudio(mediaUrl, {
        language: userLanguage,
        agentName: 'orquestador',
        userName: name || userId
      });
      
      if (!tr?.success || !tr?.text) {
        console.error('[Whisper] ❌ Error en transcripción:', tr?.error);
        const errorMsg = getLocalizedAudioError(tr?.error || 'Error desconocido', userLanguage);
        await enviarWhatsApp(userId, errorMsg);
        return;
      }
      
      text = tr.text;
      console.log(`[Whisper] ✅ Audio transcrito (${tr.language}):`, text.substring(0, 100));
    }

    // Construir “evento” para Aurora Core
    const envelope = buildMessageEnvelope({ userId, name, text, type, mediaUrl, data, evt });

    // Perfil + historial
    const current = await loadProfileWithTimeout(loadProfile, userId, 5000).catch(() => ({})) || {};
    let conversationHistory = await loadConversationHistory(userId, 10).catch(() => []);

    // ✅ Registrar mensaje procesado para rate limiting
    recordMessage(userId);

    // 🌍 DETECCIÓN DE IDIOMA (LIMPIA) - Solo primer mensaje
    // Idiomas soportados: español (default), inglés (todos), quechua (solo Angela)
    const isFirstMessage = !current.preferredLanguage;
    let userLanguage = current.preferredLanguage || 'es';
    
    if (isFirstMessage && text) {
      const detected = getUserLanguage(text, 'es');
      
      // Solo cambiar a inglés si hay alta confianza
      if (detected.language === 'en' && detected.confidence > 0.5) {
        userLanguage = 'en';
        console.log('[LANGUAGE] 🌍 Primer mensaje en inglés detectado');
      }
      // Quechua solo para Angela (si algún día lo necesita)
      else if (detected.language === 'qu' && detected.confidence > 0.6) {
        userLanguage = 'qu';
        console.log('[LANGUAGE] 🌍 Primer mensaje en quechua detectado');
      } else {
        // Español detectado o default
        userLanguage = 'es';
        console.log('[LANGUAGE] 🌍 Primer mensaje en español detectado (o default)');
      }
      
      // ✅ SIEMPRE guardar idioma detectado (incluso si es español)
      current.preferredLanguage = userLanguage;
      await saveProfile(userId, { ...current, preferredLanguage: userLanguage });
      console.log(`[LANGUAGE] ✅ Idioma guardado en BD: ${userLanguage}`);
    }

    // Actualizar perfil mínimo
    const ahoraISO = new Date().toISOString();
    const lastMessageAt = current.lastMessageAt ? new Date(current.lastMessageAt).getTime() : 0;
    const minutos = lastMessageAt ? (Date.now() - lastMessageAt) / (1000 * 60) : 999;
    const conversacionEnCurso = minutos < 10;

    // 🆕 DETECCIÓN INTELIGENTE DEL NOMBRE (rescatado del backup v230)
    // PRIORIDAD: 1) Nombre de WhatsApp actual, 2) Nombre en BD, 3) Extraer del mensaje
    let detectedName = null;
    const firstVisit = current?.firstVisit === undefined ? true : current.firstVisit;
    
    // 🔍 LOG DEBUG: Verificar qué nombre está guardado vs. lo que llega de WhatsApp
    console.log(`[NAME DEBUG] userId: ${userId}`);
    console.log(`[NAME DEBUG] current.name (BD): "${current.name || 'NULL'}"`);
    console.log(`[NAME DEBUG] name (WhatsApp): "${name || 'NULL'}"`);
    console.log(`[NAME DEBUG] current.whatsappDisplayName (BD): "${current.whatsappDisplayName || 'NULL'}"`);
    console.log(`[NAME DEBUG] firstVisit: ${firstVisit}`);
    
    // 1️⃣ PRIORIDAD: Si llega nombre de WhatsApp, SIEMPRE usarlo (puede haber cambiado)
    if (name) {
      detectedName = cleanWhatsAppName(name);
      console.log(`[NAME DEBUG] ✅ Usando nombre de WhatsApp: "${name}" → limpio: "${detectedName}"`);
    }
    // 2️⃣ FALLBACK: Usar nombre guardado en BD
    else if (current.name) {
      detectedName = current.name;
      console.log(`[NAME DEBUG] ⚠️ Usando nombre guardado en BD: "${detectedName}"`);
    }
    // 3️⃣ ÚLTIMO RECURSO: Intentar extraer del mensaje
    else if (firstVisit && text) {
      const nameFromMessage = extractNameFromMessage(text);
      if (nameFromMessage) {
        detectedName = nameFromMessage;
        console.log(`[NAME DEBUG] 📝 Nombre detectado del mensaje: "${nameFromMessage}"`);
      }
    }
    
    // Si aún no hay nombre, dejar en null para que use fallback "amigo"
    if (!detectedName) {
      console.log(`[NAME DEBUG] ❌ No se pudo detectar nombre, se usará fallback genérico`);
    }

    const profile = {
      ...current,
      userId,
      name: detectedName, // 🎯 Usar nombre limpio e inteligente
      whatsappDisplayName: name || null, // Guardar nombre original de WhatsApp
      preferredLanguage: userLanguage, // 🌍 Idioma detectado/guardado
      channel: 'whatsapp',
      lastMessageAt: ahoraISO,
      conversationCount: (current.conversationCount || 0) + 1,
      conversacionEnCurso
    };

    // 🔄 SIEMPRE actualizar nombre si cambia en WhatsApp
    if (name && name !== current.whatsappDisplayName) {
      console.log(`[NAME UPDATE] ✅ Nombre actualizado: "${current.whatsappDisplayName || 'NULL'}" → "${name}"`);
    }

    await saveProfile(userId, profile);

    // Guardar mensaje usuario con contexto reply si existe
    const replyContext = buildReplyContext(text || '', body, conversationHistory);
    const processedText = replyContext.hasReplyContext ? replyContext.enrichedMessage : (text || '');

    // 📸 Si hay imagen pero no texto, usar placeholder descriptivo
    const messageContent = processedText || (mediaUrl && type === 'image' ? '[Usuario envió imagen]' : '');

    await saveConversationMessage(userId, { role: 'user', content: messageContent });

    // 📋 Formulario inteligente: activar si hay intención, formulario activo, o continuación detectada
    let formResult = { form: null, needsMoreInfo: false, updates: {} };
    const savedPartialCheck = await getPartialForm(userId).catch(() => null);
    const pendingConfirmCheck = await getPendingConfirmation(userId).catch(() => null);
    const hasActiveForm = !!(savedPartialCheck && !savedPartialCheck.cancelledAt) || !!pendingConfirmCheck;
    const isFormContinuation = detectFormContinuation(processedText);
    const shouldActivateForm = isReservationIntent(processedText) || hasActiveForm || isFormContinuation;
    
    // 💼 ALUNA - Formulario de membresías
    if (profile.activeAgent === 'ALUNA') {
      // Detectar si el usuario muestra interés en una membresía
      const membershipInterest = /\b(quiero|me interesa|necesito|busco|solicito)\b.*\b(plan|membres[ií]a|oficina|espacio|hot\s*desk|coworking)\b/i.test(processedText);
      
      if (membershipInterest || hasActiveForm) {
        console.log('[ALUNA-FORM] 💼 Procesando formulario de membresía');
        try {
          formResult = await processMembershipForm(userId, processedText, profile);
          formResult.userMessage = text;
          
          // 🎯 Usar función compartida para manejar resultado
          const handled = await handleFormResult(formResult, userId, 'ALUNA', profile);
          if (handled) return;
        } catch (error) {
          console.error('[ALUNA-FORM] ❌ Error procesando formulario:', error);
          // Continuar con flujo normal en caso de error
        }
      }
    }
    
    // 🏢 AURORA - Formulario de reservas
    if (shouldActivateForm && profile.activeAgent === 'AURORA') {
      console.log('[FORM] 🎯 Activando formulario:', { 
        isReservationIntent: isReservationIntent(processedText),
        hasActiveForm,
        isFormContinuation 
      });
      
      formResult = await processMessageWithForm(userId, processedText, profile, profile.freeTrialUsed);
      formResult.userMessage = text;
      
      // ⏱️ T14: Iniciar tracking de transacción si necesita más info (inicio de reserva)
      if (formResult.needsMoreInfo && !profile.transactionStartedAt) {
        profile.transactionStartedAt = Date.now();
        profile.transactionAgent = 'AURORA';
        profile.followUpSentAt = null;
        await saveProfile(userId, profile);
        console.log('[T14] ⏱️ Transacción AURORA iniciada:', { userId, timestamp: profile.transactionStartedAt });
      }

      // 🎯 Usar función compartida para manejar resultado
      const handled = await handleFormResult(formResult, userId, 'AURORA', profile);
      if (handled) return;
    }

    // Si hay confirmación pendiente, SOLO procesar si responde SI/NO
    // Verificar tanto el sistema legacy (profile.pendingConfirmation) como el nuevo sistema (getPendingConfirmation)
    const legacyPending = hasPendingConfirmation(profile);
    const newSystemPending = await getPendingConfirmation(userId).catch(() => null);
    const hasPending = legacyPending || newSystemPending;
    
    if (hasPending) {
      // Sistema legacy (Aurora)
      if (legacyPending) {
        const hasValidData = profile.pendingConfirmation?.date && profile.pendingConfirmation?.startTime;
        if (!hasValidData) {
          await clearPendingConfirmation(userId);
          profile.pendingConfirmation = null;
        } else {
          const isPos = isPositiveResponse(processedText);
          const isNeg = isNegativeResponse(processedText);
          
          // 🎯 BACKUP OPTIMIZATION: Solo procesar SI/NO explícitos para evitar falsos positivos
          if (isPos || isNeg) {
            console.log('[WASSENGER] ✅ Usuario tiene confirmación pendiente Y respuesta es SI/NO');
            
            const confirmationResult = await processConfirmationResponse(processedText, profile);
            
            // ⏱️ T14: Limpiar transacción si confirmación exitosa (transacción completada)
            if (confirmationResult.success && isPos) {
              profile.transactionStartedAt = null;
              profile.transactionAgent = null;
              profile.followUpSentAt = null;
              await saveProfile(userId, profile);
              console.log('[T14] ✅ Transacción completada (confirmación exitosa):', { userId });
            }
            
            // 📤 Enviar respuesta de confirmación
            await enviarWhatsApp(userId, confirmationResult.message);
            
            // 💾 Guardar en historial
            await saveConversationMessage(userId, { role: 'assistant', content: confirmationResult.message, agent: profile.activeAgent || 'AURORA' });
            
            // 📊 Guardar interacción
            await saveInteraction({
              userId,
              agent: profile.activeAgent || 'AURORA',
              agentName: profile.activeAgent || 'Aurora Core',
              intentReason: 'confirmation_response',
              input: processedText,
              output: confirmationResult.message,
              meta: { 
                envelope, 
                confirmationSuccess: confirmationResult.success,
                actionType: confirmationResult.actionType,
                needsAction: confirmationResult.needsAction
              }
            });
            
            // 🚫 CRÍTICO: RETURN para no continuar con orquestador
            console.log('[WASSENGER] 🛑 Confirmación procesada - NO continuar con orquestador');
            return;
          }
          
          // Si no es SI/NO explícito, continuar con orquestador normal
          console.log('[WASSENGER] ⚠️ Confirmación pendiente pero respuesta NO es SI/NO - continuar con agente');
        }
      } 
      // Sistema nuevo (ALUNA, PAULA, etc.)
      else if (newSystemPending) {
        const isPos = isPositiveResponse(processedText);
        const isNeg = isNegativeResponse(processedText);
        
        if (isPos || isNeg) {
          console.log(`[WASSENGER] ✅ ${newSystemPending.agentName} - Confirmación pendiente y respuesta SI/NO`);
          
          const confirmationResult = await processConfirmationResponse(processedText, profile);
          
          // 📤 Enviar respuesta
          await enviarWhatsApp(userId, confirmationResult.message);
          await saveConversationMessage(userId, { role: 'assistant', content: confirmationResult.message, agent: newSystemPending.agentName });
          await saveInteraction({
            userId,
            agent: newSystemPending.agentName,
            agentName: newSystemPending.agentName,
            intentReason: 'specialized_confirmation',
            input: processedText,
            output: confirmationResult.message,
            meta: { envelope, success: confirmationResult.success }
          });
          
          console.log('[WASSENGER] 🛑 Confirmación especializada procesada');
          return;
        }
      }
    }

    // Si el usuario reanuda reserva (mensaje de continuación si aplica)
    if (savedPartialCheck && formResult?.form?.getResumeMessage) {
      const resumeMessage = formResult.form.getResumeMessage();
      if (resumeMessage) formResult.resumeMessage = resumeMessage;
    }

    // 📸 AXEL PHOTO COLLECTOR: Manejar texto durante sesión activa
    console.log(`[AXEL-DEBUG] 💬 Texto recibido - activeAgent: ${profile.activeAgent}, processedText: "${processedText}"`);
    if (profile.activeAgent === 'AXEL' && !mediaUrl && processedText) {
      const session = getSession(userId);
      console.log(`[AXEL-DEBUG] 📊 Sesión actual:`, session ? `${session.photoCount} fotos, readyToProcess: ${session.readyToProcess}` : 'null');
      
      if (session && session.photoCount > 0) {
        // Detectar comandos de finalización O timeout expirado
        const finalizationCommands = ['listo', 'ya', 'procesar', 'terminar', 'ok', 'dale', 'enviar'];
        const normalizedText = processedText.toLowerCase().trim();
        const isFinalizationCommand = finalizationCommands.some(cmd => normalizedText === cmd || normalizedText.includes(cmd));
        const shouldProcess = isFinalizationCommand || session.readyToProcess;
        
        if (shouldProcess) {
          console.log(`[WASSENGER] ✅ ${isFinalizationCommand ? 'Comando de finalización' : 'Timeout alcanzado'}: "${processedText}"`);
          
          // 🔄 TODO en queue para garantizar orden
          await queueTask(userId, async () => {
            const result = completeSession(userId);
            
            if (result) {
              console.log('[WASSENGER] 📤 Enviando mensaje: Procesando fotos...');
              await enviarWhatsApp(userId, `Perfecto! Procesando ${result.photoCount} foto(s) para tu cotización... 🔍`);
              await processAxelQuote(userId, result.photos, profile);
              clearQueue(userId);
            }
          });
          
          return;
        } else {
          // 🔧 FIX 2: Es una pregunta/texto normal - dejar que Axel responda pero MANTENER sesión activa
          console.log(`[WASSENGER] 💬 Texto durante sesión de fotos: "${processedText}" - Manteniendo sesión activa (${session.photoCount} fotos guardadas)`);
          console.log(`[AXEL-DEBUG] ⏸️ Sesión preservada - Axel puede responder preguntas sin perder fotos`);
          // El flujo continúa normalmente hacia procesarMensaje, sesión se mantiene
        }
      }
    }

    // 📸 AXEL PHOTO COLLECTOR: Manejar fotos cuando Axel está activo
    console.log(`[AXEL-DEBUG] 📸 Foto recibida - activeAgent: ${profile.activeAgent}, mediaUrl: ${mediaUrl ? 'SI' : 'NO'}, type: ${type}`);
    if (mediaUrl && type === 'image' && profile.activeAgent === 'AXEL') {
      console.log('[AXEL-DEBUG] ✅ Condición cumplida - procesando foto para Axel');
      // 🔄 TODO en queue para garantizar orden absoluto
      await queueTask(userId, async () => {
        const photoStatus = addPhoto(userId, mediaUrl, type);
        
        console.log(`[WASSENGER] 📸 Foto ${photoStatus.currentCount}/${photoStatus.maxPhotos} agregada`);
        
        // ⏱️ T14: Iniciar tracking de transacción en primera foto
        if (photoStatus.currentCount === 1 && !profile.transactionStartedAt) {
          profile.transactionStartedAt = Date.now();
          profile.transactionAgent = 'AXEL';
          profile.followUpSentAt = null;
          await saveProfile(userId, profile);
          console.log('[T14] ⏱️ Transacción AXEL iniciada:', { userId, timestamp: profile.transactionStartedAt });
        }
        
        // Mensajes de confirmación
        if (photoStatus.currentCount === 1) {
          console.log('[WASSENGER] 📤 Enviando mensaje: primera foto recibida');
          await enviarWhatsApp(userId, `Perfecto, recibí la primera foto 📸\n\nPuedes enviar hasta ${photoStatus.maxPhotos - 1} foto(s) más para una mejor evaluación.\n\nSi tienes alguna pregunta entre fotos, adelante! Cuando termines, espera 30 segundos o escribe "listo".`);
          // Iniciar timeout (marca flag en 30s)
          startTimeout(userId);
        } else if (photoStatus.currentCount < photoStatus.maxPhotos) {
          console.log(`[WASSENGER] 📤 Enviando mensaje: foto ${photoStatus.currentCount} recibida`);
          await enviarWhatsApp(userId, `Foto ${photoStatus.currentCount}/${photoStatus.maxPhotos} recibida ✅\n\n${photoStatus.canAddMore ? 'Puedes enviar más fotos, hacer preguntas o escribir "listo" para procesar.' : 'Ya tengo suficientes fotos. Procesando...'}`);
        }
        
        // Si alcanzó el máximo, procesar DENTRO del queue
        if (photoStatus.currentCount >= photoStatus.maxPhotos) {
          const result = completeSession(userId);
          if (result) {
            console.log('[WASSENGER] 📸 Máximo de fotos alcanzado, procesando cotización...');
            await enviarWhatsApp(userId, `✅ ${result.photoCount} fotos recibidas. Procesando cotización...`);
            await processAxelQuote(userId, result.photos, profile);
            clearQueue(userId);
          }
        }
      });
      
      return; // No continuar con flujo normal
    }
    
    // 💼 ALUNA PAYMENT RECEIPTS: Verificar comprobantes de membresías
    if (mediaUrl && type === 'image' && profile.activeAgent === 'ALUNA') {
      const messageData = { type, media: { url: mediaUrl } };
      
      if (isReceiptImage(messageData)) {
        console.log('[ALUNA] 💳 Comprobante de membresía detectado');
        
        const pendingLead = await findPendingMembershipLead(userId);
        
        if (pendingLead && pendingLead.status === 'pending_payment') {
          console.log('[ALUNA] 📋 Lead pendiente encontrado:', pendingLead.id);
          
          // Pasar el mensaje del usuario para detectar pagos compuestos
          const userMessage = messageData.text || '';
          const paymentResult = await processMembershipPayment(messageData, profile, userMessage);
          
          await enviarWhatsApp(userId, paymentResult.message);
          await saveConversationMessage(userId, { 
            role: 'assistant', 
            content: paymentResult.message, 
            agent: 'ALUNA' 
          });
          
          await saveInteraction({
            userId,
            agent: 'ALUNA',
            agentName: 'Aluna - Closer Membresías',
            intentReason: 'membership_payment_verification',
            input: `[RECEIPT:${type}]`,
            output: paymentResult.message,
            meta: { 
              envelope, 
              paymentVerified: paymentResult.autoApproved || false,
              manualReview: paymentResult.manualReview || false,
              rejected: paymentResult.rejected || false
            }
          });
          
          return; // No continuar con flujo normal
        }
        
        // Si no hay lead pendiente, informar al usuario
        console.log('[ALUNA] ⚠️ No hay lead pendiente para este comprobante');
        await enviarWhatsApp(userId, 
          `📸 Recibí tu comprobante, pero no encuentro solicitudes de membresía pendientes de pago.\n\n` +
          `¿Necesitas información sobre nuestros planes? Escribe "planes" 😊`
        );
        
        return;
      }
    }

    // 🏥 ANGELA MEDICAL IMAGES: Analizar imágenes médicas (heridas, ojos, piel)
    if (mediaUrl && type === 'image' && profile.activeAgent === 'ANGELA') {
      console.log('[ANGELA] 🏥 Imagen médica detectada');
      
      try {
        const medicalAnalysis = await analyzeMedicalImage(mediaUrl, processedText || '');
        
        if (medicalAnalysis.success) {
          await enviarWhatsApp(userId, medicalAnalysis.analysis);
          await saveConversationMessage(userId, {
            role: 'assistant',
            content: medicalAnalysis.analysis,
            agent: 'ANGELA'
          });
          
          await saveInteraction({
            userId,
            agent: 'ANGELA',
            agentName: 'Angela - MedBeneficios',
            intentReason: 'medical_image_analysis',
            input: `[MEDICAL_IMAGE:${medicalAnalysis.imageType}] ${processedText || 'Imagen médica'}`,
            output: medicalAnalysis.analysis,
            meta: {
              envelope,
              imageType: medicalAnalysis.imageType,
              confidence: medicalAnalysis.confidence,
              imageUrl: mediaUrl
            }
          });
          
          return; // No continuar con flujo normal
        } else {
          console.error('[ANGELA] ❌ Error analizando imagen médica:', medicalAnalysis.error);
          await enviarWhatsApp(userId, 
            `⚠️ No pude analizar la imagen automáticamente.\n\n` +
            `Por favor, descríbeme lo que ves en la imagen y con gusto te ayudo 😊`
          );
          return;
        }
      } catch (error) {
        console.error('[ANGELA] 🚨 Error procesando imagen médica:', error);
        await enviarWhatsApp(userId, 
          `⚠️ Hubo un problema procesando tu imagen.\n\n` +
          `Por favor, intenta enviarla nuevamente o descríbeme tu consulta por texto 💚`
        );
        return;
      }
    }
    // “Media event” para Aurora Core: si no hay texto pero hay media, damos un texto técnico controlado
    let auroraInput = processedText;
    if (!auroraInput && mediaUrl) {
      auroraInput = `[MEDIA:${type}] El usuario envió un archivo. URL: ${mediaUrl}`;
    }

    // 🎯 DETECCIÓN DE CAMPAÑAS - Activar agente directo SIN handoff
    const campaignDetection = detectCampaignMessage(auroraInput);
    if (campaignDetection.detected && CAMPAIGN_PROMPTS[campaignDetection.campaign]?.targetAgent) {
      const targetAgent = CAMPAIGN_PROMPTS[campaignDetection.campaign].targetAgent;
      console.log(`[CAMPAIGN] 🚀 ${targetAgent} activado: ${campaignDetection.campaign}`);
      
      profile.activeAgent = targetAgent;
      profile.conversationCount = (profile.conversationCount || 0) + 1;
      await saveProfile(userId, profile);
      
      const response = personalizeCampaignResponse(campaignDetection.getTemplate, profile);
      await enviarWhatsApp(userId, response);
      await saveConversationMessage(userId, { role: 'assistant', content: response, agent: targetAgent });
      await saveInteraction({ userId, agent: targetAgent, agentName: targetAgent === 'PAULA' ? 'Paula - PropElite' : targetAgent, intentReason: `campaign_${campaignDetection.campaign}`, input: auroraInput, output: response, meta: { envelope, campaign: campaignDetection.campaign } });
      return;
    }

        // Si hay media y es recibo, dejamos que Aurora lo maneje (sin meter agentes aquí)
    // Para que isReceiptImage funcione, armamos messageData estándar
    const messageData = { type, media: { url: mediaUrl } };

    if (mediaUrl && profile.activeAgent === 'AURORA' && isReceiptImage(messageData)) {
      const paymentResult = await processPaymentReceipt(messageData, profile);
      await enviarWhatsApp(userId, paymentResult.message);
      await saveConversationMessage(userId, { role: 'assistant', content: paymentResult.message, agent: 'AURORA' });
      await saveInteraction({
        userId,
        agent: 'AURORA',
        agentName: 'Aurora Core',
        intentReason: 'payment_verification',
        input: `[RECEIPT:${type}]`,
        output: paymentResult.message,
        meta: { envelope, paymentVerified: paymentResult.success }
      });
      return;
    }

    // 📌 Orquestador = Aurora Core decide TODO (incluye handoffs)
    loggers.webhook.debug('Calling orquestador', { userId, agent: profile.activeAgent, messagePreview: auroraInput.substring(0, 50) });
    const resultado = await procesarMensaje(auroraInput, profile, conversationHistory, {
      ...formResult,
      envelope // <- Aurora Core recibe el evento completo si tu orquestador lo usa
    });

    // Cancelación (si orquestador lo marca)
    if (resultado?.metadata?.cancelacion) {
      if (resultado.metadata.shouldSavePartialForm) {
        await savePartialForm(userId, formResult, 'reservation');
      }
      await clearPendingConfirmation(userId);
      await clearJustConfirmed(userId);
    }

    // 🤝 Handoff genérico (NO AXEL hardcode, NO GABI hardcode)
    if (resultado?.metadata?.agentHandoff) {
      const targetAgent = resultado.metadata.targetAgent;
      const fromAgent = profile.activeAgent || 'AURORA';
      const userLanguage = profile.preferredLanguage || 'es';

      loggers.webhook.handoff(fromAgent, targetAgent, userId, resultado.metadata.intent?.reason || 'unknown');
      
      // ⏱️ T14: Iniciar transacción si viene de AURORA y va a agente especializado
      if (fromAgent === 'AURORA' && targetAgent !== 'AURORA' && !profile.transactionStartedAt) {
        profile.transactionStartedAt = Date.now();
        profile.transactionAgent = targetAgent;
        profile.followUpSentAt = null;
        console.log('[T14] ⏱️ Transacción iniciada en handoff:', { userId, from: fromAgent, to: targetAgent, timestamp: profile.transactionStartedAt });
      }

      try {
        const { getHandoffMessages } = await import('../../deteccion-intenciones/orquestador.js');
        
        const userName = profile.whatsappDisplayName || profile.name || 'amigo';
        const userLanguage = profile.preferredLanguage || 'es';

        // 🎯 Obtener mensajes de handoff usando función unificada
        const handoffMessages = getHandoffMessages(fromAgent, targetAgent, userName, userLanguage);

        console.log(`[HANDOFF] 📨 Secuencia elegante ${fromAgent} → ${targetAgent}`);

        // ═══════════════════════════════════════════════════════════════
        // 🔄 HANDOVER ELEGANTE CON DELAY SECUENCIAL
        // ═══════════════════════════════════════════════════════════════
        
        // PASO 1: Agente saliente se despide con contexto
        console.log(`[HANDOFF] 👋 ${fromAgent} despidiéndose...`);
        await enviarWhatsApp(userId, handoffMessages.despedida);
        await saveConversationMessage(userId, { 
          role: 'assistant', 
          content: handoffMessages.despedida, 
          agent: fromAgent 
        });

        // PASO 2: Actualizar activeAgent DESPUÉS de despedida para que llegue al agente correcto
        console.log(`[HANDOFF] 🔄 Actualizando activeAgent: ${fromAgent} → ${targetAgent}`);
        profile.activeAgent = targetAgent;
        await saveProfile(userId, profile);
        console.log(`[HANDOFF] ✅ activeAgent actualizado en BD: ${targetAgent}`);

        // PASO 3: Delay LARGO para garantizar orden de entrega en WhatsApp (4-5s)
        console.log(`[HANDOFF] ⏱️ Esperando 5 segundos para asegurar orden de entrega...`);
        await new Promise(r => setTimeout(r, 5000)); // 5 segundos - crítico para WhatsApp
        console.log(`[HANDOFF] ⏱️ Delay aplicado (5s) - continuando handoff`);
        
        // PASO 4: Nuevo agente saluda
        console.log(`[HANDOFF] 👋 ${targetAgent} saludando...`);
        await enviarWhatsApp(userId, handoffMessages.entrada);
        await saveConversationMessage(userId, { 
          role: 'assistant', 
          content: handoffMessages.entrada, 
          agent: targetAgent 
        });

        console.log(`[HANDOFF] ✅ Handover completado exitosamente`);

        // 🔄 RETORNO A AURORA: Si tiene reserva pendiente, enviar resumen automáticamente
        if (targetAgent === 'AURORA' && formResult?.resumeMessage) {
          console.log('[HANDOFF] 🔄 Usuario regresa a Aurora con reserva pendiente - enviando resumen...');
          
          await new Promise(r => setTimeout(r, 800)); // Delay adicional para contexto
          
          await enviarWhatsApp(userId, formResult.resumeMessage);
          await saveConversationMessage(userId, { 
            role: 'assistant', 
            content: formResult.resumeMessage, 
            agent: 'AURORA' 
          });
          
          console.log('[HANDOFF] ✅ Resumen de reserva pendiente enviado');
        }

        // Importar AGENTES para obtener nombre del agente
        const { AGENTES } = await import('../../deteccion-intenciones/orquestador.js');
        
        await saveInteraction({
          userId,
          agent: fromAgent,
          agentName: AGENTES[fromAgent]?.nombre || 'Aurora Core',
          intentReason: 'agent_handoff',
          input: auroraInput,
          output: `handoff ${fromAgent} -> ${targetAgent}`,
          meta: { envelope, fromAgent, toAgent: targetAgent }
        });

        return;
      } catch (e) {
        console.error('[WASSENGER] handoff error:', e);
        await enviarWhatsApp(userId, 'Disculpa, hubo un problema conectándote con el especialista. Escribe "ayuda" y lo reintentamos.');
        return;
      }
    }

    // 🧠 Generar respuesta (OpenAI) según sistema de Aurora Core
    let reply = await complete(resultado.prompt, {
      temperature: ['ENZO', 'ADRIANA', 'ALUNA'].includes(resultado.agenteKey) ? 0.7 : 0.4,
      max_tokens: ['ENZO', 'ADRIANA', 'ALUNA', 'PAULA'].includes(resultado.agenteKey) ? 1200 : 350, // Paula necesita más tokens para fichas completas
      system: resultado.systemPrompt
    });

    // ✨ Si es Aurora, pasar por el helper de confirmaciones
    let finalReply = reply;
    let confirmationActivated = false;

    if (resultado.agenteKey === 'AURORA') {
      const enhancement = await enhanceAuroraResponse(reply, profile, formResult);
      if (enhancement?.enhanced) {
        finalReply = enhancement.finalMessage;
        confirmationActivated = true;
      }
    }

    await saveConversationMessage(userId, {
      role: 'assistant',
      content: finalReply,
      agent: resultado.agenteKey
    });

    await saveInteraction({
      userId,
      agent: resultado.agenteKey,
      agentName: resultado.agente || 'Aurora Core',
      intentReason: resultado.razonSeleccion,
      input: auroraInput,
      output: finalReply,
      meta: {
        envelope,
        confirmationActivated,
        replyContext: getReplyContextMetadata(replyContext)
      }
    });

    // 📨 Dividir mensaje automáticamente si es largo/estructurado
    const messageProcessed = splitLongMessage(finalReply);
    
    console.log(`[MESSAGE-SPLIT] Análisis de mensaje:`);
    console.log(`   - Longitud original: ${finalReply.length} caracteres`);
    console.log(`   - Debe dividirse: ${messageProcessed.shouldDelay ? 'SÍ' : 'NO'}`);
    console.log(`   - Partes detectadas: ${messageProcessed.parts.length}`);
    console.log(`   - Delay entre partes: ${messageProcessed.delayMs}ms`);
    
    if (messageProcessed.shouldDelay && messageProcessed.parts.length > 1) {
      // Enviar múltiples mensajes con delay
      console.log(`[MESSAGE-SPLIT] 📨 Dividiendo mensaje en ${messageProcessed.parts.length} partes`);
      
      for (let i = 0; i < messageProcessed.parts.length; i++) {
        const part = cleanPromptMarkers(messageProcessed.parts[i]);
        
        console.log(`[MESSAGE-SPLIT] Enviando parte ${i + 1}/${messageProcessed.parts.length} (${part.length} chars)`);
        console.log(`[MESSAGE-SPLIT] Preview: ${part.substring(0, 100)}...`);
        
        // Enviar mensaje
        await enviarWhatsApp(userId, part);
        
        // Guardar cada parte en historial
        await saveConversationMessage(userId, {
          role: 'assistant',
          content: part,
          agent: resultado.agenteKey,
          metadata: { partNumber: i + 1, totalParts: messageProcessed.parts.length }
        });
        
        // Delay entre mensajes (excepto en el último)
        if (i < messageProcessed.parts.length - 1) {
          console.log(`[MESSAGE-SPLIT] Esperando ${messageProcessed.delayMs}ms antes de siguiente mensaje...`);
          await new Promise(resolve => setTimeout(resolve, messageProcessed.delayMs));
        }
      }
      
      console.log(`[MESSAGE-SPLIT] ✅ Enviados ${messageProcessed.parts.length} mensajes exitosamente`);
    } else {
      // Enviar mensaje único (comportamiento original)
      const cleanedMessage = cleanPromptMarkers(finalReply);
      console.log(`[MESSAGE-SPLIT] Enviando mensaje único (${cleanedMessage.length} chars)`);
      await enviarWhatsApp(userId, cleanedMessage);
    }
    
    loggers.webhook.agentResponse(userId, resultado.agenteKey, true);
    
    // ⏱️ T14: Limpiar transacción si agente completó exitosamente su servicio
    // Detectar keywords de finalización en respuesta del agente
    if (profile.transactionStartedAt && profile.transactionAgent) {
      const completionKeywords = [
        'te envío', 'enviado', 'te envié', 'listo', 'completado',
        'confirmada', 'confirmado', 'reserva exitosa', 'cotización enviada',
        'hemos terminado', 'proceso completado', 'análisis finalizado',
        'documentos listos', 'reporte enviado', 'propuesta lista'
      ];
      
      const replyLower = finalReply.toLowerCase();
      const completionDetected = completionKeywords.some(keyword => replyLower.includes(keyword));
      
      if (completionDetected) {
        const completedAgent = profile.transactionAgent;
        profile.transactionStartedAt = null;
        profile.transactionAgent = null;
        profile.followUpSentAt = null;
        await saveProfile(userId, profile);
        console.log('[T14] ✅ Transacción completada (keyword detected):', { 
          userId, 
          agent: completedAgent, 
          keywords: completionKeywords.filter(k => replyLower.includes(k))
        });
      }
    }

    // Marcar primera visita después de responder
    if (resultado.agenteKey === 'AURORA' && profile.firstVisit === true) {
      await saveProfile(userId, { ...profile, firstVisit: false });
    }

    // 📦 GABI: Tracking de entregas pendientes (pagos compuestos)
    if (resultado.agenteKey === 'GABI') {
      try {
        const { 
          getPendingDeliveries,
          markDeliveryCompleted,
          generateDeliveryReminder 
        } = await import('../../servicios/gabi-financial-system.js');
        
        const userMessage = messageData?.text?.toLowerCase() || '';
        
        // Detectar solicitud de ver entregas pendientes
        const checkDeliveriesKeywords = [
          'entregas pendientes', 'mis entregas', 'qué debo entregar',
          'entregas pendiente', 'mi entrega', 'pendientes'
        ];
        
        const wantsToCheck = checkDeliveriesKeywords.some(kw => userMessage.includes(kw));
        
        if (wantsToCheck) {
          console.log('[GABI-DELIVERIES] 📦 Usuario solicita ver entregas pendientes');
          const reminder = await generateDeliveryReminder(userId);
          
          if (reminder.hasDeliveries) {
            await enviarWhatsApp(userId, reminder.message);
            console.log('[GABI-DELIVERIES] ✅ Recordatorio enviado:', reminder.count, 'entregas');
          }
        }
        
        // Detectar completación de entrega
        const completedKeywords = [
          'entrega completada', 'completé entrega', 'ya entregué',
          'entrega lista', 'terminé entrega', 'cumplí'
        ];
        
        const completedDetected = completedKeywords.some(kw => userMessage.includes(kw));
        
        if (completedDetected) {
          console.log('[GABI-DELIVERIES] ✅ Usuario reporta entrega completada');
          
          // Extraer número de transacción del mensaje
          const transactionMatch = userMessage.match(/([a-z]{2,4}[\d]{6,}|trf[\d]+|w[\d]+|dup[\d]+)/i);
          
          if (transactionMatch) {
            const transactionNumber = transactionMatch[0].toUpperCase();
            console.log('[GABI-DELIVERIES] 🔍 Transacción detectada:', transactionNumber);
            
            // Buscar pago por número de transacción
            const deliveries = await getPendingDeliveries(userId);
            const delivery = deliveries.find(d => 
              d.transactionNumber.toUpperCase() === transactionNumber
            );
            
            if (delivery) {
              const result = await markDeliveryCompleted(delivery.paymentId, userId);
              
              if (result.success) {
                const confirmMessage = `✅ *¡Entrega Completada!*\n\n` +
                  `📦 Membresía: ${delivery.membershipType}\n` +
                  `💵 Canje: $${delivery.canjeAmount} USD\n` +
                  `📝 Servicio: ${delivery.canjeDescription}\n` +
                  `🔢 Transacción: ${transactionNumber}\n` +
                  `📅 Completado: ${new Date().toLocaleDateString()}\n\n` +
                  `¡Gracias por cumplir con tu compromiso! 🎉`;
                
                await enviarWhatsApp(userId, confirmMessage);
                console.log('[GABI-DELIVERIES] ✅ Entrega marcada como completada');
              }
            } else {
              console.log('[GABI-DELIVERIES] ⚠️ No se encontró entrega con transacción:', transactionNumber);
            }
          }
        }
        
        // Auto-recordatorio periódico (cada 5 interacciones con Gabi)
        const gabiMessages = await memoria.getRecentMessages(userId, 'GABI', 50);
        if (gabiMessages.length % 5 === 0 && gabiMessages.length > 0) {
          const deliveries = await getPendingDeliveries(userId);
          if (deliveries.length > 0) {
            console.log('[GABI-DELIVERIES] 📅 Auto-recordatorio (cada 5 mensajes)');
            const gentleReminder = `\n\n📦 *Recordatorio:*\nTienes ${deliveries.length} entrega(s) pendiente(s) de pago compuesto.\nEscribe "@Gabi entregas pendientes" para ver detalles.`;
            // No enviar de inmediato para no interrumpir, solo agregar al siguiente mensaje
          }
        }
        
      } catch (error) {
        console.error('[GABI-DELIVERIES] ❌ Error en tracking de entregas:', error);
        // No interrumpir flujo principal si falla
      }
    }
  });
});

/* ─────────────────────────────────────────────────────────────
   Status & verification endpoints
───────────────────────────────────────────────────────────── */
router.get('/webhooks/wassenger/status', (req, res) => {
  const wassengerEnabled = process.env.WASSENGER_ENABLED !== 'false';
  res.json({
    ok: true,
    message: 'Wassenger Webhook activo',
    enabled: wassengerEnabled,
    status: wassengerEnabled ? '✅ ACTIVO' : '⏸️ PAUSADO',
    timestamp: new Date().toISOString()
  });
});

router.get('/webhooks/wassenger', (req, res) => res.send('ok'));

router.post('/webhooks/wassenger/control', (req, res) => {
  return res.json({
    ok: false,
    error: 'NOT_IMPLEMENTED',
    message: 'Use Heroku CLI para cambiar WASSENGER_ENABLED',
    help: {
      disable: 'heroku config:set WASSENGER_ENABLED=false --app coworkia-agent',
      enable: 'heroku config:set WASSENGER_ENABLED=true --app coworkia-agent',
      status: 'heroku config:get WASSENGER_ENABLED --app coworkia-agent'
    }
  });
});

export default router;
