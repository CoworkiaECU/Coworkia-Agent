// src/express-servidor/endpoints-api/ai.js
import { Router } from 'express';
import { complete } from '../../servicios-ia/openai.js';

const router = Router();

/**
 * POST /ai/complete
 * Endpoint de prueba directo a OpenAI (para desarrollo/debug)
 */
router.post('/ai/complete', async (req, res) => {
  try {
    const { prompt, system, temperature, max_tokens } = req.body || {};
    
    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ ok: false, error: 'prompt requerido' });
    }

    const reply = await complete(prompt, { system, temperature, max_tokens });

    return res.json({ ok: true, reply });
  } catch (err) {
    console.error('[AI Route] Error:', err);
    return res.status(500).json({ ok: false, error: 'AI_FAILURE' });
  }
});

export default router;
