// src/express-servidor/endpoints-api/wassenger.js
import { Router } from 'express';

import { procesarMensaje } from '../../deteccion-intenciones/orquestador.js';
import { complete, transcribeAudio } from '../../servicios-ia/openai.js';
import { loggers } from '../../utils/logger.js';
import { checkRateLimit, recordMessage } from '../../utils/rate-limiter.js';

import { processPaymentReceipt, isReceiptImage } from '../../servicios/payment-receipts.js';
import { processMembershipPayment, findPendingMembershipLead } from '../../servicios/membership-payment-verification.js';
import { processConfirmationResponse, hasPendingConfirmation, isPositiveResponse, isNegativeResponse } from '../../servicios/confirmation-flow.js';
import { enhanceAuroraResponse } from '../../servicios/aurora-confirmation-helper.js';
import { addPhoto, getSession, completeSession, canProcessQuote, startTimeout } from '../../servicios/axel-photo-collector.js';
import { processAxelFormMessage, generateFormSummary } from '../../servicios/axel-quote-form.js';
import { generateQuoteCode } from '../../servicios/axel-quote-code.js';
import { analyzeCollisionPhotos } from '../../servicios/axel-vision-analysis.js';
import { generateQuote } from '../../servicios/axel-quote-generator.js';
import { sendQuoteEmail } from '../../servicios/axel-quote-email.js';
import { processMembershipForm } from '../../servicios/membership-form.js';

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
    /el\s+(lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado|domingo)/i
  ];
  
  return continuationPatterns.some(pattern => pattern.test(text));
}/* ─────────────────────────────────────────────────────────────
   💰 AXEL QUOTE PROCESSOR
───────────────────────────────────────────────────────────── */
async function processAxelQuote(userId, photoUrls, profile) {
  const startTime = Date.now();
  
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
    await enviarWhatsApp(userId, `Analizando daños con IA... 🤖`);
    
    loggers.axel.info('Analyzing collision photos', { userId, photoCount: photoUrls.length });
    const visionAnalysis = await analyzeCollisionPhotos(photoUrls);
    
    if (!visionAnalysis.success) {
      await enviarWhatsApp(userId, `Disculpa, tuve un problema analizando las fotos. ¿Podrías enviarlas nuevamente?`);
      return { success: false, error: visionAnalysis.error };
    }
    
    // 3. Generar cotización con IA
    await enviarWhatsApp(userId, `Preparando cotización personalizada... 📋`);
    
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
    const whatsappMessage = `
🎯 *COTIZACIÓN PAINTBULL*

${quoteResult.quote}

📋 *Código:* ${quoteCode}

---

📧 *Te envío copia detallada por email...*

_The PaintBull - Expertos en colisiones_ 🚗💥
    `.trim();
    
    await enviarWhatsApp(userId, whatsappMessage);
    
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

    // 🎤 Voz → transcribir
    if (type === 'audio' || type === 'voice' || type === 'ptt') {
      if (!mediaUrl) return;
      const tr = await transcribeAudio(mediaUrl);
      if (!tr?.success || !tr?.text) {
        await enviarWhatsApp(userId, '🎤 No pude procesar tu audio. ¿Puedes escribirlo por texto? 😊');
        return;
      }
      text = tr.text;
    }

    // Construir “evento” para Aurora Core
    const envelope = buildMessageEnvelope({ userId, name, text, type, mediaUrl, data, evt });

    // Perfil + historial
    const current = await loadProfileWithTimeout(loadProfile, userId, 5000).catch(() => ({})) || {};
    let conversationHistory = await loadConversationHistory(userId, 10).catch(() => []);

    // ✅ Registrar mensaje procesado para rate limiting
    recordMessage(userId);

    // 🌍 Detección natural de idioma
    // Si el usuario escribe en otro idioma, el sistema cambia automáticamente
    const currentLanguage = current.preferredLanguage || 'es';
    const detectedLanguage = getUserLanguage(text || '', currentLanguage);
    
    // Cambio de idioma detectado - natural y sin comandos
    if (detectedLanguage?.language && 
        detectedLanguage.language !== currentLanguage &&
        detectedLanguage.confidence > 0.3) { // Umbral bajo para cambio rápido
      
      console.log('[LANGUAGE] 🌍 Cambio de idioma detectado:', {
        from: currentLanguage,
        to: detectedLanguage.language,
        confidence: detectedLanguage.confidence
      });
      
      // Actualizar idioma del perfil
      current.preferredLanguage = detectedLanguage.language;
      await saveProfile(userId, { ...current, preferredLanguage: detectedLanguage.language });
      
      // Obtener último mensaje del asistente para repetirlo en nuevo idioma
      const lastAssistantMessage = conversationHistory
        .slice()
        .reverse()
        .find(msg => msg.role === 'assistant');
      
      if (lastAssistantMessage) {
        console.log('[LANGUAGE] 🔄 Repitiendo último mensaje en nuevo idioma...');
        
        // Generar traducción del último mensaje
        const translationPrompt = `Translate this message to ${detectedLanguage.language === 'en' ? 'English' : 'Spanish'}. Keep the same tone and structure:\n\n"${lastAssistantMessage.content}"`;
        
        const translatedMessage = await complete(translationPrompt, {
          temperature: 0.3,
          max_tokens: 300
        });
        
        // Enviar mensaje traducido
        await enviarWhatsApp(userId, translatedMessage);
        await saveConversationMessage(userId, { 
          role: 'assistant', 
          content: translatedMessage, 
          agent: lastAssistantMessage.agent || 'AURORA',
          isTranslation: true
        });
        
        console.log('[LANGUAGE] ✅ Mensaje repetido en', detectedLanguage.language);
        return; // No continuar con el flujo normal
      }
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
      channel: 'whatsapp',
      lastMessageAt: ahoraISO,
      conversationCount: (current.conversationCount || 0) + 1,
      conversacionEnCurso
    };

    await saveProfile(userId, profile);

    // Guardar mensaje usuario con contexto reply si existe
    const replyContext = buildReplyContext(text || '', body, conversationHistory);
    const processedText = replyContext.hasReplyContext ? replyContext.enrichedMessage : (text || '');

    await saveConversationMessage(userId, { role: 'user', content: processedText });

    // 📋 Formulario inteligente: activar si hay intención, formulario activo, o continuación detectada
    let formResult = { form: null, needsMoreInfo: false, updates: {} };
    const savedPartialCheck = await getPartialForm(userId).catch(() => null);
    const hasActiveForm = !!(savedPartialCheck && !savedPartialCheck.cancelledAt);
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
          
          if (formResult.isComplete) {
            // Generar mensaje de confirmación con resumen
            const confirmationMessage = `Perfecto! Déjame confirmar todos los datos:

📋 RESUMEN DE TU MEMBRESÍA:
${formResult.summary}

✨ BENEFICIOS INCLUIDOS:
${formResult.benefits || 'Múltiples beneficios según plan'}

¿Todo correcto? Responde SI para confirmar y agendar tu tour del espacio 🏢`;

            await enviarWhatsApp(userId, confirmationMessage);
            await saveConversationMessage(userId, { role: 'assistant', content: confirmationMessage, agent: 'ALUNA' });
            return; // Esperar confirmación
          }
          
          if (formResult.needsMoreInfo && formResult.nextQuestion) {
            await enviarWhatsApp(userId, formResult.nextQuestion);
            await saveConversationMessage(userId, { role: 'assistant', content: formResult.nextQuestion, agent: 'ALUNA' });
            return; // Esperar siguiente campo
          }
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
    }

    // 🚨 Validaciones del formulario (ej domingo/feriado) → respuesta inmediata
    if (formResult?.validationError) {
      const errorMessage = formResult.validationError.message;
      await enviarWhatsApp(userId, errorMessage);
      await saveConversationMessage(userId, { role: 'assistant', content: errorMessage, agent: 'AURORA' });
      await saveInteraction({
        userId,
        agent: 'AURORA',
        agentName: 'Aurora Core',
        intentReason: 'validation_error',
        input: processedText,
        output: errorMessage,
        meta: { envelope, errorType: formResult.validationError.type }
      });
      await clearPartialForm(userId);
      return;
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
    if (profile.activeAgent === 'AXEL' && !mediaUrl && processedText) {
      const session = getSession(userId);
      
      if (session && session.photoCount > 0) {
        // Detectar comandos de finalización
        const finalizationCommands = ['listo', 'ya', 'procesar', 'terminar', 'ok', 'dale', 'enviar'];
        const normalizedText = processedText.toLowerCase().trim();
        const isFinalizationCommand = finalizationCommands.some(cmd => normalizedText === cmd || normalizedText.includes(cmd));
        
        if (isFinalizationCommand) {
          console.log(`[WASSENGER] ✅ Comando de finalización detectado: "${processedText}"`);
          const result = completeSession(userId);
          
          if (result) {
            await enviarWhatsApp(userId, `Perfecto! Procesando ${result.photoCount} foto(s) para tu cotización... 🔍`);
            await processAxelQuote(userId, result.photos, profile);
            return;
          }
        } else {
          // Es una pregunta/texto normal - dejar que Axel responda pero mantener sesión activa
          console.log(`[WASSENGER] 💬 Texto durante sesión de fotos: "${processedText}" - Manteniendo sesión activa`);
          // El flujo continúa normalmente hacia procesarMensaje, sesión se mantiene
        }
      }
    }

    // 📸 AXEL PHOTO COLLECTOR: Manejar fotos cuando Axel está activo
    if (mediaUrl && type === 'image' && profile.activeAgent === 'AXEL') {
      const photoStatus = addPhoto(userId, mediaUrl, type);
      
      console.log(`[WASSENGER] 📸 Foto ${photoStatus.currentCount}/${photoStatus.maxPhotos} agregada para cotización`);
      
      // ⏱️ T14: Iniciar tracking de transacción en primera foto
      if (photoStatus.currentCount === 1 && !profile.transactionStartedAt) {
        profile.transactionStartedAt = Date.now();
        profile.transactionAgent = 'AXEL';
        profile.followUpSentAt = null;
        await saveProfile(userId, profile);
        console.log('[T14] ⏱️ Transacción AXEL iniciada:', { userId, timestamp: profile.transactionStartedAt });
      }
      
      // Mensajes según estado
      if (photoStatus.currentCount === 1) {
        await enviarWhatsApp(userId, `Perfecto, recibí la primera foto 📸\n\nPuedes enviar hasta ${photoStatus.maxPhotos - 1} foto(s) más para una mejor evaluación.\n\nSi tienes alguna pregunta entre fotos, adelante! Cuando termines, espera 30 segundos o escribe "listo".`);
      } else if (photoStatus.currentCount < photoStatus.maxPhotos) {
        await enviarWhatsApp(userId, `Foto ${photoStatus.currentCount}/${photoStatus.maxPhotos} recibida ✅\n\n${photoStatus.canAddMore ? 'Puedes enviar más fotos, hacer preguntas o escribir "listo" para procesar.' : 'Ya tengo suficientes fotos. Procesando...'}`);
      }
      
      // Iniciar timeout automático
      startTimeout(userId, async (session) => {
        const result = completeSession(userId);
        if (result) {
          await enviarWhatsApp(userId, `⏰ Tiempo completado. Procesando ${result.photoCount} foto(s) para tu cotización...`);
          await processAxelQuote(userId, result.photos, profile);
        }
      });
      
      // Si alcanzó el máximo, procesar inmediatamente
      if (photoStatus.currentCount >= photoStatus.maxPhotos) {
        const result = completeSession(userId);
        if (result) {
          await enviarWhatsApp(userId, `✅ ${result.photoCount} fotos recibidas. Analizando daños...`);
          await processAxelQuote(userId, result.photos, profile);
        }
      }
      
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
          
          const paymentResult = await processMembershipPayment(messageData, profile);
          
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
    // “Media event” para Aurora Core: si no hay texto pero hay media, damos un texto técnico controlado
    let auroraInput = processedText;
    if (!auroraInput && mediaUrl) {
      auroraInput = `[MEDIA:${type}] El usuario envió un archivo. URL: ${mediaUrl}`;
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

        // 🔄 SECUENCIA HANDOFF: 2 mensajes rápidos y sincronizados
        // 1. Agente actual despide
        await enviarWhatsApp(userId, handoffMessages.despedida);
        await saveConversationMessage(userId, { 
          role: 'assistant', 
          content: handoffMessages.despedida, 
          agent: fromAgent 
        });

        // 2. Micro delay (solo para experiencia natural)
        await new Promise(r => setTimeout(r, 400));
        
        // 3. Nuevo agente saluda
        await enviarWhatsApp(userId, handoffMessages.entrada);
        await saveConversationMessage(userId, { 
          role: 'assistant', 
          content: handoffMessages.entrada, 
          agent: targetAgent 
        });

        // 🔄 RETORNO A AURORA: Si tiene reserva pendiente, enviar resumen automáticamente
        if (targetAgent === 'AURORA' && formResult?.resumeMessage) {
          console.log('[HANDOFF] 🔄 Usuario regresa a Aurora con reserva pendiente - enviando resumen...');
          
          await new Promise(r => setTimeout(r, 600)); // Pequeño delay natural
          
          await enviarWhatsApp(userId, formResult.resumeMessage);
          await saveConversationMessage(userId, { 
            role: 'assistant', 
            content: formResult.resumeMessage, 
            agent: 'AURORA' 
          });
          
          console.log('[HANDOFF] ✅ Resumen de reserva pendiente enviado');
        }

        await saveProfile(userId, { ...profile, activeAgent: targetAgent });

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
