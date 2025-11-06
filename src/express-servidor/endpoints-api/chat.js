// src/express-servidor/endpoints-api/chat.js
import { Router } from 'express';
import { procesarMensaje } from '../../deteccion-intenciones/orquestador.js';
import { complete } from '../../servicios-ia/openai.js';
import { loadProfile, saveProfile, saveInteraction } from '../../perfiles-interacciones/memoria.js';

const router = Router();

/**
 * POST /chat
 * body: { message: string, profile?: { userId?: string, name?: string, channel?: string, email?: string } }
 * Devuelve: { ok, agent, reason, reply, metadata }
 */
router.post('/chat', async (req, res) => {
  try {
    const { message = '', profile = {} } = req.body || {};
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ ok: false, error: 'message requerido' });
    }

    // Identidad mínima del usuario para memoria
    const userId = (profile.userId || '').toString().trim() || null;
    let persistedProfile = null;
    let historial = [];

    // Carga y actualiza perfil si hay userId
    if (userId) {
      const current = loadProfile(userId) || {};
      const firstVisit = current?.firstVisit === undefined ? true : current.firstVisit;
      persistedProfile = saveProfile(userId, {
        ...current,
        ...profile,
        userId,
        firstVisit,
        lastMessageAt: new Date().toISOString(),
      });
      
      // TODO: Cargar historial de interacciones desde memoria
      // historial = loadInteractions(userId, limit: 3);
    }

    // Procesar mensaje con el orquestador (incluye detección y contexto)
    const resultado = procesarMensaje(
      message,
      persistedProfile || profile,
      historial
    );

    // Generar respuesta con OpenAI usando el prompt construido
    const reply = await complete(resultado.prompt, {
      temperature: 0.4,
      max_tokens: 300,
      system: resultado.systemPrompt
    });

    // Registrar interacción
    try {
      saveInteraction({
        userId: userId || 'anonymous',
        agent: resultado.agenteKey,
        agentName: resultado.agente,
        intentReason: resultado.razonSeleccion,
        input: message,
        output: reply,
        meta: { 
          route: '/chat',
          rol: resultado.metadata.rol
        }
      });
    } catch (e) {
      console.warn('[MEMORY] No se pudo registrar interacción:', e?.message);
    }

    return res.json({
      ok: true,
      agent: resultado.agente,
      agentKey: resultado.agenteKey,
      reason: resultado.razonSeleccion,
      reply,
      metadata: resultado.metadata
    });
  } catch (err) {
    console.error('[CHAT] Error:', err);
    return res.status(500).json({ ok: false, error: 'CHAT_FAILURE', message: err.message });
  }
});

export default router;
