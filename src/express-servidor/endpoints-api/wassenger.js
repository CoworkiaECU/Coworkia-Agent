// src/express-servidor/endpoints-api/wassenger.js
import { Router } from 'express';
import { procesarMensaje } from '../../deteccion-intenciones/orquestador.js';
import { complete } from '../../servicios-ia/openai.js';
import { processPaymentReceipt, isPaymentReceipt } from '../../servicios/payment-verification.js';
import { processConfirmationResponse, hasPendingConfirmation } from '../../servicios/confirmation-flow.js';
import { enhanceAuroraResponse } from '../../servicios/aurora-confirmation-helper.js';
import { 
  loadProfile, 
  saveProfile, 
  saveInteraction, 
  loadConversationHistory, 
  saveConversationMessage,
  getPaymentInfo,
  calculateReservationCost
} from '../../perfiles-interacciones/memoria.js';

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
    'servicio', 'service', 'oficial', 'official', '+593', '+1',
    'contacto', 'contact', 'ventas', 'sales', 'info', 'atención'
  ];
  
  for (const keyword of businessKeywords) {
    const regex = new RegExp(keyword, 'gi');
    cleaned = cleaned.replace(regex, '');
  }
  
  // Remover números de teléfono
  cleaned = cleaned.replace(/\\+?\\d{1,4}[\\s-]?\\d{6,}/g, '');
  
  // Limpiar espacios y caracteres especiales (mantener acentos españoles)
  cleaned = cleaned.replace(/[^\\w\\sñáéíóúüÑÁÉÍÓÚÜ]/g, ' ').replace(/\\s+/g, ' ').trim();
  
  // Solo tomar el primer nombre si es muy largo
  if (cleaned.length > 20) {
    cleaned = cleaned.split(' ')[0];
  }
  
  // Capitalizar primera letra
  if (cleaned.length > 0) {
    cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1).toLowerCase();
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
 * 🆕 Extrae nombres del primer mensaje del usuario
 */
function extractNameFromMessage(message) {
  if (!message || typeof message !== 'string') return null;
  
  const lowerMsg = message.toLowerCase();
  
  // Detectar frases de presentación
  const patterns = [
    /soy\s+([a-záéíóúüñ]{2,15})/i,
    /me llamo\s+([a-záéíóúüñ]{2,15})/i,
    /mi nombre es\s+([a-záéíóúüñ]{2,15})/i,
    /hola soy\s+([a-záéíóúüñ]{2,15})/i,
    /buenos días soy\s+([a-záéíóúüñ]{2,15})/i,
    /buenas tardes soy\s+([a-záéíóúüñ]{2,15})/i
  ];
  
  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match && match[1]) {
      const name = match[1].trim();
      return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
    }
  }
  
  return null;
}

/**
 * 🆕 Intenta extraer nombre del primer mensaje del usuario
 */
function extractNameFromMessage(message) {
  if (!message) return null;
  
  const lowerMsg = message.toLowerCase();
  
  // Patrones comunes de presentación
  const patterns = [
    /mi nombre es ([a-záéíóúñ]+)/i,
    /me llamo ([a-záéíóúñ]+)/i,
    /soy ([a-záéíóúñ]+)/i,
    /hola,? soy ([a-záéíóúñ]+)/i,
    /buenos días,? soy ([a-záéíóúñ]+)/i,
    /buenas tardes,? soy ([a-záéíóúñ]+)/i,
    /hola,? mi nombre es ([a-záéíóúñ]+)/i
  ];
  
  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match && match[1] && match[1].length > 1) {
      const name = match[1].charAt(0).toUpperCase() + match[1].slice(1).toLowerCase();
      return name;
    }
  }
  
  return null;
}

/**
 * 🛡️ Detecta si un mensaje proviene de un bot
 * Retorna { detected: boolean, reason: string }
 */
function detectarBot(data, text, name) {
  // 1. Detectar por campo isBot o type
  if (data.isBot === true || data.type === 'bot' || data.fromBot === true) {
    return { detected: true, reason: 'campo_isBot_true' };
  }

  // 2. Detectar por sufijo @c.us o @g.us en el ID (grupos y canales)
  const userId = data.fromNumber || data.from || '';
  if (userId.includes('@g.us') || userId.includes('@broadcast')) {
    return { detected: true, reason: 'mensaje_de_grupo_o_broadcast' };
  }

  // 3. Detectar números sospechosos de bots (números muy largos o con patrones)
  const numeros = userId.replace(/\D/g, '');
  if (numeros.length > 15 || numeros.startsWith('000000')) {
    return { detected: true, reason: 'numero_invalido_o_sospechoso' };
  }

  // 4. Detectar nombres típicos de bots
  const nombreLower = (name || '').toLowerCase();
  const botKeywords = ['bot', 'automated', 'auto-reply', 'no-reply', 'noreply', 'system', 'whatsapp business'];
  if (botKeywords.some(keyword => nombreLower.includes(keyword))) {
    return { detected: true, reason: 'nombre_contiene_keyword_bot' };
  }

  // 5. Detectar mensajes con estructura típica de bot (muy cortos o solo comandos)
  const textLower = text.toLowerCase().trim();
  if (textLower.startsWith('/') || textLower.startsWith('!') || textLower.startsWith('.')) {
    // Comandos de bots, pero permitimos si parece humano
    if (text.length < 5) {
      return { detected: true, reason: 'comando_bot_detectado' };
    }
  }

  // 6. Detectar mensajes con URLs acortadas repetitivas (spam bots)
  const urlPattern = /(bit\.ly|tinyurl|goo\.gl|t\.co|ow\.ly)/gi;
  const urlMatches = text.match(urlPattern);
  if (urlMatches && urlMatches.length > 2) {
    return { detected: true, reason: 'multiples_urls_acortadas_spam' };
  }

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
    const response = await fetch(`https://api.wassenger.com/v1/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Token': WASSENGER_TOKEN
      },
      body: JSON.stringify({
        phone: numero,
        message: mensaje,
        device: WASSENGER_DEVICE
      })
    });

    const data = await response.json();
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
router.post('/webhooks/wassenger', async (req, res) => {
  try {
    const body = req.body || {};
    const evt = body.event || '';
    const data = body.data || {};

    console.log('[WASSENGER] Webhook recibido:', JSON.stringify(body, null, 2));

    if (!evt || !data) {
      return res.status(400).json({ ok: false, error: 'INVALID_PAYLOAD' });
    }

    // 🛡️ FILTRO 1: Ignorar mensajes salientes o eventos no relevantes
    if (!evt.includes('message:in') || evt.includes('message:out')) {
      return res.json({ ok: true, ignored: true, reason: 'not_incoming_message' });
    }

    // Extraer datos (compatibilidad con diferentes formatos de Wassenger)
    const userId = (data.fromNumber || data.from || '').trim();
    const text = (data.body || data.message || '').trim();
    const name = data.fromName || data.name || '';
    const messageType = data.type || 'text';
    const mediaUrl = data.mediaUrl || data.media?.url || null;

    if (!userId) {
      return res.status(200).json({ ok: true, ignored: true, reason: 'no_user_id' });
    }

    // 📸 PROCESAMIENTO DE IMÁGENES/DOCUMENTOS
    if (messageType === 'image' || messageType === 'document') {
      console.log('[WASSENGER] Procesando imagen/documento:', mediaUrl);
      
      if (!mediaUrl) {
        // Enviar mensaje pidiendo reenviar la imagen
        await enviarWhatsApp(userId, '❌ No pude recibir la imagen correctamente. Por favor, envíala de nuevo.');
        return res.json({ ok: true, processed: true, type: 'image_error' });
      }

      // Verificar si parece un comprobante de pago
      const isReceipt = await isPaymentReceipt(mediaUrl);
      
      if (isReceipt) {
        console.log('[WASSENGER] Imagen detectada como comprobante de pago');
        
        // Procesar comprobante de pago
        const paymentResult = await processPaymentReceipt(mediaUrl, userId);
        
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
        // No es un comprobante de pago
        await enviarWhatsApp(userId, 
          '📷 He recibido tu imagen, pero no parece ser un comprobante de pago. ' +
          'Si tienes una reserva pendiente, envíame la captura de pantalla o foto de tu transferencia/pago realizado.'
        );
        
        return res.json({ 
          ok: true, 
          processed: true, 
          type: 'image_not_receipt' 
        });
      }
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

    // 🛡️ FILTRO 4: Ignorar mensajes muy antiguos (más de 5 minutos)
    const messageTimestamp = data.timestamp || Date.now() / 1000;
    const now = Date.now() / 1000;
    if (now - messageTimestamp > 300) { // 5 minutos
      console.log('[WASSENGER] Mensaje ignorado: muy antiguo');
      return res.json({ ok: true, ignored: true, reason: 'old_message' });
    }

    // 🛡️ FILTRO 5: Detectar y bloquear BOTS
    const isBot = detectarBot(data, text, name);
    if (isBot.detected) {
      console.log(`[WASSENGER] BOT DETECTADO y bloqueado: ${isBot.reason}`);
      return res.json({ ok: true, ignored: true, reason: 'bot_detected', details: isBot.reason });
    }

    // Perfil/memoria
    const current = await loadProfile(userId) || {};
    const firstVisit = current?.firstVisit === undefined ? true : current.firstVisit;
    
    // 🆕 Cargar historial de conversación (últimos 10 mensajes)
    const conversationHistory = await loadConversationHistory(userId, 10);
    
    // 🆕 DETECCIÓN INTELIGENTE DEL NOMBRE
    let detectedName = current.name || null;
    
    // Si no tenemos nombre guardado, intentar extraerlo
    if (!detectedName && name) {
      detectedName = cleanWhatsAppName(name);
      console.log(`[WASSENGER] Nombre detectado de WhatsApp: "${name}" → limpio: "${detectedName}"`);
    }
    
    // También intentar detectar nombre del mensaje si es primera vez
    if (!detectedName && firstVisit && text) {
      const nameFromMessage = extractNameFromMessage(text);
      if (nameFromMessage) {
        detectedName = nameFromMessage;
        console.log(`[WASSENGER] Nombre detectado del mensaje: "${nameFromMessage}"`);
      }
    }
    
    const profile = {
      ...current,
      userId,
      name: detectedName,
      whatsappDisplayName: name || null, // Guardar nombre original de WhatsApp
      channel: 'whatsapp',
      lastMessageAt: new Date().toISOString(),
      firstVisit,
      conversationCount: (current.conversationCount || 0) + 1,
      freeTrialUsed: current.freeTrialUsed || false,
      freeTrialDate: current.freeTrialDate || null,
      reservationHistory: current.reservationHistory || []
    };
    
    // Guardar perfil actualizado
    await saveProfile(userId, profile);

    // 🆕 Guardar mensaje del usuario en historial
    await saveConversationMessage(userId, {
      role: 'user',
      content: text
    });

    // 🔄 SISTEMA DE CONFIRMACIONES SI/NO
    if (hasPendingConfirmation(profile)) {
      console.log('[WASSENGER] Usuario tiene confirmación pendiente, procesando respuesta SI/NO');
      
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
          needsAction: confirmationResult.needsAction
        }
      });

      // Guardar respuesta en historial
      await saveConversationMessage(userId, {
        role: 'assistant',
        content: confirmationResult.message,
        agent: 'Aurora'
      });
      
      return res.json({ 
        ok: true, 
        processed: true,
        type: 'confirmation_response',
        success: confirmationResult.success,
        needsAction: confirmationResult.needsAction
      });
    }

    // Procesar mensaje con orquestador (ahora con historial)
    const resultado = procesarMensaje(text, profile, conversationHistory);

    // Generar respuesta con OpenAI
    const reply = await complete(resultado.prompt, {
      temperature: 0.4,
      max_tokens: 300,
      system: resultado.systemPrompt
    });

    // 🔄 PROCESAR POSIBLES CONFIRMACIONES DE AURORA
    let finalReply = reply;
    let confirmationActivated = false;
    
    if (resultado.agenteKey === 'AURORA') {
      const enhancement = await enhanceAuroraResponse(reply, profile);
      
      if (enhancement.enhanced) {
        finalReply = enhancement.finalMessage;
        confirmationActivated = true;
        console.log('[WASSENGER] Aurora activó sistema de confirmación');
      }
    }

    // 🆕 Guardar respuesta del asistente en historial
    await saveConversationMessage(userId, {
      role: 'assistant',
      content: finalReply,
      agent: resultado.agente
    });

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
        confirmationActivated: confirmationActivated
      }
    });

    // Enviar respuesta a WhatsApp
    const envio = await enviarWhatsApp(userId, finalReply);

    if (!envio.ok) {
      console.error('[WASSENGER] Error al enviar respuesta:', envio.error);
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
 * GET /webhooks/wassenger - Verificación de webhook
 */
router.get('/webhooks/wassenger', (req, res) => {
  res.json({ 
    ok: true, 
    message: 'Wassenger Webhook activo',
    timestamp: new Date().toISOString()
  });
});

export default router;
