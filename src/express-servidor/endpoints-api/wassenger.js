// src/express-servidor/endpoints-api/wassenger.js
import { Router } from 'express';

import { procesarMensaje } from '../../deteccion-intenciones/orquestador.js';
import { complete, transcribeAudio, generateSpeech } from '../../servicios-ia/openai.js';
import { loggers } from '../../utils/logger.js';
import { checkRateLimit, recordMessage } from '../../utils/rate-limiter.js';
import { validateAudio, getLocalizedAudioError } from '../../utils/audio-validator.js';
import { sanitizeUrl, sanitizeForLog } from '../../utils/log-sanitizer.js';

import { processPaymentReceipt, isReceiptImage } from '../../servicios/payment-receipts.js';
import { processMembershipPayment, findPendingMembershipLead } from '../../servicios/membership-payment-verification.js';
import { analyzeMedicalImage } from '../../servicios/angela-vision-analysis.js';
import { processConfirmationResponse, isPositiveResponse, isNegativeResponse } from '../../servicios/confirmation-flow.js';
import { enhanceAuroraResponse } from '../../servicios/aurora-confirmation-helper.js';
import { addPhoto, getSession, completeSession, canProcessQuote, startTimeout, queueTask, clearQueue, markFirstAckSent } from '../../servicios/axel-photo-collector.js';
import { processAxelFormMessage, generateFormSummary, generateFormPrompt } from '../../servicios/axel-quote-form.js';
import { saveQuote } from '../../servicios/axel-quote-db.js';
import { generateQuoteCode } from '../../servicios/axel-quote-code.js';
import { analyzeCollisionPhotos } from '../../servicios/axel-vision-analysis.js';
import { generateQuote } from '../../servicios/axel-quote-generator.js';
import { sendQuoteEmail } from '../../servicios/axel-quote-email.js';
import { query } from '../../database/database.js';
import { processMembershipForm } from '../../servicios/membership-form.js';

import { detectCampaignMessage, personalizeCampaignResponse, CAMPAIGN_PROMPTS } from '../../servicios/campaign-prompts.js';
import { validateWebhookSignature, rateLimitByPhone } from '../middleware/webhook-security.js';

import { processMessageWithForm } from '../../servicios/partial-reservation-form.js';
import { buildReplyContext, getReplyContextMetadata } from '../../servicios/reply-context-handler.js';
import { getUserLanguage, detectLanguageCommand, getLanguageChangeConfirmation } from '../../utils/language-detector.js';
import { processMessage as splitLongMessage, cleanPromptMarkers } from '../../utils/message-splitter.js';
import { getAgentForm, saveAgentForm, clearAgentForm, getAllUserForms } from '../../servicios/agent-form-manager.js';
import { normalizeAgentName } from '../../utils/agent-normalizer.js';

// 🆕 NUEVO SISTEMA V2 - Handoffs unificados
import { resolveIntent, decideResponder, logIntent, INTENT_TYPES } from '../../deteccion-intenciones/intent-resolver-v2.js';
import { executeHandoff } from '../../servicios/handoff-manager.js';
import { isUpdateInProgress } from '../../servicios/agent-state-manager.js';
import { updateAgent as updateAgentState } from '../../servicios/agent-state-manager.js';

import {
  loadProfile,
  saveProfile,
  saveInteraction,
  loadConversationHistory,
  saveConversationMessage
} from '../../perfiles-interacciones/memoria-sqlite.js';

import { loadProfileWithTimeout } from '../../utils/timeout-helpers.js';
import { dispatchHttpRequest } from '../../servicios/external-dispatcher.js';
import { clearJustConfirmed, clearPendingConfirmation, getPendingConfirmation } from '../../servicios/reservation-state.js';

const router = Router();

/* ─────────────────────────────────────────────────────────────
   ✅ HANDOFF: Todos los handoffs usan executeHandoff() de 
   handoff-manager.js - sistema centralizado con locks
───────────────────────────────────────────────────────────── */

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
   ⏱️ DEBOUNCE: Agrupar webhooks rápidos del mismo usuario
   Previene race conditions cuando usuarios envían múltiples
   mensajes/fotos en < 500ms. Agrupa todo en un solo
   procesamiento para evitar saturar el pool de PostgreSQL.
   
   OPTIMIZACIÓN: Solo aplica delay si hay mensajes múltiples
   en ráfaga. Mensajes individuales se procesan inmediatamente.
───────────────────────────────────────────────────────────── */
const pendingWebhooks = new Map(); // userId → { timer, handlers: [], count }
const DEBOUNCE_WINDOW_MS = 500; // 500ms - solo para ráfagas

/**
 * Agrupa webhooks del mismo usuario que lleguen en ráfaga rápida.
 * Si es el primer mensaje, ejecuta INMEDIATAMENTE.
 * Si llegan más mensajes en < 500ms, agrupa y espera.
 * 🔥 FIX: Guarda TODOS los handlers en array para procesarlos secuencialmente
 */
function debounceUserWebhook(userId, handler) {
  // Si ya hay un timer activo (ráfaga detectada)
  if (pendingWebhooks.has(userId)) {
    const existing = pendingWebhooks.get(userId);
    clearTimeout(existing.timer);
    existing.handlers.push(handler); // 🔥 Agregar handler al array
    existing.count++;
    console.log(`[DEBOUNCE] 📦 Mensaje ${existing.count} de ${userId}, reagrupando`);
    
    // Crear nuevo timer para la ráfaga
    existing.timer = setTimeout(async () => {
      const allHandlers = existing.handlers;
      pendingWebhooks.delete(userId);
      console.log(`[DEBOUNCE] ✅ Procesando ${allHandlers.length} mensajes de ${userId}`);
      
      // 🔥 Ejecutar TODOS los handlers secuencialmente
      for (const h of allHandlers) {
        await h();
      }
    }, DEBOUNCE_WINDOW_MS);
  } else {
    // Primer mensaje - ejecutar INMEDIATAMENTE
    console.log(`[DEBOUNCE] ⚡ Mensaje único de ${userId} - procesando inmediatamente`);
    
    // Marcar usuario como "en proceso" para detectar ráfagas
    const timer = setTimeout(() => {
      pendingWebhooks.delete(userId);
    }, DEBOUNCE_WINDOW_MS);
    
    pendingWebhooks.set(userId, { timer, handlers: [handler], count: 1 }); // 🔥 Array de handlers
    
    // Ejecutar inmediatamente
    handler();
  }
}

/* ─────────────────────────────────────────────────────────────
   🛡️ DEDUPLICACIÓN: Prevenir procesamiento de webhooks duplicados
   Wassenger puede enviar el mismo webhook múltiples veces si:
   - Timeout en su lado (no recibe 200 a tiempo)
   - Retry automático por errores transitorios
   - Race conditions en su infraestructura
   - Webhooks de mensajes que EL SISTEMA envió (fromMe debería ser true pero a veces no llega)
───────────────────────────────────────────────────────────── */
const processedMessages = new Map(); // messageId → timestamp
const sentMessages = new Map(); // Hash de (userId + texto) → timestamp para detectar eco
const MESSAGE_DEDUP_TTL_MS = 60000; // 1 minuto

/**
 * Verifica si un mensaje ya fue procesado recientemente
 * @param {string} messageId - ID único del mensaje de Wassenger
 * @returns {boolean} - true si ya fue procesado
 */
function isDuplicateMessage(messageId) {
  if (!messageId) return false; // Sin ID, no se puede deduplicar
  
  // Limpiar mensajes antiguos (> 1 minuto)
  const now = Date.now();
  for (const [id, timestamp] of processedMessages.entries()) {
    if (now - timestamp > MESSAGE_DEDUP_TTL_MS) {
      processedMessages.delete(id);
    }
  }
  
  // Verificar si ya fue procesado
  if (processedMessages.has(messageId)) {
    console.log(`[DEDUP] 🚫 Mensaje duplicado ignorado: ${messageId}`);
    return true;
  }
  
  // Marcar como procesado
  processedMessages.set(messageId, now);
  return false;
}

/**
 * Verifica si un webhook es de un mensaje que el sistema acaba de enviar (eco)
 * Wassenger envía webhooks incluso de mensajes enviados por el bot,
 * aunque fromMe debería ser true, a veces no viene o llega incorrectamente.
 * @param {string} userId - Número de teléfono del usuario
 * @param {string} text - Texto del mensaje
 * @returns {boolean} - true si es eco de un mensaje propio
 */
function isEchoMessage(userId, text) {
  if (!userId || !text) return false;
  
  // Limpiar cache antiguo (> 1 minuto)
  const now = Date.now();
  for (const [key, timestamp] of sentMessages.entries()) {
    if (now - timestamp > MESSAGE_DEDUP_TTL_MS) {
      sentMessages.delete(key);
    }
  }
  
  // Hash único: userId + primeros 50 caracteres del texto (para comparación rápida)
  const textHash = text.trim().substring(0, 50).toLowerCase();
  const key = `${userId}:${textHash}`;
  
  if (sentMessages.has(key)) {
    console.log(`[DEDUP] 🔁 Eco detectado - ignorando mensaje propio de ${userId}`);
    return true;
  }
  
  return false;
}

/**
 * Registra un mensaje enviado por el sistema para detectar ecos en webhooks
 * @param {string} userId - Número de teléfono
 * @param {string} text - Texto enviado
 */
function trackSentMessage(userId, text) {
  if (!userId || !text) return;
  const textHash = text.trim().substring(0, 50).toLowerCase();
  const key = `${userId}:${textHash}`;
  sentMessages.set(key, Date.now());
  console.log(`[DEDUP] 📝 Registrado mensaje propio: ${textHash.substring(0, 30)}...`);
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
    // ✅ Registrar mensaje ANTES de enviar (prevenir race condition)
    // Si el webhook llega antes de que trackSentMessage se ejecute, ya lo tendremos en cache
    trackSentMessage(numero, mensaje);
    
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
      // Si falló el envío, remover del cache (no se envió realmente)
      const textHash = mensaje.trim().substring(0, 50).toLowerCase();
      const key = `${numero}:${textHash}`;
      sentMessages.delete(key);
    }
    
    return { ok: response.ok, data };
  } catch (error) {
    loggers.wassenger.error('Error sending message', { userId: numero }, error);
    // Si hubo excepción, remover del cache
    const textHash = mensaje.trim().substring(0, 50).toLowerCase();
    const key = `${numero}:${textHash}`;
    sentMessages.delete(key);
    return { ok: false, error: error.message };
  }
}

/**
 * 🔊 Envía audio/voz por WhatsApp usando Wassenger API
 * @param {string} numero - Número de teléfono
 * @param {Buffer} audioBuffer - Buffer del archivo de audio
 * @param {object} opts - Opciones { filename, mimetype }
 * @returns {Promise<{ok: boolean, data?: any, error?: string}>}
 */
async function enviarWhatsAppVoz(numero, audioBuffer, opts = {}) {
  const WASSENGER_TOKEN = process.env.WASSENGER_TOKEN;
  const WASSENGER_DEVICE = process.env.WASSENGER_DEVICE || process.env.WASSENGER_DEVICE_ID;
  const BOT_NUMBER = process.env.WHATSAPP_BOT_NUMBER || process.env.WASSENGER_DEVICE_ID || process.env.WASSENGER_DEVICE;

  if (!WASSENGER_TOKEN || !WASSENGER_DEVICE) {
    console.warn('[WASSENGER] Token o Device no configurado');
    return { ok: false, error: 'NO_WASSENGER_CONFIG' };
  }

  // No auto-mensajearse
  if (BOT_NUMBER && numero.includes(String(BOT_NUMBER).replace(/\D/g, ''))) {
    console.warn('[WASSENGER] Intento de enviar audio al propio bot bloqueado');
    return { ok: false, error: 'SELF_MESSAGE_BLOCKED' };
  }

  try {
    const { filename = 'audio.mp3', mimetype = 'audio/mpeg' } = opts;

    console.log(`[WASSENGER] 🔊 Paso 1/2: Subiendo audio (${audioBuffer.length} bytes)`);

    // Paso 1: Subir archivo a Wassenger usando fetch directo (FormData)
    const FormData = (await import('form-data')).default;
    const formData = new FormData();
    formData.append('file', audioBuffer, { filename, contentType: mimetype });
    formData.append('device', WASSENGER_DEVICE);

    const uploadResponse = await fetch('https://api.wassenger.com/v1/files', {
      method: 'POST',
      headers: {
        'Token': WASSENGER_TOKEN,
        ...formData.getHeaders()
      },
      body: formData
    });

    const uploadData = await uploadResponse.json().catch(() => ({}));
    
    if (!uploadResponse.ok || !uploadData.id) {
      console.error(`[WASSENGER] ❌ Error subiendo archivo:`, {
        status: uploadResponse.status,
        statusText: uploadResponse.statusText,
        body: JSON.stringify(uploadData),
        audioSize: audioBuffer.length
      });
      return { ok: false, error: `Upload failed: HTTP ${uploadResponse.status}`, data: uploadData };
    }

    const fileId = uploadData.id;
    console.log(`[WASSENGER] ✅ Archivo subido, ID: ${fileId}`);

    // Paso 2: Enviar mensaje con el file ID
    console.log(`[WASSENGER] 🔊 Paso 2/2: Enviando mensaje con audio a ${numero}`);

    const messageResponse = await dispatchHttpRequest({
      url: 'https://api.wassenger.com/v1/messages',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Token: WASSENGER_TOKEN },
      body: JSON.stringify({
        phone: numero,
        media: {
          file: fileId,  // ID del archivo subido (24 chars hex)
          filename
        },
        device: WASSENGER_DEVICE
      }),
      circuitId: 'wassenger:messages',
      timeoutMs: 15000,
      maxRetries: 2
    });

    const messageData = await messageResponse.json().catch(() => ({}));
    
    if (!messageResponse.ok) {
      console.error(`[WASSENGER] ❌ Error enviando mensaje:`, {
        status: messageResponse.status,
        statusText: messageResponse.statusText,
        body: JSON.stringify(messageData),
        fileId,
        userId: numero
      });
      loggers.wassenger.warn('Failed to send audio message', { 
        userId: numero, 
        status: messageResponse.status,
        statusText: messageResponse.statusText,
        errorBody: messageData,
        fileId,
        audioSize: audioBuffer.length 
      });
      return { ok: false, error: `Message failed: HTTP ${messageResponse.status}`, data: messageData };
    }

    console.log(`[WASSENGER] ✅ Audio enviado exitosamente a ${numero}`);
    loggers.wassenger.info('Audio sent successfully', { 
      userId: numero, 
      audioSize: audioBuffer.length,
      fileId,
      filename 
    });
    
    return { ok: true, data: messageData };

  } catch (error) {
    console.error(`[WASSENGER] ❌ Error enviando audio a ${numero}:`, error.message);
    loggers.wassenger.error('Error sending audio', { 
      userId: numero, 
      audioSize: audioBuffer?.length 
    }, error);
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
 * 🔄 Helper consistente para actualizar profile
 * SIEMPRE actualiza: activeAgent (si cambia), agent_history, lastMessageAt
 * 
 * @param {string} userId - ID del usuario
 * @param {Object} updates - Campos a actualizar en el profile
 * @param {Object} metadata - Metadata adicional para agent_history (opcional)
 * @returns {Object} - Profile actualizado
 */
async function updateProfile(userId, updates, metadata = {}) {
  const current = await loadProfile(userId) || {};
  
  const newProfile = {
    ...current,
    ...updates,
    lastMessageAt: new Date().toISOString() // SIEMPRE actualizar
  };
  
  // Si cambió activeAgent, actualizar agent_history
  if (updates.activeAgent && updates.activeAgent !== current.activeAgent) {
    newProfile.agent_history = newProfile.agent_history || {};
    newProfile.agent_history[updates.activeAgent] = newProfile.agent_history[updates.activeAgent] || [];
    newProfile.agent_history[updates.activeAgent].push({
      timestamp: new Date().toISOString(),
      fromAgent: current.activeAgent || 'NONE',
      ...metadata
    });
    
    console.log(`[PROFILE] ✅ Agent actualizado: ${current.activeAgent || 'NONE'} → ${updates.activeAgent}`);
  }
  
  return await saveProfile(userId, newProfile);
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
      agent: normalizeAgentName(agentName),
      agentName: agentName === 'AURORA' ? 'Aurora Core' : agentName,
      intentReason: 'validation_error',
      input: formResult.userMessage || '',
      output: errorMessage,
      meta: { errorType: formResult.validationError.type }
    });
    if (agentName === 'AURORA') {
      await clearAgentForm(userId, 'AURORA');
    }
    return true; // Manejado - hacer return
  }

  // ✅ Formulario completo → mensaje de confirmación + activar sistema confirmación
  if (formResult.isComplete) {
    // 🔥 HOTFIX v636: Guardar confirmación pendiente si es Aurora
    if (agentName === 'AURORA' && formResult.form) {
      const { processAuroraConfirmationRequest } = await import('../../servicios/aurora-confirmation-helper.js');
      const confirmationResult = await processAuroraConfirmationRequest('FORM_COMPLETE', profile, { form: formResult.form });
      
      if (confirmationResult.success) {
        await enviarWhatsApp(userId, confirmationResult.confirmationMessage);
        await saveConversationMessage(userId, { role: 'assistant', content: confirmationResult.confirmationMessage, agent: agentName });
        // 🔧 FIX: Limpiar agent_form para que el "SI" del usuario NO vuelva a activar el
        // formulario. Sin este clear, hasActiveForm = true en el siguiente mensaje, lo que
        // hace que handleFormResult intercepte el "SI" antes de que llegue al check de
        // pending_confirmation, causando un loop de resumen de confirmación infinito.
        await clearAgentForm(userId, agentName);
        return true; // Manejado - hacer return
      }
    }
    
    // Fallback: mensaje genérico si no es Aurora o falla
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
    /^\d+$/,  // Números simples (3, 4, 10, etc) - para cantidad de personas
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
const axelQuoteLocks = new Set();
const axelMissingPromptAt = new Map();
const axelEmailConsent = new Map();
const AXEL_MISSING_PROMPT_COOLDOWN_MS = 45000;

async function upsertCollisionQuote({
  quoteCode,
  userPhone,
  vehicleData,
  visionAnalysis,
  quoteResult,
  photoUrls,
  customerName,
  customerEmail,
  sessionFingerprint
}) {
  const damageType = visionAnalysis?.severity || 'collision';
  const priceMin = quoteResult?.priceRange?.min || null;
  const priceMax = quoteResult?.priceRange?.max || null;
  const currency = quoteResult?.priceRange?.currency || 'USD';
  const damageDescription = visionAnalysis?.analysis?.summary || visionAnalysis?.analysis?.description || null;

  const sql = `
    INSERT INTO collision_quotes (
      id,
      quote_code,
      user_phone,
      damage_type,
      client_name,
      vehicle_brand,
      vehicle_model,
      vehicle_year,
      email,
      phone,
      damage_description,
      photo_urls,
      damage_analysis,
      quote_details,
      price_min,
      price_max,
      currency,
      session_fingerprint,
      status,
      quote_sent_at,
      created_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, 'quoted', NOW(), NOW()
    )
    ON CONFLICT (quote_code) DO UPDATE SET
      client_name = EXCLUDED.client_name,
      vehicle_brand = EXCLUDED.vehicle_brand,
      vehicle_model = EXCLUDED.vehicle_model,
      vehicle_year = EXCLUDED.vehicle_year,
      email = EXCLUDED.email,
      phone = EXCLUDED.phone,
      damage_description = EXCLUDED.damage_description,
      photo_urls = EXCLUDED.photo_urls,
      damage_analysis = EXCLUDED.damage_analysis,
      quote_details = EXCLUDED.quote_details,
      price_min = EXCLUDED.price_min,
      price_max = EXCLUDED.price_max,
      currency = EXCLUDED.currency,
      session_fingerprint = EXCLUDED.session_fingerprint,
      status = EXCLUDED.status,
      quote_sent_at = EXCLUDED.quote_sent_at,
      updated_at = NOW();
  `;

  const values = [
    `col-${quoteCode}`,
    quoteCode,
    userPhone,
    damageType,
    customerName || null,
    vehicleData?.marca || null,
    vehicleData?.modelo || null,
    vehicleData?.año || null,
    customerEmail || null,
    userPhone,
    damageDescription,
    JSON.stringify(photoUrls || []),
    JSON.stringify(visionAnalysis || {}),
    quoteResult?.quote || null,
    priceMin,
    priceMax,
    currency,
    sessionFingerprint || null
  ];

  try {
    await query(sql, values);
    console.log('[AXEL-QUOTE] 🗄️ collision_quotes upserted', { quoteCode });
  } catch (error) {
    console.error('[AXEL-QUOTE] ❌ Error upserting collision_quotes:', error);
  }
}
async function processAxelQuote(userId, photoUrls, profile, latestUserText = '', sessionFingerprint = null) {
  const startTime = Date.now();
  if (axelQuoteLocks.has(userId)) {
    loggers.axel.warn('Quote already in progress, skipping duplicate trigger', { userId, photoCount: photoUrls.length });
    return { success: false, error: 'quote_in_progress' };
  }
  axelQuoteLocks.add(userId);
  
  try {
    loggers.axel.info('Starting quote processing', { userId, photoCount: photoUrls.length });
    
    // 1. Procesar formulario con el texto real
    const formResult = await processAxelFormMessage(userId, latestUserText || '');
    const vehicleData = {
      marca: formResult?.data?.marca || 'Pendiente',
      modelo: formResult?.data?.modelo || 'Pendiente',
      año: formResult?.data?.año || 'Pendiente',
      nombre: formResult?.data?.nombre,
      email: formResult?.data?.email
    };
    const missingFields = formResult?.missingFields || [];

    // 🚧 Bloquear cotización formal si faltan datos críticos
    if (missingFields.length > 0) {
      const prompt = generateFormPrompt(missingFields, formResult?.data || {});
      if (prompt) {
        const now = Date.now();
        const lastPrompt = axelMissingPromptAt.get(userId) || 0;
        if (now - lastPrompt >= AXEL_MISSING_PROMPT_COOLDOWN_MS) {
          await enviarWhatsApp(userId, `📝 Para enviarte la cotización formal necesito:

${prompt}`);
          axelMissingPromptAt.set(userId, now);
        } else {
          console.log('[AXEL-QUOTE] ⏳ Saltando prompt repetido (cooldown)', { userId });
        }
      }
      return { success: false, error: 'missing_fields', missingFields };
    }

    // 2. Analizar fotos con Vision AI (agrupado)
    loggers.axel.info('Analyzing collision photos', { userId, photoCount: photoUrls.length });
    const visionAnalysis = await analyzeCollisionPhotos(photoUrls);
    
    if (!visionAnalysis.success) {
      await enviarWhatsApp(userId, `Disculpa, tuve un problema analizando las fotos. ¿Podrías enviarlas nuevamente?`);
      return { success: false, error: visionAnalysis.error };
    }
    
    // 3. Generar cotización con IA (aunque falten datos, usando placeholders)
    const quoteResult = await generateQuote({
      vehicleData,
      damageAnalysis: visionAnalysis,
      photoUrls
    });
    
    if (!quoteResult.success) {
      await enviarWhatsApp(userId, `Hubo un problema generando la cotización. Déjame contactarte en un momento.`);
      return { success: false, error: quoteResult.error };
    }
    
    // 4. Generar código único
    const { code: quoteCode } = await generateQuoteCode();

    // 4.5 Guardar cotización en BD (trazabilidad)
    await saveQuote({
      quoteCode,
      userPhone: userId,
      vehicleData,
      damageAnalysis: visionAnalysis,
      quoteDetails: quoteResult.quote,
      priceRange: quoteResult.priceRange,
      customerName: vehicleData.nombre || profile.whatsappDisplayName || 'Cliente',
      customerEmail: vehicleData.email || null,
      photoUrls
    }).catch(err => console.error('[AXEL-QUOTE] ⚠️ Error guardando cotización:', err));

    // 4.6 Guardar también en collision_quotes para reporting unificado
    await upsertCollisionQuote({
      quoteCode,
      userPhone: userId,
      vehicleData,
      visionAnalysis,
      quoteResult,
      photoUrls,
      customerName: vehicleData.nombre || profile.whatsappDisplayName || 'Cliente',
      customerEmail: vehicleData.email || null,
      sessionFingerprint
    });

    // 5. Mensaje único al usuario (resumen corto) + pregunta cerrada para email
    const affectedParts = (visionAnalysis.affectedParts || []).slice(0, 4).join(', ') || 'No detectado';
    const hiddenRisk = visionAnalysis.hiddenDamageRisk || 'MEDIO';
    const estimatedDays = visionAnalysis.estimatedRepairDays || '2-5 días';

    const priceLine = quoteResult.priceRange
      ? `💰 Estimación: $${quoteResult.priceRange.min} - $${quoteResult.priceRange.max} USD`
      : '💰 Estimación: rango pendiente';

    const smsSummary = [
      `✅ Analicé ${photoUrls.length} foto(s).`,
      `🔍 Severidad: ${visionAnalysis.severity} | Riesgo ocultos: ${hiddenRisk}`,
      `🔧 Partes: ${affectedParts}`,
      priceLine,
      `⏱️ Tiempo estimado: ${estimatedDays}`,
      `📧 ¿Quieres más detalles por mail? Responde SI o NO.`
    ].filter(Boolean).join('\n');

    await enviarWhatsApp(userId, smsSummary);

    // Guardar pendiente de confirmación de email (texto largo para email)
    axelEmailConsent.set(userId, {
      quoteCode,
      email: vehicleData.email,
      customerName: vehicleData.nombre || profile.whatsappDisplayName || 'Cliente',
      vehicleData,
      damageAnalysis: visionAnalysis,
      quote: quoteResult.quote,
      priceRange: quoteResult.priceRange,
      photoUrls,
      sessionFingerprint: sessionFingerprint || quoteCode
    });

    // Observabilidad: registrar evento de cotización generada
    await saveInteraction({
      userId,
      agent: 'AXEL',
      agentName: 'Axel - PaintBull',
      intentReason: 'axel_quote_generated',
      input: latestUserText || `[${photoUrls.length} fotos]`,
      output: smsSummary,
      meta: {
        quoteCode,
        photoCount: photoUrls.length,
        correlationId: sessionFingerprint || quoteCode,
        missingFields,
        emailPending: true
      }
    });
    
    // 7. Marcar sesión de fotos como completada en BD
    const { completePhotoSession } = await import('../../database/axelPhotoRepository.js');
    await completePhotoSession(userId, quoteCode).catch(err => {
      console.error('[AXEL-QUOTE] ⚠️ Error marcando sesión completada:', err);
    });
    
    // ⏱️ T14: Limpiar transacción (cotización enviada exitosamente)
    profile.transactionStartedAt = null;
    profile.transactionAgent = null;
    profile.followUpSentAt = null;
    await updateProfile(userId, profile, { reason: 'quote_sent', quoteCode });
    console.log('[T14] ✅ Transacción completada (cotización enviada):', { userId, quoteCode });
    
    const duration = Date.now() - startTime;
    loggers.axel.timing('Quote processing complete', duration, { userId, quoteCode });
    
    return { success: true, quoteCode };
    
  } catch (error) {
    loggers.axel.error('Quote processing failed', { userId }, error);
    await enviarWhatsApp(userId, `Hubo un problema técnico. Déjame contactarte manualmente para ayudarte.`);
    return { success: false, error: error.message };
  } finally {
    axelQuoteLocks.delete(userId);
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

  // Background con try/catch global
  setImmediate(async () => {
    let userId = null;
    try {
      userId = normalizeUserId(data);
      const name = normalizeName(data);
      let text = normalizeText(data);
      const type = normalizeType(data);
      const mediaUrl = buildMediaUrl(data);
      const messageId = data.id || data.messageId || `${userId}_${Date.now()}`;

      if (debug) {
        console.log('[WASSENGER] Incoming:', {
          event: evt,
          userId: userId || 'NULL',
          messageId,
          type,
          hasText: !!text,
          hasMedia: !!mediaUrl,
          prod: isProd
        });
      }

      if (!userId) return;

      // 🛡️ DEDUPLICACIÓN: Ignorar webhooks duplicados o ecos
      if (isDuplicateMessage(messageId)) {
        console.log(`[DEDUP] ⏭️ Ignorando webhook duplicado de ${userId}`);
        return; // No res.json aquí - headers ya enviados
      }
      
      // 🔁 ECO: Ignorar webhooks de mensajes que el sistema acaba de enviar
      if (isEchoMessage(userId, text)) {
        console.log(`[DEDUP] 🔁 Ignorando eco - mensaje enviado por el sistema`);
        return;
      }

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

    // ⏱️ DEBOUNCE: Agrupar mensajes rápidos del mismo usuario
    // TODOS los webhooks que pasen los filtros básicos entran al debounce
    debounceUserWebhook(userId, async () => {
      try {
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
      const current = await loadProfileWithTimeout(loadProfile, userId, 15000).catch(() => ({})) || {};
      const userLanguage = current.preferredLanguage || 'es';
      
      const blockedMessages = {
        es: '📝 Por favor envía tu mensaje por texto, imagen o audio.\n\nNo puedo procesar este tipo de archivo.',
        en: '📝 Please send your message as text, image or audio.\n\nI cannot process this type of file.',
        qu: '📝 Ama hina willayta qillqasqapi, imaynapi utaq uyarinapaq apachimuy.\n\nMana atinichu kay laya willakuna ruwayta.'
      };
      
      await enviarWhatsApp(userId, blockedMessages[userLanguage] || blockedMessages.es);
      return; // 🛑 No procesar
    }

    // 🎤 Detectar si usuario envió audio (para transcribir con Whisper)
    const userSentAudio = (type === 'audio' || type === 'voice' || type === 'ptt');
    
    // ✅ Obtener perfil una sola vez (se usará en múltiples flujos)
    const current = await loadProfileWithTimeout(loadProfile, userId, 15000).catch(() => ({})) || {};
    let userLanguage = current.preferredLanguage || 'es';

    // 🎤 Voz → transcribir (MULTIIDIOMA + VALIDACIÓN + FALLBACKS)
    if (userSentAudio) {
      if (!mediaUrl) {
        console.error('[Whisper] ❌ No se encontró URL de audio en el mensaje');
        console.error('[Whisper] Debug - data.media:', JSON.stringify(data.media, null, 2));
        
        // ✅ FALLBACK: Enviar mensaje directamente y terminar (NO procesar con Aurora)
        console.log('[Whisper] 🔄 Fallback activado - sin URL de audio');
        const fallbackMsg = userLanguage === 'en' 
          ? '🎤 I could not access your audio. Can you write it as text? 😊'
          : userLanguage === 'fr'
          ? '🎤 Je n\'ai pas pu accéder à votre audio. Pouvez-vous l\'écrire en texte? 😊'
          : userLanguage === 'it'
          ? '🎤 Non ho potuto accedere al tuo audio. Puoi scriverlo come testo? 😊'
          : userLanguage === 'pt'
          ? '🎤 Não pude acessar seu áudio. Pode escrevê-lo como texto? 😊'
          : userLanguage === 'qu'
          ? '🎤 Mana atisqachu audio kaqman yaykuy. Qillqasqa qillqayta atiwaqchu? 😊'
          : '🎤 No pude procesar tu audio. ¿Puedes escribirlo por texto? 😊';
        
        console.log('[Whisper] 📤 Enviando mensaje fallback y deteniendo flujo');
        await enviarWhatsApp(userId, fallbackMsg);
        return; // ← Detener flujo, NO procesar con Aurora
      } else {
        // URL de audio disponible - procesar normalmente
        console.log(`[Whisper] 🎤 Procesando audio para usuario ${userId} en idioma: ${userLanguage}`);
        console.log('[Whisper] 📋 Debug - Media data:', {
          url: mediaUrl?.substring(0, 100),
          mime: data.media?.mime,
          size: data.media?.size,
          hasLinks: !!data.media?.links
        });
        
        // ✅ Validar audio antes de transcribir (con mime type de Wassenger)
        const audioMetadata = {
          mimeType: data.media?.mime || data.media?.mimetype,
          size: data.media?.size || data.media?.fileSize
        };
        
        const validation = validateAudio(mediaUrl, audioMetadata);
        
        if (!validation.valid) {
          console.error('[Whisper] ❌ Audio inválido:', validation.errors);
          console.error('[Whisper] Debug - URL:', mediaUrl);
          console.error('[Whisper] Debug - Metadata:', audioMetadata);
          
          // ✅ FALLBACK: Enviar mensaje de error y terminar (NO procesar con Aurora)
          console.log('[Whisper] 🔄 Fallback activado - validación fallida');
          const errorMsg = getLocalizedAudioError(validation.errors[0], userLanguage);
          console.log('[Whisper] 📤 Enviando mensaje de error y deteniendo flujo');
          await enviarWhatsApp(userId, errorMsg);
          return; // ← Detener flujo, NO procesar con Aurora
        } else {
          // Validación exitosa - continuar con transcripción
          
          // ⚠️ Warnings (tamaño grande, etc.)
          if (validation.warnings.length > 0) {
            console.warn('[Whisper] ⚠️ Advertencias:', validation.warnings);
          }
          
          // 🎤 Transcribir
          let tr;
          try {
            tr = await transcribeAudio(mediaUrl, {
              language: userLanguage,
              agentName: 'orquestador',
              userName: name || userId
            });
          } catch (error) {
            // Capturar errores de descarga/transcripción
            tr = { success: false, error: error.message || 'Error desconocido' };
          }
          
          if (!tr?.success || !tr?.text) {
            console.error('[Whisper] ❌ Error en transcripción:', tr?.error);
            
            // ✅ FALLBACK: Enviar mensaje de error y terminar (NO procesar con Aurora)
            console.log('[Whisper] 🔄 Fallback activado - transcripción fallida');
            const errorMsg = getLocalizedAudioError(tr?.error || 'Error desconocido', userLanguage);
            console.log('[Whisper] 📤 Enviando mensaje de error y deteniendo flujo');
            await enviarWhatsApp(userId, errorMsg);
            return; // ← Detener flujo, NO procesar con Aurora
          } else {
            // Transcripción exitosa
            text = tr.text;
            console.log(`[Whisper] ✅ Audio transcrito (${tr.language}):`, text.substring(0, 100));
          }
        }
      }
    }

    // Construir “evento” para Aurora Core
    const envelope = buildMessageEnvelope({ userId, name, text, type, mediaUrl, data, evt });

    // ✅ Perfil ya cargado antes del bloque if (userSentAudio) - línea 967
    // Cargar historial de conversación
    let conversationHistory = await loadConversationHistory(userId, 10).catch(() => []);

    // ✅ Registrar mensaje procesado para rate limiting
    recordMessage(userId);

    // � DETECCIÓN DE CAMBIO DE IDIOMA MANUAL
    // Si usuario escribe "english", "español", "français", etc.
    const languageCommand = detectLanguageCommand(text);
    
    if (languageCommand) {
      console.log(`[LANGUAGE] 🔄 Usuario solicitó cambio a: ${languageCommand}`);
      
      // Actualizar idioma en perfil
      current.preferredLanguage = languageCommand;
      await updateProfile(userId, { preferredLanguage: languageCommand }, { reason: 'language_command_change', language: languageCommand });
      console.log(`[LANGUAGE] ✅ Idioma actualizado en BD: ${languageCommand}`);
      
      // Obtener último mensaje del agente (ya tenemos conversationHistory arriba)
      const lastAssistantMessage = conversationHistory
        .filter(msg => msg.role === 'assistant')
        .pop();
      
      if (lastAssistantMessage && lastAssistantMessage.content) {
        console.log('[LANGUAGE] 📤 Reenviando último mensaje traducido...');
        
        // Traducir último mensaje al nuevo idioma
        const { translateMessage } = await import('../../utils/language-detector.js');
        const translatedMessage = await translateMessage(lastAssistantMessage.content, languageCommand);
        
        // Enviar traducción sin mensaje de confirmación (silencioso)
        await enviarWhatsApp(userId, translatedMessage);
        
        console.log('[LANGUAGE] ✅ Mensaje traducido enviado');
        
        // Terminar procesamiento - no res.json (headers ya enviados)
        return;
      } else {
        // Si no hay mensaje anterior, solo confirmar cambio
        const confirmation = getLanguageChangeConfirmation(languageCommand);
        await enviarWhatsApp(userId, confirmation);
        console.log('[LANGUAGE] ✅ Cambio confirmado (sin mensaje anterior)');
        return; // No res.json (headers ya enviados)
      }
    }

    // 🌍 DETECCIÓN DE IDIOMA AUTOMÁTICA - Solo si no tiene idioma guardado
    // Idiomas soportados: español (default), inglés, francés, quechua
    const isFirstMessage = !current.preferredLanguage;
    // Reasignar userLanguage si es necesario (ya declarado en línea 966)
    userLanguage = current.preferredLanguage || 'es';
    
    if (isFirstMessage && text) {
      // MODO: Default español - el usuario debe pedir explícitamente otro idioma
      userLanguage = 'es';
      console.log('[LANGUAGE] 🌍 Primera interacción - idioma español por defecto');
      
      // ✅ Guardar idioma default
      current.preferredLanguage = userLanguage;
      await updateProfile(userId, { preferredLanguage: userLanguage }, { reason: 'first_message_language_detected' });
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
    
    // Detectar nombre: WhatsApp > BD > mensaje (si first visit)
    if (name) {
      detectedName = cleanWhatsAppName(name);
    } else if (current.name) {
      detectedName = current.name;
    } else if (firstVisit && text) {
      const nameFromMessage = extractNameFromMessage(text);
      if (nameFromMessage) {
        detectedName = nameFromMessage;
      }
    }

    const profile = {
      ...current,
      userId,
      name: detectedName, // 🎯 Usar nombre limpio e inteligente
      whatsappDisplayName: name || current.whatsappDisplayName || null, // ✅ ACTUALIZAR SIEMPRE si viene de WhatsApp
      preferredLanguage: userLanguage, // 🌍 Idioma detectado/guardado
      channel: 'whatsapp',
      lastMessageAt: ahoraISO,
      conversationCount: (current.conversationCount || 0) + 1,
      conversacionEnCurso
    };

    await updateProfile(userId, profile, { reason: 'message_received' });

    // Guardar mensaje usuario con contexto reply si existe
    const replyContext = buildReplyContext(text || '', body, conversationHistory);
    const processedText = replyContext.hasReplyContext ? replyContext.enrichedMessage : (text || '');

    // 📸 Si hay imagen pero no texto, usar placeholder descriptivo
    const messageContent = processedText || (mediaUrl && type === 'image' ? '[Usuario envió imagen]' : '');

    await saveConversationMessage(userId, {
      role: 'user',
      content: messageContent,
      agent: profile.activeAgent || 'AURORA'
    });

    // 📋 Inicializar variables de formulario para todo el scope
    let formResult = { form: null, needsMoreInfo: false, updates: {} };
    const currentAgentForm = await getAgentForm(userId, profile.activeAgent || 'AURORA').catch(() => null);

    // ═══════════════════════════════════════════════════════════════════════
    // � AURORA FLOW: Confirmaciones SI/NO y formulario de reservas
    // CRÍTICO: debe ejecutarse ANTES del orquestador/LLM para que "Si"/"No"
    // llegue a processConfirmationResponse en lugar de al modelo de lenguaje.
    // ═══════════════════════════════════════════════════════════════════════
    if (profile.activeAgent === 'AURORA' && processedText) {
      const { detectVirtualAgentSalesPromo: _dvVAP, detectarSaludoConInteresServicio: _dSCIS } = await import('../../deteccion-intenciones/detectar-intencion.js');
      const _hasVAP = _dvVAP(processedText).detected;
      const _hasSI  = _dSCIS(processedText);
      const _hasAF  = !!currentAgentForm;
      const _hasFCont = detectFormContinuation(processedText);
      const _shouldForm = !_hasVAP && (_hasSI || isReservationIntent(processedText) || _hasAF || _hasFCont);

      // ① Interceptar SI/NO pendiente ANTES de ir al LLM
      const _auroraEarlyPending = await getPendingConfirmation(userId).catch(() => null);
      if (_auroraEarlyPending) {
        const _isPos = isPositiveResponse(processedText);
        const _isNeg = isNegativeResponse(processedText);
        if (_isPos || _isNeg) {
          console.log('[AURORA-FLOW] ✅ Interceptando SI/NO (pendingConfirmation) antes del LLM');
          const _confResult = await processConfirmationResponse(processedText, profile);
          if (_confResult.success && _isPos) {
            profile.transactionStartedAt = null;
            profile.transactionAgent     = null;
            profile.followUpSentAt       = null;
            await saveProfile(userId, profile);
            console.log('[T14] ✅ Transacción Aurora completada:', { userId });
          }
          await enviarWhatsApp(userId, _confResult.message);
          await saveConversationMessage(userId, { role: 'assistant', content: _confResult.message, agent: 'AURORA' });
          await saveInteraction({
            userId,
            agent: normalizeAgentName('AURORA'),
            agentName: 'Aurora Core',
            intentReason: 'aurora_confirmation_response',
            input: processedText,
            output: _confResult.message,
            meta: { envelope, confirmationSuccess: _confResult.success }
          });
          return;
        }
      }

      // ② Formulario de reservas (progresivo, sin LLM)
      if (_shouldForm) {
        console.log('[AURORA-FLOW] 📋 Activando formulario de reserva:', {
          isReservationIntent: isReservationIntent(processedText),
          hasActiveForm: _hasAF,
          isFormContinuation: _hasFCont
        });
        formResult = await processMessageWithForm(userId, processedText, profile, currentAgentForm);
        formResult.userMessage = text;

        // Guardar form si hay actualizaciones
        if (formResult.form && formResult.updates && Object.keys(formResult.updates).length > 0) {
          await saveAgentForm(userId, 'AURORA', formResult.form.toJSON(), 120);
        }

        // ⏱️ T14: Iniciar tracking de transacción al comenzar captura de datos
        if (formResult.needsMoreInfo && !profile.transactionStartedAt) {
          profile.transactionStartedAt = new Date().toISOString();
          profile.transactionAgent = 'AURORA';
          profile.followUpSentAt = null;
          await saveProfile(userId, profile);
          console.log('[T14] ⏱️ Transacción AURORA iniciada:', { userId, timestamp: profile.transactionStartedAt });
        }

        const _handled = await handleFormResult(formResult, userId, 'AURORA', profile);
        if (_handled) return;
      }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // �🎨 AXEL FLOW: Cotizaciones de pintura con fotos
    // ═══════════════════════════════════════════════════════════════════════
    if (profile.activeAgent === 'AXEL') {
      // ────────────────────────────────────────────────────────────────────
      // PASO 1: Consentimiento email (SI/NO post-cotización)
      // ────────────────────────────────────────────────────────────────────
      if (axelEmailConsent.has(userId) && processedText) {
        const consentData = axelEmailConsent.get(userId);
        const normalized = processedText.trim().toLowerCase();
        const isYes = ['si', 'sí', 'yes', 'y', 'claro', 'ok'].includes(normalized);
        const isNo = ['no', 'nop', 'nope'].includes(normalized);

        if (isYes || isNo) {
          if (isYes && consentData.email) {
            const emailResult = await sendQuoteEmail({
              customerName: consentData.customerName,
              customerEmail: consentData.email,
              vehicleData: consentData.vehicleData,
              damageAnalysis: consentData.damageAnalysis,
              quote: consentData.quote,
              priceRange: consentData.priceRange,
              photoUrls: consentData.photoUrls,
              quoteCode: consentData.quoteCode
            });

            const message = emailResult.success
              ? `✉️ Listo, envié la cotización detallada a ${consentData.email}. ¿Necesitas algo más?`
              : `⚠️ No pude enviar el email (${emailResult.error}). Te contacto manualmente.`;
            
            await enviarWhatsApp(userId, message);
            
            if (emailResult.success) {
              await saveInteraction({
                userId,
                agent: 'AXEL',
                agentName: 'Axel - PaintBull',
                intentReason: 'email_sent',
                input: consentData.email,
                output: 'quote_email_sent',
                meta: {
                  quoteCode: consentData.quoteCode,
                  correlationId: consentData.sessionFingerprint || consentData.quoteCode,
                  email: consentData.email
                }
              });
            }
          } else {
            await enviarWhatsApp(userId, '👍 Entendido, no envío email. ¿Necesitas algo más?');
          }

          axelEmailConsent.delete(userId);
          return;
        } else {
          await enviarWhatsApp(userId, 'Por favor responde solo SI o NO para confirmar el envío de la cotización por email.');
          return;
        }
      }

    // 📋 Formulario inteligente: activar si hay intención, formulario activo, o continuación detectada
    const hasActiveForm = !!currentAgentForm;
    const isFormContinuation = detectFormContinuation(processedText);
    
    // 🔍 DETECCIÓN TEMPRANA: Verificar si hay intención especial que debe ir directo al orquestador
    const { detectVirtualAgentSalesPromo, detectarSaludoConInteresServicio } = await import('../../deteccion-intenciones/detectar-intencion.js');
    const hasVirtualAgentPromo = detectVirtualAgentSalesPromo(processedText).detected;
    const hasServiceInterest = detectarSaludoConInteresServicio(processedText);
    
    // 🎯 LÓGICA CORRECTA:
    // - Promo de agente virtual (Enzo): NO activar formulario → orquestador
    // - Saludo "quiero probar servicio": SÍ activar formulario → capturar datos
    // - Cualquier otro mensaje con intención de reserva: SÍ activar formulario
    const shouldActivateForm = !hasVirtualAgentPromo && (hasServiceInterest || isReservationIntent(processedText) || hasActiveForm || isFormContinuation);
    
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
    
    // 🔧 FIX: Verificar pending_confirmation ANTES del form handler para Aurora.
    // Si el usuario responde SI/NO a un resumen de confirmación pendiente, procesarlo
    // de inmediato sin pasar por el formulario (evita el loop infinito de confirmación).
    if (profile.activeAgent === 'AURORA') {
      const earlyPending = await getPendingConfirmation(userId).catch(() => null);
      if (earlyPending) {
        const isPos = isPositiveResponse(processedText);
        const isNeg = isNegativeResponse(processedText);
        if (isPos || isNeg) {
          console.log('[WASSENGER] 🔧 FIX: Interceptando SI/NO antes del form handler - confirmación pendiente');
          const confirmationResult = await processConfirmationResponse(processedText, profile);

          if (confirmationResult.success && isPos) {
            profile.transactionStartedAt = null;
            profile.transactionAgent = null;
            profile.followUpSentAt = null;
            await saveProfile(userId, profile);
          }

          const interactionAgent = earlyPending.agentName || profile.activeAgent || 'AURORA';
          await enviarWhatsApp(userId, confirmationResult.message);
          await saveConversationMessage(userId, { role: 'assistant', content: confirmationResult.message, agent: interactionAgent });
          await saveInteraction({
            userId,
            agent: normalizeAgentName(interactionAgent),
            agentName: interactionAgent,
            intentReason: 'confirmation_response_early',
            input: processedText,
            output: confirmationResult.message,
            meta: { envelope, confirmationSuccess: confirmationResult.success }
          });
          return;
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
      
      formResult = await processMessageWithForm(userId, processedText, profile, currentAgentForm);
      formResult.userMessage = text;
      
      // 💾 Guardar form en sistema unificado si hay cambios
      if (formResult.form && formResult.updates && Object.keys(formResult.updates).length > 0) {
        await saveAgentForm(userId, 'AURORA', formResult.form.toJSON(), 120);
      }
      
      // ⏱️ T14: Iniciar tracking de transacción si necesita más info (inicio de reserva)
      if (formResult.needsMoreInfo && !profile.transactionStartedAt) {
        profile.transactionStartedAt = new Date().toISOString();
        profile.transactionAgent = 'AURORA';
        profile.followUpSentAt = null;
        await saveProfile(userId, profile);
        console.log('[T14] ⏱️ Transacción AURORA iniciada:', { userId, timestamp: profile.transactionStartedAt });
      }

      // 🎯 Usar función compartida para manejar resultado
      const handled = await handleFormResult(formResult, userId, 'AURORA', profile);
      if (handled) return;
    }

    // Si hay confirmación pendiente en sistema unificado, SOLO procesar SI/NO explícito
    const pendingConfirmation = await getPendingConfirmation(userId).catch(() => null);
    if (pendingConfirmation) {
      const isPos = isPositiveResponse(processedText);
      const isNeg = isNegativeResponse(processedText);

      if (isPos || isNeg) {
        console.log(`[WASSENGER] ✅ Confirmación pendiente (${pendingConfirmation.agentName || 'AURORA'}) y respuesta SI/NO`);

        const confirmationResult = await processConfirmationResponse(processedText, profile);

        // ⏱️ T14: Limpiar transacción si confirmación exitosa (transacción completada)
        if (confirmationResult.success && isPos) {
          profile.transactionStartedAt = null;
          profile.transactionAgent = null;
          profile.followUpSentAt = null;
          await saveProfile(userId, profile);
          console.log('[T14] ✅ Transacción completada (confirmación exitosa):', { userId });
        }

        const interactionAgent = pendingConfirmation.agentName || profile.activeAgent || 'AURORA';
        const intentReason = pendingConfirmation.agentName ? 'specialized_confirmation' : 'confirmation_response';

        await enviarWhatsApp(userId, confirmationResult.message);
        await saveConversationMessage(userId, {
          role: 'assistant',
          content: confirmationResult.message,
          agent: interactionAgent
        });
        await saveInteraction({
          userId,
          agent: normalizeAgentName(interactionAgent),
          agentName: interactionAgent,
          intentReason,
          input: processedText,
          output: confirmationResult.message,
          meta: {
            envelope,
            confirmationSuccess: confirmationResult.success,
            actionType: confirmationResult.actionType,
            needsAction: confirmationResult.needsAction
          }
        });

        console.log('[WASSENGER] 🛑 Confirmación procesada - NO continuar con orquestador');
        return;
      }

      // Si no es SI/NO explícito, continuar con orquestador normal
      console.log('[WASSENGER] ⚠️ Confirmación pendiente pero respuesta NO es SI/NO - continuar con agente');
    }

    // Si el usuario reanuda reserva (mensaje de continuación si aplica)
    if (currentAgentForm && formResult?.form?.getResumeMessage) {
      const resumeMessage = formResult.form.getResumeMessage();
      if (resumeMessage) formResult.resumeMessage = resumeMessage;
    }

      // ────────────────────────────────────────────────────────────────────
      // PASO 2: Manejo de fotos (agregar a sesión)
      // ────────────────────────────────────────────────────────────────────
      if (mediaUrl && type === 'image') {
        await queueTask(userId, async () => {
          const photoStatus = await addPhoto(userId, mediaUrl, type);
          
          // Tracking de transacción en primera foto
          if (photoStatus.currentCount === 1 && !profile.transactionStartedAt) {
            profile.transactionStartedAt = new Date().toISOString();
            profile.transactionAgent = 'AXEL';
            profile.followUpSentAt = null;
            await saveProfile(userId, profile);
          }
          
          // Mensaje de bienvenida en primera foto
          if (photoStatus.currentCount === 1 && !photoStatus.firstAckSent) {
            await enviarWhatsApp(userId, `📸 Recibí tu primera foto. Envíame hasta ${photoStatus.maxPhotos} en total y, cuando termines, escribe "listo". Agruparé las fotos en una sola respuesta con análisis y cotización.`);
            markFirstAckSent(userId);

            await saveInteraction({
              userId,
              agent: 'AXEL',
              agentName: 'Axel - PaintBull',
              intentReason: 'photo_received',
              input: '[PHOTO]',
              output: 'ack_first_photo',
              meta: {
                correlationId: photoStatus.sessionFingerprint,
                photoCount: photoStatus.currentCount
              }
            });
            
            // Timeout reminder
            startTimeout(userId, async () => {
              await enviarWhatsApp(userId, `⏳ Pasaron 20s sin nuevas fotos. Cuando tengas todas listas escribe "listo" para procesar.`);
              await saveInteraction({
                userId,
                agent: 'AXEL',
                agentName: 'Axel - PaintBull',
                intentReason: 'photo_timeout_reminder',
                input: '[PHOTO_TIMEOUT]',
                output: 'reminder_sent',
                meta: { photoCount: photoStatus.currentCount }
              });
            });
          }
          
          // Mensaje cuando alcanza el máximo
          if (photoStatus.currentCount >= photoStatus.maxPhotos) {
            await enviarWhatsApp(userId, `📸 Ya tengo ${photoStatus.maxPhotos} fotos. Escribe "listo" cuando quieras que analice y cotice.`);
          }
        });
        
        return;
      }

      // ────────────────────────────────────────────────────────────────────
      // PASO 3: Comando "listo" (procesar cotización)
      // ────────────────────────────────────────────────────────────────────
      if (!mediaUrl && processedText) {
        const session = await getSession(userId);
        
        if (session && session.photoCount > 0) {
          const normalized = processedText.toLowerCase().trim().replace(/[!.]/g, '');
          const finalizationPatterns = [
            /^listo$/,
            /^ya$/,
            /^ya\s+esta$/,
            /^ya\s+está$/,
            /^procesar$/,
            /^ok$/,
            /^dale$/
          ];
          
          const isFinalizationCommand = finalizationPatterns.some(rx => rx.test(normalized));
          
          if (isFinalizationCommand) {
            await queueTask(userId, async () => {
              const result = await completeSession(userId);
              
              if (result) {
                await processAxelQuote(userId, result.photos, profile, processedText, result.sessionFingerprint);
                clearQueue(userId);
              }
            });
            
            return;
          }
        }
        
        // ────────────────────────────────────────────────────────────────────
        // PASO 4: Texto normal (actualizar formulario, continuar orquestador)
        // ────────────────────────────────────────────────────────────────────
        // Actualizar formulario silenciosamente con datos del usuario
        await processAxelFormMessage(userId, processedText).catch(() => {});
        
        // Continuar con orquestador para respuestas conversacionales
      }
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
            agent: normalizeAgentName('ANGELA'),
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

    // 🎯 DETECCIÓN CÓDIGO EXPRESO @agente - ELIMINADO (duplicidad)
    // Ahora detectar-intencion.js detecta @menciones y activa flags.agentHandoff
    // que luego es procesado por executeHandoff() con locks y validaciones

    // 🎯 DETECCIÓN DE CAMPAÑAS (ya no hace handoffs directos)
    // Las campañas con targetAgent deben usar detectar-intencion.js
    // para activar flags.agentHandoff y usar executeHandoff() centralizado

        // Si hay media y es recibo, dejamos que Aurora lo maneje (sin meter agentes aquí)
    // Para que isReceiptImage funcione, armamos messageData estándar
    const messageData = { type, media: { url: mediaUrl } };

    if (mediaUrl && profile.activeAgent === 'AURORA' && isReceiptImage(messageData)) {
      const paymentResult = await processPaymentReceipt(messageData, profile);
      await enviarWhatsApp(userId, paymentResult.message);
      await saveConversationMessage(userId, { role: 'assistant', content: paymentResult.message, agent: 'AURORA' });
      await saveInteraction({
        userId,
        agent: normalizeAgentName('AURORA'),
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
      savedPartial: currentAgentForm,
      envelope
    });
    
    // 🔒 GUARDAR fromAgent ANTES de actualizar (fix bug handoff loop)
    const originalFromAgent = profile.activeAgent || 'AURORA';
    
    // 🏎️ MERCEDES BENZ v735: Actualización de agente centralizada
    // Regla: handoff actualiza agente DESPUÉS de completar transición UX.
    const shouldChangeAgent = resultado.agenteKey && resultado.agenteKey !== profile.activeAgent;
    const isHandoffFlow = resultado?.metadata?.agentHandoff === true;

    if (shouldChangeAgent && !isHandoffFlow) {
      console.log(`[WASSENGER-V735] 🔄 Solicitando cambio de agente: ${profile.activeAgent} → ${resultado.agenteKey}`);

      const updateResult = await updateAgentState(
        userId,
        resultado.agenteKey,
        {
          reason: 'orchestrator',
          fromAgent: profile.activeAgent,
          metadata: resultado.metadata,
          intentReason: resultado.razonSeleccion
        },
        saveProfile,
        profile
      );

      if (updateResult.success) {
        profile.activeAgent = resultado.agenteKey;
        console.log(`[WASSENGER-V735] ✅ AgentStateManager actualizó: ${updateResult.fromAgent} → ${updateResult.toAgent}`);
      } else {
        console.error(`[WASSENGER-V735] ❌ AgentStateManager falló:`, updateResult.error);
      }
    } else if (!shouldChangeAgent) {
      console.log(`[WASSENGER-DEBUG] ✅ Agente NO cambió, manteniendo: ${profile.activeAgent}`);
    }

    // Cancelación (si orquestador lo marca)
    if (resultado?.metadata?.cancelacion) {
      if (resultado.metadata.shouldSavePartialForm) {
        await saveAgentForm(userId, 'AURORA', formResult.form?.toJSON() || {}, 120);
      }
      await clearPendingConfirmation(userId);
      await clearJustConfirmed(userId);
    }

    // 🤝 Handoff genérico - NUEVO SISTEMA V2
    if (resultado?.metadata?.agentHandoff) {
      const targetAgent = resultado.metadata.targetAgent;
      const fromAgent = originalFromAgent; // ← Usar original, NO el actualizado
      const userLanguage = profile.preferredLanguage || 'es';
      const userName = profile.whatsappDisplayName || profile.name || 'amigo';

      console.log(`[WASSENGER-V2] 🔀 Handoff detectado: ${fromAgent} → ${targetAgent}`);
      loggers.webhook.handoff(fromAgent, targetAgent, userId, resultado.metadata.intent?.reason || 'unknown');
      
      // Prevenir handoffs concurrentes (AgentStateManager gestiona locks)
      if (isUpdateInProgress(userId)) {
        console.warn(`[WASSENGER-V2] ⚠️ Actualización de agente en progreso para ${userId}, esperando...`);
        await new Promise(r => setTimeout(r, 2000));
      }
      
      // ⏱️ T14: Iniciar transacción si viene de AURORA y va a agente especializado
      if (fromAgent === 'AURORA' && targetAgent !== 'AURORA' && !profile.transactionStartedAt) {
        profile.transactionStartedAt = new Date().toISOString();
        profile.transactionAgent = targetAgent;
        profile.followUpSentAt = null;
        await updateProfile(userId, { 
          transactionStartedAt: profile.transactionStartedAt, 
          transactionAgent: targetAgent,
          followUpSentAt: null
        }, { reason: 'handoff_transaction_start', fromAgent, targetAgent });
        console.log('[T14] ⏱️ Transacción iniciada en handoff:', { 
          userId, from: fromAgent, to: targetAgent, timestamp: profile.transactionStartedAt 
        });
      }

      // ✅ Ejecutar handoff usando NUEVO SISTEMA V2
      const handoffResult = await executeHandoff(
        userId,
        profile,
        fromAgent,
        targetAgent,
        userName,
        userLanguage,
        saveProfile,
        enviarWhatsApp,
        saveConversationMessage
      );
      
      if (handoffResult.success) {
        // 🏎️ Commit del estado de agente SOLO después de transición exitosa
        const updateResult = await updateAgentState(
          userId,
          targetAgent,
          {
            reason: 'handoff',
            fromAgent,
            metadata: resultado.metadata,
            intentReason: resultado.razonSeleccion
          },
          saveProfile,
          profile
        );

        if (updateResult.success) {
          profile.activeAgent = targetAgent;
          console.log(`[WASSENGER-V735] ✅ Commit handoff: ${updateResult.fromAgent} → ${updateResult.toAgent}`);
        } else {
          console.error('[WASSENGER-V735] ❌ Handoff UX completado pero commit de agente falló:', updateResult.error);
          await enviarWhatsApp(userId, 'Hice el relevo, pero tuve un problema guardando el estado. Escribe de nuevo @' + targetAgent.toLowerCase() + ' por favor.');
          return;
        }

        console.log(`[WASSENGER-V2] ✅ Handoff completado exitosamente - continuando con respuesta del agente`);
      } else {
        console.error(`[WASSENGER-V2] ❌ Handoff falló:`, handoffResult.error);
        await enviarWhatsApp(userId, 'Disculpa, hubo un problema conectándote. Escribe "ayuda" y lo reintentamos.');
        return;
      }
    }

    // 🧠 Generar respuesta (OpenAI) según sistema de Aurora Core
    
    // 🔍 DEBUG: Verificar specialMode
    console.log('[WASSENGER] 🔍 DEBUG - Antes de OpenAI:', {
      userId,
      agenteKey: resultado.agenteKey,
      specialMode: resultado.metadata?.specialMode,
      hasVirtualAgentSalesFlag: resultado.metadata?.intent?.flags?.virtualAgentSalesPromo,
      systemPromptLength: resultado.systemPrompt?.length,
      systemPromptStart: resultado.systemPrompt?.substring(0, 200)
    });
    
    // 🔧 VALIDACIÓN CRÍTICA: Si orquestador ya devolvió respuesta lista, NO llamar OpenAI
    // Casos: mantenimiento de agente, cancelación, error específico
    if (resultado.respuesta && resultado.shouldReply === true) {
      console.log('[WASSENGER] 📤 Respuesta directa del orquestador (no requiere OpenAI)');
      
      const agentDisplayNames = {
        'AURORA': 'Aurora Core',
        'ALUNA': 'Aluna - Closer Membresías',
        'ADRIANA': 'Adriana - SegPopular',
        'ENZO': 'Enzo - MarketingLab',
        'ANGELA': 'Angela - MedBeneficios',
        'AXEL': 'Axel - PaintBull',
        'GABI': 'Gabi - GR Consulting',
        'PAULA': 'Paula - PropElite'
      };
      
      const finalReply = resultado.respuesta;
      const responseAgent = resultado.agenteKey || resultado.metadata?.agent || profile.activeAgent;
      
      await enviarWhatsApp(userId, finalReply);
      await saveConversationMessage(userId, { 
        role: 'assistant', 
        content: finalReply, 
        agent: responseAgent 
      });
      
      await saveInteraction({
        userId,
        agent: normalizeAgentName(responseAgent),
        agentName: agentDisplayNames[responseAgent] || responseAgent,
        intentReason: resultado.metadata?.maintenance ? 'agent_maintenance' : resultado.razonSeleccion || 'direct_response',
        input: processedText.substring(0, 500),
        output: finalReply,
        meta: { 
          ...resultado.metadata,
          envelope,
          maintenance: resultado.metadata?.maintenance || false,
          intendedAgent: resultado.metadata?.intendedAgent || null
        }
      });
      
      return; // ✅ Terminar sin llamar a OpenAI
    }
    
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

    // 💼 Si es ALUNA, detectar y crear lead automáticamente
    if (resultado.agenteKey === 'ALUNA' && reply.includes('[LEAD_DATA:')) {
      const leadMatch = reply.match(/\[LEAD_DATA:([^|]+)\|(\d+)\|([^|]+)\|([^|]+)\|([^\]]+)\]/);
      
      if (leadMatch) {
        const [_, planType, price, name, email, phone] = leadMatch;
        
        console.log('[ALUNA-LEAD] 💼 Creando lead automático:', { planType, price, name, email });
        
        try {
          const { databaseService } = await import('../../database/database.js');
          const leadId = `lead_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          
          await databaseService.run(
            `INSERT INTO membership_leads (
              id, user_phone, membership_type, client_name, email, phone, 
              monthly_fee, status, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', NOW())`,
            [leadId, userId, planType, name, email, phone, parseFloat(price)]
          );
          
          console.log('[ALUNA-LEAD] ✅ Lead creado:', leadId);
          
          // Limpiar el tag de la respuesta visible al usuario
          finalReply = reply.replace(/\[LEAD_DATA:[^\]]+\]/g, '').trim();
        } catch (error) {
          console.error('[ALUNA-LEAD] ❌ Error creando lead:', error);
          // No bloquear - continuar sin lead
        }
      }
    }

    await saveConversationMessage(userId, {
      role: 'assistant',
      content: finalReply,
      agent: normalizeAgentName(resultado.agenteKey),
      metadata: {
        correlationId: resultado.agenteKey === 'AXEL' ? resultado?.quoteCode || null : null
      }
    });

    await saveInteraction({
      userId,
      agent: normalizeAgentName(resultado.agenteKey),
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
    const shouldSplit = resultado.agenteKey !== 'AXEL' && messageProcessed.shouldDelay && messageProcessed.parts.length > 1;
    
    console.log(`[MESSAGE-SPLIT] Análisis de mensaje:`);
    console.log(`   - Longitud original: ${finalReply.length} caracteres`);
    console.log(`   - Debe dividirse: ${messageProcessed.shouldDelay ? 'SÍ' : 'NO'}`);
    console.log(`   - Partes detectadas: ${messageProcessed.parts.length}`);
    console.log(`   - Delay entre partes: ${messageProcessed.delayMs}ms`);
    
    // � SIEMPRE responder con TEXTO (TTS deshabilitado - causaba fallos)
    const sendMessageToUser = async (messageText) => {
      return await enviarWhatsApp(userId, messageText);
    };

    if (shouldSplit) {
      // Enviar múltiples mensajes con delay
      console.log(`[MESSAGE-SPLIT] 📨 Dividiendo mensaje en ${messageProcessed.parts.length} partes`);
      
      for (let i = 0; i < messageProcessed.parts.length; i++) {
        const part = cleanPromptMarkers(messageProcessed.parts[i]);
        
        console.log(`[MESSAGE-SPLIT] Enviando parte ${i + 1}/${messageProcessed.parts.length} (${part.length} chars)`);
        console.log(`[MESSAGE-SPLIT] Preview: ${part.substring(0, 100)}...`);
        
        // 🚨 FIX: Esperar ANTES de enviar (excepto primer mensaje)
        // Esto garantiza que Wassenger/WhatsApp procese los mensajes en orden
        if (i > 0) {
          console.log(`[MESSAGE-SPLIT] ⏳ Esperando ${messageProcessed.delayMs}ms antes de enviar parte ${i + 1}...`);
          await new Promise(resolve => setTimeout(resolve, messageProcessed.delayMs));
        }
        
        // Enviar mensaje (texto o audio según contexto)
        await sendMessageToUser(part);
        
        // Guardar cada parte en historial
        await saveConversationMessage(userId, {
          role: 'assistant',
          content: part,
          agent: resultado.agenteKey,
          metadata: { partNumber: i + 1, totalParts: messageProcessed.parts.length, sentAsAudio: userSentAudio }
        });
      }
      
      console.log(`[MESSAGE-SPLIT] ✅ Enviados ${messageProcessed.parts.length} mensajes exitosamente`);
    } else {
      // Enviar mensaje único (comportamiento original)
      const cleanedMessage = cleanPromptMarkers(finalReply);
      console.log(`[MESSAGE-SPLIT] Enviando mensaje único (${cleanedMessage.length} chars)`);
      await sendMessageToUser(cleanedMessage);
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
      } catch (error) {
        console.error('[WASSENGER] ❌ Error en debounce handler:', {
          userId,
          message: error.message,
          stack: error.stack
        });

        try {
          await enviarWhatsApp(
            userId,
            'Disculpa, tuve un problema técnico procesando tu mensaje. ¿Puedes reenviarlo en unos segundos? 🙏'
          );
        } catch (sendError) {
          console.error('[WASSENGER] ❌ Error enviando fallback tras fallo en debounce:', {
            userId,
            message: sendError.message
          });
        }
      }
    }); // Cierre del debounceUserWebhook
    } catch (error) {
      console.error('[WASSENGER] ❌ Error crítico en procesamiento:', error);
      try {
        if (userId) {
          await enviarWhatsApp(
            userId,
            'Disculpa, tuve un problema técnico procesando tu mensaje. ¿Puedes intentarlo de nuevo? 🙏'
          );
        }
      } catch (sendError) {
        console.error('[WASSENGER] ❌ Error enviando fallback en catch global:', sendError);
      }
    }
  }); // Cierre del setImmediate
}); // Cierre del router.post

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
