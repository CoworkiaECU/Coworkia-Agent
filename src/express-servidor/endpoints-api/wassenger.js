// src/express-servidor/endpoints-api/wassenger.js
import { Router } from 'express';
import { procesarMensaje } from '../../deteccion-intenciones/orquestador.js';
import { complete } from '../../servicios-ia/openai.js';
import { loadProfile, saveProfile, saveInteraction } from '../../perfiles-interacciones/memoria.js';

const router = Router();

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

    if (!userId || !text) {
      return res.status(200).json({ ok: true, ignored: true, reason: 'no_user_or_text' });
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
    const profile = {
      ...current,
      userId,
      name: name || current.name,
      channel: 'whatsapp',
      lastMessageAt: new Date().toISOString(),
      firstVisit
    };
    
    // Guardar perfil actualizado
    await saveProfile(userId, profile);

    // Procesar mensaje con orquestador
    const resultado = procesarMensaje(text, profile, []);

    // Generar respuesta con OpenAI
    const reply = await complete(resultado.prompt, {
      temperature: 0.4,
      max_tokens: 300,
      system: resultado.systemPrompt
    });

    // Guardar interacción
    saveInteraction({
      userId,
      agent: resultado.agenteKey,
      agentName: resultado.agente,
      intentReason: resultado.razonSeleccion,
      input: text,
      output: reply,
      meta: { 
        route: '/webhooks/wassenger',
        via: 'whatsapp',
        rol: resultado.metadata.rol
      }
    });

    // Enviar respuesta a WhatsApp
    const envio = await enviarWhatsApp(userId, reply);

    if (!envio.ok) {
      console.error('[WASSENGER] Error al enviar respuesta:', envio.error);
    }

    // Responder al webhook (ACK)
    return res.json({ 
      ok: true, 
      agent: resultado.agente,
      messageSent: envio.ok,
      reply 
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
