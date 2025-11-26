// src/express-servidor/endpoints-api/wassenger.js
import { Router } from 'express';
import { procesarMensaje } from '../../deteccion-intenciones/orquestador.js';
import { complete } from '../../servicios-ia/openai.js';
import { processPaymentReceipt, isReceiptImage, generatePaymentRequest } from '../../servicios/payment-receipts.js';
import { processConfirmationResponse, hasPendingConfirmation, isPositiveResponse, isNegativeResponse } from '../../servicios/confirmation-flow.js';
import { enhanceAuroraResponse } from '../../servicios/aurora-confirmation-helper.js';
import { detectCampaignMessage, personalizeCampaignResponse, getTrialUsedResponse, shouldSendPaymentLink } from '../../servicios/campaign-prompts.js';
import { validateWebhookSignature, rateLimitByPhone } from '../middleware/webhook-security.js';
import { processMessageWithForm, clearForm as clearPartialForm } from '../../servicios/partial-reservation-form.js';
import { buildReplyContext, getReplyContextMetadata } from '../../servicios/reply-context-handler.js';
import { 
  loadProfile, 
  saveProfile, 
  saveInteraction, 
  loadConversationHistory, 
  saveConversationMessage,
  savePartialForm
} from '../../perfiles-interacciones/memoria-sqlite.js';
import { getPaymentInfo, calculateReservationCost } from '../../servicios/payment-calculator.js';
import { dispatchHttpRequest } from '../../servicios/external-dispatcher.js';
import { clearJustConfirmed, clearPendingConfirmation } from '../../servicios/reservation-state.js';

const router = Router();

/**
 * 🧹 Limpia nombres de WhatsApp Business para extraer nombre real
 */
function cleanWhatsAppName(whatsappName) {
  if (!whatsappName || typeof whatsappName !== 'string') return null;
  
  let cleaned = whatsappName.trim();
  
  // Remover emojis comunes
  cleaned = cleaned.replace(/[🏠🏢💼🔥⭐🎯💪👑🚀💯😊😎🤝🌟❤️🎉💻📱🏆]/g, '');
  
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
    /(?:soy|me llamo|mi nombre es|soy de)\\s+([A-Za-záéíóúüñÁÉÍÓÚÜÑ]+)/i,
    /(?:hola|buenos días|buenas tardes|buenas noches),?\\s*(?:soy)?\\s+([A-Za-záéíóúüñÁÉÍÓÚÜÑ]+)/i
  ];
  
  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match && match[1].length > 1) {
      return match[1].charAt(0).toUpperCase() + match[1].slice(1).toLowerCase();
    }
  }
  
  return null;
}

/**
 * 🛡️ Detecta si un mensaje proviene de un bot
 * Retorna { detected: boolean, reason: string }
 */
function detectarBot(data, text, name) {
  // 🚨 FILTROS TEMPORALMENTE DESHABILITADOS PARA TESTING
  // TODO: Reactivar filtros una vez confirmado que Aurora responde
  
  // 1. ÚNICO FILTRO ACTIVO: Detectar por campo isBot explícito
  if (data.isBot === true || data.type === 'bot' || data.fromBot === true) {
    return { detected: true, reason: 'campo_isBot_true' };
  }

  // 2. ÚNICO FILTRO ACTIVO: Detectar grupos
  const userId = data.fromNumber || data.from || '';
  if (userId.includes('@g.us') || userId.includes('@broadcast')) {
    return { detected: true, reason: 'mensaje_de_grupo_o_broadcast' };
  }

  // ⚠️ FILTROS COMENTADOS TEMPORALMENTE:
  
  // 3. Detectar números sospechosos de bots (números muy largos o con patrones)
  /*
  const numeros = userId.replace(/\D/g, '');
  if (numeros.length > 15 || numeros.startsWith('000000')) {
    return { detected: true, reason: 'numero_invalido_o_sospechoso' };
  }
  */

  // 4. Detectar nombres típicos de bots
  /*
  const nombreLower = (name || '').toLowerCase();
  const botKeywords = ['bot', 'automated', 'auto-reply', 'no-reply', 'noreply', 'system', 'whatsapp business'];
  if (botKeywords.some(keyword => nombreLower.includes(keyword))) {
    return { detected: true, reason: 'nombre_contiene_keyword_bot' };
  }
  */

  // 5. Detectar mensajes con estructura típica de bot (muy cortos o solo comandos)
  /*
  const textLower = text.toLowerCase().trim();
  if (textLower.startsWith('/') || textLower.startsWith('!') || textLower.startsWith('.')) {
    // Comandos de bots, pero permitimos si parece humano
    if (text.length < 5) {
      return { detected: true, reason: 'comando_bot_detectado' };
    }
  }
  */

  // 6. Detectar mensajes con URLs acortadas repetitivas (spam bots)
  /*
  const urlPattern = /(bit\.ly|tinyurl|goo\.gl|t\.co|ow\.ly)/gi;
  const urlMatches = text.match(urlPattern);
  if (urlMatches && urlMatches.length > 2) {
    return { detected: true, reason: 'multiples_urls_acortadas_spam' };
  }
  */

  // No es bot
  return { detected: false, reason: null };
}

/**
 * Envía mensaje a WhatsApp vía Wassenger API
 */
async function enviarWhatsApp(numero, mensaje) {
  const WASSENGER_TOKEN = process.env.WASSENGER_TOKEN;
  const WASSENGER_DEVICE = process.env.WASSENGER_DEVICE || process.env.WASSENGER_DEVICE_ID;
  const BOT_NUMBER = process.env.WHATSAPP_BOT_NUMBER || process.env.WASSENGER_DEVICE_ID || process.env.WASSENGER_DEVICE;

  if (!WASSENGER_TOKEN || !WASSENGER_DEVICE) {
    console.warn('[WASSENGER] Token o Device no configurado');
    return { ok: false, error: 'NO_WASSENGER_CONFIG' };
  }

  // 🛡️ SEGURIDAD: Nunca enviar mensaje al propio bot
  if (BOT_NUMBER && numero.includes(BOT_NUMBER.replace(/\D/g, ''))) {
    console.warn('[WASSENGER] Intento de enviar mensaje al propio bot bloqueado');
    return { ok: false, error: 'SELF_MESSAGE_BLOCKED' };
  }

  try {
    const response = await dispatchHttpRequest({
      url: 'https://api.wassenger.com/v1/messages',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Token': WASSENGER_TOKEN
      },
      body: JSON.stringify({
        phone: numero,
        message: mensaje,
        device: WASSENGER_DEVICE
      }),
      circuitId: 'wassenger:messages',
      timeoutMs: 5000,
      maxRetries: 2
    });

    const data = await response.json().catch(() => ({}));
    return { ok: response.ok, data };
  } catch (error) {
    console.error('[WASSENGER] Error enviando mensaje:', error);
    return { ok: false, error: error.message };
  }
}

/**
 * Wassenger Webhook (POST)
 * Configura esta URL en Wassenger como Webhook de mensajes entrantes.
 * Body esperado:
 * {
 *   "event": "message:in:text" | "message:in",
 *   "data": {
 *      "fromNumber": "593987654321",
 *      "body": "texto del mensaje",
 *      "fromName": "Nombre Contacto"
 *   }
 * }
 */
router.post('/webhooks/wassenger', validateWebhookSignature, rateLimitByPhone, async (req, res) => {
  try {
    // 🚫 CONTROL: Desactivación temporal de Wassenger vía variable de entorno
    const wassengerEnabled = process.env.WASSENGER_ENABLED !== 'false';
    
    if (!wassengerEnabled) {
      console.log('[WASSENGER] ⏸️ DESACTIVADO TEMPORALMENTE - Webhook ignorado');
      return res.json({ 
        ok: true, 
        ignored: true, 
        reason: 'wassenger_disabled',
        message: 'Wassenger está temporalmente desactivado'
      });
    }

    const body = req.body || {};
    const evt = body.event || '';
    const data = body.data || {};
    const isProd = process.env.NODE_ENV === 'production';

    if (isProd) {
      console.log('[WASSENGER] Webhook recibido', {
        event: evt,
        from: data.fromNumber || data.from || 'unknown'
      });
    } else {
      console.log('[WASSENGER] Webhook recibido:', JSON.stringify(body, null, 2));
    }

    if (!evt || !data) {
      return res.status(400).json({ ok: false, error: 'INVALID_PAYLOAD' });
    }

    // 🛡️ FILTRO 1: Ignorar mensajes salientes o eventos no relevantes
    if (!evt.includes('message:in') || evt.includes('message:out')) {
      return res.json({ ok: true, ignored: true, reason: 'not_incoming_message' });
    }

    // Extraer datos (compatibilidad con diferentes formatos de Wassenger)
    const userId = (data.fromNumber || data.from || '').trim();
    let text = (data.body || data.message || '').trim();
    // 🔧 FIX: Extraer nombre desde la estructura correcta de Wassenger
    const name = data.chat?.name || data.contact?.name || data.fromName || data.name || '';
    const messageType = data.type || 'text';
    const mediaUrl = data.mediaUrl || data.media?.url || null;

    if (!userId) {
      return res.status(200).json({ ok: true, ignored: true, reason: 'no_user_id' });
    }

    // 📸 PROCESAMIENTO DE IMÁGENES/DOCUMENTOS
    if (messageType === 'image' || messageType === 'document' || messageType === 'pdf') {
      console.log('[WASSENGER] 📸 Procesando imagen/documento...');
      console.log('[WASSENGER] 📸 DEBUG - Type:', messageType, 'MediaURL:', mediaUrl ? 'PRESENTE' : 'AUSENTE');
      
      const messageData = { type: messageType, media: { url: mediaUrl } };
      
      // Cargar perfil para saber el agente activo
      const userProfile = await loadProfile(userId);
      const activeAgent = userProfile?.activeAgent || 'AURORA';
      
      // 🎯 SI ES ENZO/ADRIANA/ALUNA: Análisis de documento con Vision AI
      if (['ENZO', 'ADRIANA', 'ALUNA'].includes(activeAgent) && mediaUrl) {
        console.log(`[WASSENGER] 🧠 ${activeAgent} analizando documento/imagen...`);
        
        const { analyzeImage } = await import('../../servicios-ia/openai.js');
        const { AGENTES } = await import('../../deteccion-intenciones/orquestador.js');
        const agente = AGENTES[activeAgent];
        
        try {
          // Prompt según el tipo de archivo y agente
          const fileType = messageType === 'document' ? 'documento/PDF' : 'imagen';
          const analysisPrompt = `Analiza este ${fileType} que el Sensei acaba de enviar. 
          
Contexto: Eres ${agente.nombre}, ${agente.rol}.
Tarea: Identifica insights clave, datos importantes, oportunidades o problemas según tu expertise.

Responde en tu estilo característico con:
- Análisis rápido de lo que viste
- Insights accionables
- Recomendaciones específicas
- Usa emojis estratégicos`;

          const analysisResult = await analyzeImage(mediaUrl, analysisPrompt, {
            max_tokens: 800,
            temperature: 0.7
          });
          
          if (analysisResult.success) {
            const reply = analysisResult.content;
            
            // Enviar respuesta
            await enviarWhatsApp(userId, reply);
            
            // Guardar interacción
            await saveInteraction({
              userId,
              agent: activeAgent.toLowerCase(),
              agentName: agente.nombre,
              intentReason: 'document_analysis',
              input: `[${fileType.toUpperCase()}]`,
              output: reply,
              meta: {
                route: '/webhooks/wassenger',
                via: 'whatsapp',
                mediaUrl,
                fileType: messageType
              }
            });
            
            return res.json({ 
              ok: true, 
              processed: true, 
              type: 'document_analysis',
              agent: activeAgent
            });
          }
        } catch (error) {
          console.error('[WASSENGER] ❌ Error analizando documento:', error);
          await enviarWhatsApp(userId, 'Gomen Sensei 🙏 Tuve un problema analizando tu archivo. ¿Puedes intentar de nuevo?');
          return res.json({ ok: true, processed: true, type: 'analysis_error' });
        }
      }
      
      // 💳 SI ES AURORA: Verificar si es comprobante de pago
      if (activeAgent === 'AURORA' && isReceiptImage(messageData)) {
        console.log('[WASSENGER] 💳 Imagen detectada como posible comprobante de pago');
        
        if (!userProfile) {
          await enviarWhatsApp(userId, '❌ No encontré tu perfil. ¿Puedes intentar hacer una reserva primero?');
          return res.json({ ok: true, processed: true, type: 'profile_error' });
        }
        
        // Procesar comprobante de pago
        const paymentResult = await processPaymentReceipt(messageData, userProfile);
        
        // Enviar respuesta
        await enviarWhatsApp(userId, paymentResult.message);
        
        // Guardar interacción
        await saveInteraction({
          userId,
          agent: 'aurora',
          agentName: 'Aurora',
          intentReason: 'payment_verification',
          input: `[IMAGEN: Comprobante de pago]`,
          output: paymentResult.message,
          meta: {
            route: '/webhooks/wassenger',
            via: 'whatsapp',
            mediaUrl,
            paymentVerified: paymentResult.success,
            paymentData: paymentResult.data
          }
        });
        
        return res.json({ 
          ok: true, 
          processed: true, 
          type: 'payment_verification',
          success: paymentResult.success 
        });
      } else {
        // Imagen/documento enviado a Aurora pero no es comprobante
        await enviarWhatsApp(userId, 
          '📷 He recibido tu archivo. Si es un comprobante de pago, procesalo. ' +
          'Si necesitas ayuda técnica, habla con @Enzo. ' +
          'Si necesitas ayuda con seguros, habla con @Adriana.'
        );
        
        return res.json({ 
          ok: true, 
          processed: true, 
          type: 'image_received' 
        });
      }
    }

    // 🎤 PROCESAMIENTO DE MENSAJES DE VOZ
    if (messageType === 'audio' || messageType === 'voice' || messageType === 'ptt') {
      console.log('[WASSENGER] 🎤 Procesando mensaje de voz...');
      
      if (!mediaUrl) {
        console.log('[WASSENGER] ❌ No se encontró URL de audio');
        return res.json({ ok: true, ignored: true, reason: 'no_audio_url' });
      }

      // Importar función de transcripción
      const { transcribeAudio } = await import('../../servicios-ia/openai.js');
      
      // Transcribir audio
      const transcription = await transcribeAudio(mediaUrl);
      
      if (!transcription.success) {
        await enviarWhatsApp(userId, 
          '🎤 Lo siento, no pude procesar tu mensaje de voz. ¿Podrías escribirlo por texto? 😊'
        );
        return res.json({ 
          ok: true, 
          processed: true, 
          type: 'audio_transcription_failed' 
        });
      }

      console.log('[WASSENGER] ✅ Audio transcrito:', transcription.text);
      
      // Actualizar el texto con la transcripción
      text = transcription.text;
      
      // Notificar al usuario que se procesó el audio
      console.log('[WASSENGER] 🎤→📝 Procesando como texto:', text);
    }

    // Continuar con procesamiento normal de texto
    if (!text) {
      return res.status(200).json({ ok: true, ignored: true, reason: 'no_text_content' });
    }

    // 🛡️ FILTRO 2: Evitar procesar el propio número del bot
    const BOT_NUMBER = process.env.WHATSAPP_BOT_NUMBER || process.env.WASSENGER_DEVICE_ID || process.env.WASSENGER_DEVICE;
    if (BOT_NUMBER && userId.includes(BOT_NUMBER.replace(/\D/g, ''))) {
      console.log('[WASSENGER] Mensaje ignorado: es del propio bot');
      return res.json({ ok: true, ignored: true, reason: 'self-message' });
    }

    // 🛡️ FILTRO 3: Detectar si el mensaje viene del bot (campo fromMe)
    if (data.fromMe === true || data.fromMe === 'true') {
      console.log('[WASSENGER] Mensaje ignorado: fromMe=true');
      return res.json({ ok: true, ignored: true, reason: 'message_from_bot' });
    }

    // 🛡️ FILTRO 4: Ignorar mensajes muy antiguos (más de 1 hora)
    const messageTimestamp = data.timestamp || Date.now() / 1000;
    const now = Date.now() / 1000;
    if (now - messageTimestamp > 3600) { // 1 hora
      console.log('[WASSENGER] Mensaje ignorado: muy antiguo (>1h)');
      return res.json({ ok: true, ignored: true, reason: 'old_message' });
    }

    // 🛡️ FILTRO 5: Detectar y bloquear BOTS
    const isBot = detectarBot(data, text, name);
    if (isBot.detected) {
      console.log(`[WASSENGER] BOT DETECTADO y bloqueado: ${isBot.reason}`);
      return res.json({ ok: true, ignored: true, reason: 'bot_detected', details: isBot.reason });
    }

    // 🔍 DEBUG: Log del mensaje que va a procesar Aurora
    if (!isProd) {
      console.log('[WASSENGER] ✅ PROCESANDO MENSAJE VÁLIDO:');
      console.log(`- Usuario: ${userId}`);
      console.log(`- Nombre: ${name}`);
      console.log(`- Texto: "${text}"`);
      console.log(`- Tipo: ${messageType}`);
      console.log('- Datos completos:', JSON.stringify(data, null, 2));
    }

    // Perfil/memoria
    console.log('[DEBUG-FLOW] 1️⃣ Iniciando loadProfile para:', userId);
    const current = await loadProfile(userId) || {};
    console.log('[DEBUG-FLOW] 2️⃣ loadProfile completado, firstVisit:', current?.firstVisit);
    const firstVisit = current?.firstVisit === undefined ? true : current.firstVisit;
    
    // 🆕 Cargar historial de conversación (últimos 10 mensajes)
    console.log('[DEBUG-FLOW] 3️⃣ Iniciando loadConversationHistory...');
    const conversationHistory = await loadConversationHistory(userId, 10);
    console.log('[DEBUG-FLOW] 4️⃣ loadConversationHistory completado, mensajes:', conversationHistory?.length || 0);
    
    // 🆕 DETECCIÓN INTELIGENTE DEL NOMBRE
    let detectedName = current.name || null;
    
    // Si no tenemos nombre guardado, intentar extraerlo
    if (!detectedName && name) {
      detectedName = cleanWhatsAppName(name);
      if (!isProd) {
        console.log(`[WASSENGER] Nombre detectado de WhatsApp: "${name}" → limpio: "${detectedName}"`);
      }
    }
    
    // También intentar detectar nombre del mensaje si es primera vez
    if (!detectedName && firstVisit && text) {
      const nameFromMessage = extractNameFromMessage(text);
      if (nameFromMessage) {
        detectedName = nameFromMessage;
        if (!isProd) {
          console.log(`[WASSENGER] Nombre detectado del mensaje: "${nameFromMessage}"`);
        }
      }
    }
    
    // 🆕 DETECCIÓN AUTOMÁTICA DE EMAIL
    let detectedEmail = current.email || null;
    const emailRegex = /[^\s@]+@[^\s@]+\.[^\s@]+/;
    const emailMatch = text.match(emailRegex);
    if (emailMatch && !detectedEmail) {
      detectedEmail = emailMatch[0].toLowerCase();
      if (!isProd) {
        console.log(`[WASSENGER] 📧 Email detectado automáticamente: "${detectedEmail}"`);
      }
    }
    
    const profile = {
      ...current,
      userId,
      name: detectedName,
      email: detectedEmail, // 🆕 Guardar email detectado automáticamente
      whatsappDisplayName: name || null, // Guardar nombre original de WhatsApp
      channel: 'whatsapp',
      lastMessageAt: new Date().toISOString(),
      conversationCount: (current.conversationCount || 0) + 1
      // ⚠️ CRÍTICO: NO sobrescribir firstVisit, freeTrialUsed, freeTrialDate
      // Esos campos solo se actualizan en confirmation-flow.js
      // Si los pasamos aquí, se sobrescriben en cada mensaje
    };
    
    // Guardar perfil actualizado
    console.log('[DEBUG-FLOW] 5️⃣ Iniciando saveProfile...');
    await saveProfile(userId, profile);
    console.log('[DEBUG-FLOW] 6️⃣ saveProfile completado');

    // 🔍 DEBUG: Log del perfil completo
    console.log('[DEBUG-PERFIL] 📊 Perfil cargado:', {
      userId: profile.userId,
      name: profile.name,
      email: profile.email,
      firstVisit: profile.firstVisit,
      freeTrialUsed: profile.freeTrialUsed,
      conversationCount: profile.conversationCount,
      hasPendingConfirmation: !!profile.pendingConfirmation,
      pendingConfirmationData: profile.pendingConfirmation ? {
        date: profile.pendingConfirmation.date,
        startTime: profile.pendingConfirmation.startTime,
        serviceType: profile.pendingConfirmation.serviceType,
        email: profile.pendingConfirmation.email ? 'Sí' : 'No'
      } : 'No hay'
    });

    // 🧹 Limpiar flag temporal "justConfirmed" si han pasado más de 10 minutos
    if (profile.justConfirmed && profile.justConfirmedUntil) {
      const expiresAt = new Date(profile.justConfirmedUntil).getTime();
      const now = Date.now();
      if (now > expiresAt) {
        console.log('[WASSENGER] 🧹 Fin de periodo justConfirmed, limpiando en DB');
        await clearJustConfirmed(userId);
        profile.justConfirmed = false;
      }
    }

    // 🚦 VALIDAR AGENTE ACTIVO - Solo responde el agente que está activo
    const activeAgent = profile.activeAgent || 'AURORA';
    const isAgentMention = /@(aurora|enzo|adriana|aluna)/i.test(text);
    
    // NUEVA LÓGICA: Si el usuario NO menciona un agente específico, el mensaje va al agente activo
    // Solo validamos si detectamos mención explícita de cambio de agente
    // Esto permite que después de un handoff, todos los mensajes vayan al nuevo agente
    console.log(`[WASSENGER] 🎯 Agente activo: ${activeAgent}, Mención detectada: ${isAgentMention}`);

    // 🔄 DETECTAR CONTEXTO DE REPLY (mensajes citados)
    console.log('[DEBUG-FLOW] 7️⃣ Analizando contexto de reply...');
    const replyContext = buildReplyContext(text, body, conversationHistory);
    
    if (replyContext.hasReplyContext) {
      console.log('[REPLY-CONTEXT] ✅ Contexto de reply detectado:', {
        type: replyContext.contextType,
        source: replyContext.source,
        confidence: replyContext.confidence,
        quotedPreview: replyContext.quotedMessage?.substring(0, 50) + '...'
      });
    }
    
    // Si detectamos contexto de reply, usar el mensaje enriquecido
    let processedText = replyContext.hasReplyContext ? replyContext.enrichedMessage : text;
    
    // 🆕 Guardar mensaje del usuario en historial
    console.log('[DEBUG-FLOW] 8️⃣ Iniciando saveConversationMessage...');
    await saveConversationMessage(userId, {
      role: 'user',
      content: processedText
    });
    console.log('[DEBUG-FLOW] 8️⃣ saveConversationMessage completado');

    // 🧠 FORMULARIO PARCIAL INTELIGENTE - Detectar y extraer datos progresivamente (PRIMERO)
    console.log('[WASSENGER] 🧠 Procesando mensaje con formulario inteligente...');
    // Usar processedText (con contexto de reply si existe) en lugar de text original
    const formResult = await processMessageWithForm(userId, processedText, profile, profile.freeTrialUsed);
    
    // Pasar el mensaje del usuario al formResult para detección de frustración
    formResult.userMessage = text;
    
    // 🚨 VALIDACIÓN CRÍTICA: Si hay error de validación (domingo/feriado), responder inmediatamente
    if (formResult.validationError) {
      console.log('[WASSENGER] 🚫 Error de validación detectado:', formResult.validationError.type);
      
      const errorMessage = formResult.validationError.message;
      
      // Enviar mensaje de error al usuario
      await enviarWhatsApp(userId, errorMessage);
      
      // Guardar interacción
      await saveInteraction({
        userId,
        agent: 'aurora',
        agentName: 'Aurora',
        intentReason: 'validation_error',
        input: text,
        output: errorMessage,
        meta: {
          route: '/webhooks/wassenger',
          via: 'whatsapp',
          errorType: formResult.validationError.type,
          suggestedDate: formResult.validationError.suggestedDate
        }
      });
      
      // Guardar en historial
      await saveConversationMessage(userId, {
        role: 'assistant',
        content: errorMessage,
        agent: 'Aurora'
      });
      
      // Limpiar el formulario para que pueda intentar otra fecha
      await clearPartialForm(userId);
      
      console.log('[WASSENGER] ✅ Error de validación enviado - formulario limpiado');
      
      return res.json({ 
        ok: true, 
        processed: true,
        type: 'validation_error',
        errorType: formResult.validationError.type
      });
    }
    
    if (formResult.updates && Object.keys(formResult.updates).length > 0) {
      console.log('[WASSENGER] ✨ Datos detectados automáticamente:', formResult.updates);
      
      // Actualizar perfil con datos detectados
      if (formResult.updates.email && !profile.email) {
        profile.email = formResult.updates.email;
        await saveProfile(userId, profile);
      }
    }

    // 🚫 BLOQUEO: Si hay reservas con pago pendiente, no permitir nuevas reservas
    const reservationKeywords = ['reserva', 'reservar', 'hot desk', 'sala', 'espacio'];
    const isReservationIntent = reservationKeywords.some(kw => text.toLowerCase().includes(kw));
    
    if (isReservationIntent) {
      console.log('[WASSENGER] 🔍 Detectado intent de reserva - verificando pagos pendientes...');
      
      const { default: reservationRepository } = await import('../../database/reservationRepository.js');
      const allUserReservations = await reservationRepository.findByUser(userId);
      const pendingPayments = allUserReservations.filter(r => 
        r.status === 'pending_payment' && r.payment_status === 'pending'
      );
      
      if (pendingPayments.length > 0) {
        console.log(`[WASSENGER] 🚫 Usuario tiene ${pendingPayments.length} reserva(s) sin pagar`);
        
        const pendingList = pendingPayments.map((r, idx) => {
          const date = new Date(r.date).toLocaleDateString('es-EC', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          });
          return `${idx + 1}. ${date} | ${r.start_time}-${r.end_time} | $${r.total_price}`;
        }).join('\n');
        
        const blockMessage = `⚠️ *Tienes ${pendingPayments.length} reserva(s) pendiente(s) de pago:*

${pendingList}

Por favor, completa el pago de tu(s) reserva(s) anterior(es) antes de agendar una nueva. 🙏

¿Cómo prefieres pagar?
💳 *Tarjeta* (Payphone - online)
🏦 *Transferencia* bancaria`;

        await enviarWhatsApp(userId, blockMessage);
        
        await saveInteraction({
          userId,
          agent: 'aurora',
          agentName: 'Aurora',
          intentReason: 'blocked_pending_payments',
          input: text,
          output: blockMessage,
          meta: {
            route: '/webhooks/wassenger',
            via: 'whatsapp',
            pendingCount: pendingPayments.length,
            pendingIds: pendingPayments.map(r => r.id)
          }
        });
        
        await saveConversationMessage(userId, {
          role: 'assistant',
          content: blockMessage,
          agent: 'Aurora'
        });
        
        return res.json({ 
          ok: true, 
          processed: true,
          type: 'blocked_pending_payments',
          pendingCount: pendingPayments.length
        });
      }
    }
    
    // 🔄 RETOMANDO RESERVA - Solo si existe partial_form guardado (de cancelación previa)
    // Verificar si hay un partial_form guardado en DB (solo se guarda cuando hay cancelación)
    const { getPartialForm } = await import('../../perfiles-interacciones/memoria-sqlite.js');
    const savedPartialForm = await getPartialForm(userId);
    
    if (isReservationIntent && savedPartialForm && formResult.form.getResumeMessage) {
      const resumeMessage = formResult.form.getResumeMessage();
      if (resumeMessage) {
        console.log('[WASSENGER] 📋 Usuario retoma reserva cancelada anteriormente - enviando resumen');
        formResult.resumeMessage = resumeMessage;
      }
    }

    // 🔄 SISTEMA DE CONFIRMACIONES SI/NO (DESPUÉS de actualizar formulario)
    // Solo procesar SI/NO si hay confirmación pendiente Y la respuesta es explícitamente SI/NO
    if (hasPendingConfirmation(profile)) {
      const isPositive = isPositiveResponse(text);
      const isNegative = isNegativeResponse(text);
      
      if (isPositive || isNegative) {
        console.log('[WASSENGER] Usuario tiene confirmación pendiente Y respuesta es SI/NO');
        
        // Detectar si hay contexto adicional después del SI (ej: "Si, pero quiero hacer otra reserva")
        const hasAdditionalContext = text.match(/^s[ií][,.\s]+(.+)/i);
        const additionalText = hasAdditionalContext ? hasAdditionalContext[1].trim() : null;
        
        const confirmationResult = await processConfirmationResponse(text, profile);
      
        // Enviar respuesta de confirmación
        await enviarWhatsApp(userId, confirmationResult.message);
        
        // Guardar interacción de confirmación
        await saveInteraction({
          userId,
          agent: 'aurora',
          agentName: 'Aurora',
          intentReason: 'confirmation_response',
          input: text,
          output: confirmationResult.message,
          meta: {
            route: '/webhooks/wassenger',
            via: 'whatsapp',
            confirmationSuccess: confirmationResult.success,
            actionType: confirmationResult.actionType,
            needsAction: confirmationResult.needsAction,
            hasAdditionalContext: !!additionalText
          }
        });

        // Guardar respuesta en historial
        await saveConversationMessage(userId, {
          role: 'assistant',
          content: confirmationResult.message,
          agent: 'Aurora'
        });
        
        // Si confirmó exitosamente Y tiene contexto adicional, continuar procesando con Aurora
        if (confirmationResult.success && additionalText) {
          console.log(`[WASSENGER] ✅ Confirmación exitosa + contexto adicional detectado: "${additionalText}"`);
          console.log('[WASSENGER] 🔄 Continuando con Aurora para procesar: ', additionalText);
          
          // Pequeño delay para que vea el mensaje de confirmación primero
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // Recargar perfil actualizado post-confirmación
          profile = await loadProfile(userId, data.data.fromNumber.name || data.data.senderName);
          conversationHistory = await loadConversationHistory(userId);
          
          // Procesar el contexto adicional con Aurora (caerá al flujo normal más abajo)
          processedText = additionalText;
          // NO hacer return aquí - continuar al flujo de Aurora
        } else {
          // Confirmación normal sin contexto adicional o negativa - terminar
          return res.json({ 
            ok: true, 
            processed: true,
            type: 'confirmation_response',
            success: confirmationResult.success,
            needsAction: confirmationResult.needsAction
          });
        }
      }
    }

    // Si el formulario NO está completo, continuar con Aurora para que pida datos faltantes
    console.log('[WASSENGER] Formulario incompleto o respuesta no es SI/NO, continuando con Aurora...');
    
    // 💡 LÓGICA DE UPSELL: Si mencionó personas y pidió hot desk, sugerir sala
    let upsellMessage = null;
    if (formResult.form.spaceType === 'hotDesk' && formResult.form.numPeople >= 3) {
      console.log('[WASSENGER] 💡 Upsell detectado: 3+ personas con hot desk');
      upsellMessage = `
¡Nota! Veo que vienen ${formResult.form.numPeople} personas 👥

Para grupos, te recomiendo nuestra **Sala de Reuniones** ($29/2h para 3-4 personas):
✅ Espacio privado
✅ Más cómodo para trabajar en equipo
✅ Incluye pizarra y pantalla

¿Prefieres cambiar a la sala o mantenemos el hot desk? 🤔
`.trim();
    }

    // 🚀 VERIFICAR CAMPAÑAS PUBLICITARIAS (SOLO PRIMERA VISITA Y NO ACABA DE CANCELAR)
    const campaignCheck = detectCampaignMessage(text);
    let reply;
    let resultado = null;
    
    // SIEMPRE procesar con orquestador primero (necesario para handoffs y validaciones)
    {
      // 🔍 DEBUG: Verificar perfil antes de enviar al orquestador
      console.log(`[WASSENGER] 🔍 DEBUGGING NOMBRE - Perfil antes del orquestador:`, {
        userId: profile.userId,
        name: profile.name,
        whatsappDisplayName: profile.whatsappDisplayName,
        firstVisit: profile.firstVisit
      });
      
      // Procesar mensaje con orquestador (ahora con historial + formulario + contexto de reply)
      resultado = procesarMensaje(processedText, profile, conversationHistory, formResult);
      
      // 🚫 MANEJAR CANCELACIÓN
      if (resultado.metadata.cancelacion) {
        console.log('[WASSENGER] 🚫 Cancelación detectada');
        
        // Guardar formulario parcial si existe
        if (resultado.metadata.shouldSavePartialForm) {
          await savePartialForm(userId, formResult, 'reservation');
          console.log('[WASSENGER] 💾 Formulario parcial guardado');
        }
        
        // Limpiar estados activos
        await clearPendingConfirmation(userId);
        await clearJustConfirmed(userId);
        console.log('[WASSENGER] 🧹 Estados de reserva limpiados');
      }

      // 🤝 MANEJAR HANDOFF - Cambio de agente
      if (resultado.metadata.agentHandoff) {
        const targetAgent = resultado.metadata.targetAgent;
        console.log('[WASSENGER] 🤝 Handoff detectado hacia:', targetAgent);
        
        try {
          // 1. Generar mensaje de transición desde agente actual
          const handoffMessage = await complete(resultado.prompt, {
            temperature: 0.4,
            max_tokens: 200,
            system: resultado.systemPrompt
          });

          console.log('[WASSENGER] 📤 Enviando mensaje de transición...');
          
          // 2. Enviar mensaje de transición
          const handoffResult = await enviarWhatsApp(userId, handoffMessage);
          if (!handoffResult.ok) {
            throw new Error(`Error enviando mensaje de transición: ${handoffResult.error}`);
          }

          // 3. Guardar mensaje de transición en historial
          await saveConversationMessage(userId, {
            role: 'assistant',
            content: handoffMessage,
            agent: resultado.agente
          });

          console.log('[WASSENGER] ⏳ Esperando 10 segundos antes de que entre el nuevo agente...');
          await new Promise(resolve => setTimeout(resolve, 10000));

          // 4. Obtener configuración del nuevo agente
          const { AGENTES } = await import('../../deteccion-intenciones/orquestador.js');
          const nuevoAgente = AGENTES[targetAgent];
          
          if (!nuevoAgente) {
            throw new Error(`Agente ${targetAgent} no encontrado en configuración`);
          }

          // 5. Actualizar agente activo en perfil (ANTES de enviar mensaje de entrada)
          await saveProfile(userId, {
            activeAgent: targetAgent
          });
          
          console.log('[WASSENGER] 👤 Agente activo actualizado a:', targetAgent);

          // 6. Enviar mensaje de entrada del nuevo agente
          const mensajeEntrada = nuevoAgente.mensajes?.entrada || `Hola, soy ${nuevoAgente.nombre}. ¿En qué puedo ayudarte?`;
          
          console.log('[WASSENGER] 📤 Enviando mensaje de entrada del nuevo agente...');
          const entradaResult = await enviarWhatsApp(userId, mensajeEntrada);
          
          if (!entradaResult.ok) {
            throw new Error(`Error enviando mensaje de entrada: ${entradaResult.error}`);
          }

          // 7. Guardar mensaje de entrada en historial
          await saveConversationMessage(userId, {
            role: 'assistant',
            content: mensajeEntrada,
            agent: nuevoAgente.nombre
          });

          console.log('[WASSENGER] ✅ Handoff completado exitosamente');
          
          // Guardar interacción del handoff
          await saveInteraction({
            userId,
            agent: targetAgent.toLowerCase(),
            agentName: nuevoAgente.nombre,
            intentReason: 'agent_handoff',
            input: text,
            output: `Handoff desde ${resultado.agente} a ${nuevoAgente.nombre}`,
            meta: {
              route: '/webhooks/wassenger',
              via: 'whatsapp',
              handoff: true,
              fromAgent: resultado.agente,
              toAgent: targetAgent
            }
          });

          return res.json({ success: true, handoff: true, targetAgent });
          
        } catch (handoffError) {
          console.error('[WASSENGER] ❌ Error durante handoff:', handoffError);
          
          // Enviar mensaje de error al usuario
          await enviarWhatsApp(
            userId, 
            'Disculpa, hubo un problema al conectarte con el especialista. Por favor, intenta de nuevo o escribe "ayuda".'
          );
          
          // Guardar error en interacciones
          await saveInteraction({
            userId,
            agent: 'system',
            agentName: 'System',
            intentReason: 'handoff_error',
            input: text,
            output: `Error en handoff: ${handoffError.message}`,
            meta: {
              route: '/webhooks/wassenger',
              via: 'whatsapp',
              error: handoffError.message,
              targetAgent
            }
          });
          
          return res.json({ success: false, error: 'handoff_failed', message: handoffError.message });
        }
      }

      // 👋 MANEJAR RETORNO - Usuario vuelve a un agente
      if (resultado.metadata.returningToAurora) {
        console.log('[WASSENGER] 👋 Usuario retorna a Aurora desde otro agente');
        
        try {
          // Enviar mensaje de despedida del agente anterior
          const agenteAnterior = profile.activeAgent;
          
          if (agenteAnterior && agenteAnterior !== 'AURORA') {
            const { AGENTES } = await import('../../deteccion-intenciones/orquestador.js');
            const agenteObj = AGENTES[agenteAnterior];
            
            if (agenteObj && agenteObj.mensajes?.despedida) {
              console.log('[WASSENGER] 👋 Enviando despedida de:', agenteObj.nombre);
              
              const despedidaResult = await enviarWhatsApp(userId, agenteObj.mensajes.despedida);
              
              if (despedidaResult.ok) {
                await saveConversationMessage(userId, {
                  role: 'assistant',
                  content: agenteObj.mensajes.despedida,
                  agent: agenteObj.nombre
                });

                // Delay de 5 segundos
                console.log('[WASSENGER] ⏳ Esperando 5 segundos antes de entrada de Aurora...');
                await new Promise(resolve => setTimeout(resolve, 5000));
              } else {
                console.warn('[WASSENGER] ⚠️ No se pudo enviar despedida:', despedidaResult.error);
              }
            }
          }

          // Actualizar agente activo a Aurora
          await saveProfile(userId, {
            activeAgent: 'AURORA'
          });
          
          console.log('[WASSENGER] ✅ Agente activo actualizado a: AURORA');

          // Aurora responde con su mensaje de entrada (siempre AURORA aquí)
          reply = await complete(resultado.prompt, {
            temperature: 0.4,
            max_tokens: 300,
            system: resultado.systemPrompt
          });
          
        } catch (returnError) {
          console.error('[WASSENGER] ❌ Error durante retorno a Aurora:', returnError);
          
          // Forzar actualización a Aurora y continuar
          await saveProfile(userId, {
            activeAgent: 'AURORA'
          });
          
          // Aurora responde normalmente (siempre AURORA en catch)
          reply = await complete(resultado.prompt, {
            temperature: 0.4,
            max_tokens: 300,
            system: resultado.systemPrompt
          });
        }
      } else {
        // 🎯 Campañas DESACTIVADAS - Aurora maneja TODO con contexto completo
        // Aurora tiene acceso a firstVisit, freeTrialUsed, historial, etc.
        // y puede responder naturalmente según el contexto del usuarioerar respuesta con contexto completo
        console.log(`[WASSENGER] 🔍 DEBUGGING PROMPT - Contexto enviado a OpenAI:`, {
          promptIncluyeNombre: resultado.prompt.includes(profile.name || 'SIN_NOMBRE'),
          perfilNombre: profile.name,
          esCancelacion: resultado.metadata.cancelacion,
          firstVisit: profile.firstVisit,
          freeTrialUsed: profile.freeTrialUsed
        });

        // 🎯 Configuración según agente activo
        const activeAgent = profile.activeAgent || 'AURORA';
        const isSpecializedAgent = ['ENZO', 'ADRIANA', 'ALUNA'].includes(activeAgent);
        
        reply = await complete(resultado.prompt, {
          temperature: isSpecializedAgent ? 0.7 : 0.4,  // Agentes especializados más creativos
          max_tokens: isSpecializedAgent ? 800 : 300,   // Agentes especializados sin límites
          system: resultado.systemPrompt
        });
      }
    }

    // 💳 BYPASS DESHABILITADO - Aurora maneja el flujo completo con confirmación
    // El bypass causaba: 1) Skip de confirmación, 2) No cálculo de precio, 3) No muestra opciones de pago
    // Mantener este código comentado - Aurora ahora gestiona reservas de principio a fin
    /*
    const paymentCheck = shouldSendPaymentLink(text, profile);
    if (paymentCheck && resultado.agenteKey === 'AURORA') {
      console.log('[WASSENGER] 💳 Usuario recurrente eligió espacio:', paymentCheck.serviceType);
      console.log('[WASSENGER] 💳 Enviando link de pago automáticamente');
      reply = paymentCheck.message;
      
      // Guardar en perfil que está esperando comprobante
      profile.awaitingPaymentReceipt = {
        serviceType: paymentCheck.serviceType,
        price: paymentCheck.price,
        timestamp: new Date().toISOString()
      };
      await saveProfile(userId, profile); // FIX: Pasar userId correctamente
    }
    */

    // 🎯 Agregar mensaje de upsell si aplica (ANTES de Aurora response)
    if (upsellMessage && !campaignCheck.detected && !paymentCheck) {
      reply = `${reply}\n\n${upsellMessage}`;
    }

    // 🔄 PROCESAR POSIBLES CONFIRMACIONES DE AURORA
    console.log('[WASSENGER] 🔍 Antes de finalReply - reply:', reply ? 'EXISTE' : 'NULL/UNDEFINED');
    let finalReply = reply;
    let confirmationActivated = false;
    
    if (resultado.agenteKey === 'AURORA') {
      console.log('[WASSENGER] 🔍 Llamando enhanceAuroraResponse con reply de length:', reply?.length || 0);
      console.log('[WASSENGER] 🔍 Pasando formResult al enhancement:', formResult ? 'DISPONIBLE' : 'NO DISPONIBLE');
      const enhancement = await enhanceAuroraResponse(reply, profile, formResult);
      console.log('[WASSENGER] 🔍 enhanceAuroraResponse completado - enhanced:', enhancement.enhanced);
      
      if (enhancement.enhanced) {
        finalReply = enhancement.finalMessage;
        confirmationActivated = true;
        console.log('[WASSENGER] ✅ Aurora activó sistema de confirmación');
      } else {
        // Si no hubo enhancement, usar la respuesta original de Aurora
        finalReply = reply;
      }
    } else {
      // Otros agentes usan su respuesta directamente
      finalReply = reply;
    }

    // 🆕 Guardar respuesta del asistente en historial
    console.log('[WASSENGER] 💾 Guardando mensaje en historial - finalReply length:', finalReply?.length || 0);
    await saveConversationMessage(userId, {
      role: 'assistant',
      content: finalReply,
      agent: resultado.agente
    });
    console.log('[WASSENGER] ✅ Mensaje guardado en historial');

    // 🔧 MARCAR PRIMERA VISITA COMO COMPLETADA después de respuesta de Aurora
    if (resultado.agenteKey === 'AURORA' && profile.firstVisit === true) {
      console.log('[WASSENGER] 🎯 Marcando primera visita como completada para:', userId);
      console.log('[WASSENGER] 📊 Perfil antes del cambio:', JSON.stringify(profile, null, 2));
      
      const updatedProfile = {
        ...profile,
        firstVisit: false, // ✅ Ya no es primera visita después de que Aurora responda
        conversationCount: (profile.conversationCount || 0) + 1 // Asegurar que se incremente
      };
      
      await saveProfile(userId, updatedProfile);
      console.log('[WASSENGER] ✅ Perfil actualizado con firstVisit: false');
      
      // Verificar que se guardó correctamente
      const verifiedProfile = await loadProfile(userId);
      console.log('[WASSENGER] 🔍 Perfil verificado después del guardado:', verifiedProfile.firstVisit);
    }

    // Guardar interacción
    saveInteraction({
      userId,
      agent: resultado.agenteKey,
      agentName: resultado.agente,
      intentReason: resultado.razonSeleccion,
      input: text,
      output: finalReply,
      meta: { 
        route: '/webhooks/wassenger',
        via: 'whatsapp',
        rol: resultado.metadata.rol,
        freeTrialUsed: profile.freeTrialUsed,
        conversationCount: profile.conversationCount,
        confirmationActivated: confirmationActivated,
        replyContext: getReplyContextMetadata(replyContext)
      }
    });

    // Enviar respuesta a WhatsApp
    console.log('[WASSENGER] 📤 Enviando mensaje a WhatsApp - finalReply:', finalReply ? 'EXISTE' : 'NULL/UNDEFINED', '- Length:', finalReply?.length || 0);
    const envio = await enviarWhatsApp(userId, finalReply);

    console.log('[WASSENGER] 📬 Resultado del envío - ok:', envio.ok);
    if (!envio.ok) {
      console.error('[WASSENGER] ❌ Error al enviar respuesta:', envio.error);
    } else {
      console.log('[WASSENGER] ✅ Mensaje enviado correctamente');
    }

    // Responder al webhook (ACK)
    return res.json({ 
      ok: true, 
      agent: resultado.agente,
      messageSent: envio.ok,
      reply: finalReply,
      confirmationActivated: confirmationActivated 
    });

  } catch (err) {
    console.error('[WASSENGER WEBHOOK] Error capturado:', err);
    console.error('[WASSENGER WEBHOOK] Stack:', err.stack);
    
    // Responder siempre 200 OK para que Wassenger no reintente
    return res.status(200).json({ 
      ok: false, 
      error: 'INTERNAL_ERROR', 
      message: err.message,
      handled: true 
    });
  }
});

/**
 * GET /webhooks/wassenger/status - Verificación de estado (sin auth)
 */
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

/**
 * GET /webhooks/wassenger - Verificación de webhook (para Wassenger)
 */
router.get('/webhooks/wassenger', (req, res) => {
  res.send('ok');
});

/**
 * POST /webhooks/wassenger/control - Activar/Desactivar Wassenger
 * Body: { "action": "enable" | "disable" }
 * Nota: Esto solo funciona si usas un comando de Heroku CLI para cambiar config vars
 */
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
