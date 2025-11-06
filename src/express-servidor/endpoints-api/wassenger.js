// src/express-servidor/endpoints-api/wassenger.js
import { Router } from 'express';
import { procesarMensaje } from '../../deteccion-intenciones/orquestador.js';
import { complete } from '../../servicios-ia/openai.js';
import { loadProfile, saveProfile, saveInteraction } from '../../perfiles-interacciones/memoria.js';

const router = Router();

/**
 * Envía mensaje a WhatsApp vía Wassenger API
 */
async function enviarWhatsApp(numero, mensaje) {
  const WASSENGER_TOKEN = process.env.WASSENGER_TOKEN;
  const WASSENGER_DEVICE = process.env.WASSENGER_DEVICE || process.env.WASSENGER_DEVICE_ID;

  if (!WASSENGER_TOKEN || !WASSENGER_DEVICE) {
    console.warn('[WASSENGER] Token o Device no configurado');
    return { ok: false, error: 'NO_WASSENGER_CONFIG' };
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

    // Ignorar mensajes salientes o eventos no relevantes
    if (!evt.includes('message:in')) {
      return res.json({ ok: true, ignored: true, reason: 'not_incoming' });
    }

    // Extraer datos (compatibilidad con diferentes formatos de Wassenger)
    const userId = (data.fromNumber || data.from || '').trim();
    const text = (data.body || data.message || '').trim();
    const name = data.fromName || data.name || '';

    if (!userId || !text) {
      return res.status(200).json({ ok: true, ignored: true, reason: 'no_user_or_text' });
    }

    // Evitar procesar el propio número del bot
    const BOT_NUMBER = process.env.WHATSAPP_BOT_NUMBER || process.env.WASSENGER_DEVICE;
    if (BOT_NUMBER && userId.includes(BOT_NUMBER)) {
      return res.json({ ok: true, ignored: true, reason: 'self-message' });
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
    console.error('[WASSENGER WEBHOOK] Error:', err);
    return res.status(500).json({ ok: false, error: 'WASSENGER_WEBHOOK_ERROR', message: err.message });
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
