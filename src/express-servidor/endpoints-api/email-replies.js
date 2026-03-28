/**
 * 📬 API Endpoints — Email Reply System
 * 
 * Lee, procesa y responde a emails de clientes que responden mensajes del sistema.
 * Cada respuesta se enruta al agente correcto sin cruzar información.
 * 
 * @author Coworkia Agent
 * @date 2026-03-28
 */

import express from 'express';
import databaseService from '../../database/database.js';
import { pollEmailReplies } from '../../servicios/email-reply-reader.js';
import { sendEmail, AGENT_FROM_NAMES } from '../../servicios/email.js';
import { buildEmailTemplate } from '../../servicios/email-template-system.js';

const router = express.Router();

const DEFAULT_FROM_EMAIL = process.env.EMAIL_USER || 'secretaria.coworkia@gmail.com';

// ============================================================================
// POLLING MANUAL + STATUS
// ============================================================================

/**
 * POST /api/email-replies/poll
 * Trigger manual de polling (también lo hace el cron cada 10 min)
 */
router.post('/poll', async (req, res) => {
  try {
    const result = await pollEmailReplies();
    return res.json({ ok: true, ...result });
  } catch (error) {
    console.error('[EMAIL-REPLIES] Error polling:', error);
    return res.status(500).json({ ok: false, error: error.message });
  }
});

/**
 * GET /api/email-replies
 * Lista respuestas de emails agrupadas por agente
 * Query: ?agent=aluna&status=new&limit=50
 */
router.get('/', async (req, res) => {
  try {
    await databaseService.ensureInitialized();
    const { agent, status = 'new', limit = 50 } = req.query;
    
    let query = `
      SELECT id, from_email, from_name, subject, reply_text, agent,
             received_at, status, lead_id, responded, response_sent_at
      FROM email_replies
      WHERE 1=1
    `;
    const params = [];
    let paramIdx = 1;
    
    if (agent) {
      query += ` AND agent = $${paramIdx++}`;
      params.push(agent);
    }
    if (status && status !== 'all') {
      query += ` AND status = $${paramIdx++}`;
      params.push(status);
    }
    query += ` ORDER BY received_at DESC LIMIT $${paramIdx}`;
    params.push(parseInt(limit));
    
    const replies = await databaseService.all(query, params);
    
    // Stats por agente
    const statsQuery = `
      SELECT agent, 
             COUNT(*) as total,
             COUNT(*) FILTER (WHERE status = 'new') as new_count,
             COUNT(*) FILTER (WHERE responded = true) as responded_count
      FROM email_replies
      GROUP BY agent
      ORDER BY new_count DESC
    `;
    const stats = await databaseService.all(statsQuery, []);
    
    return res.json({
      ok: true,
      replies: replies || [],
      stats: stats || [],
      total: (replies || []).length
    });
    
  } catch (error) {
    console.error('[EMAIL-REPLIES] Error listing:', error);
    return res.status(500).json({ ok: false, error: error.message });
  }
});

/**
 * GET /api/email-replies/stats
 * Resumen de respuestas por agente (para dashboard)
 */
router.get('/stats', async (req, res) => {
  try {
    await databaseService.ensureInitialized();
    
    // Verificar que la tabla existe
    const tableCheck = await databaseService.get(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'email_replies'
      ) as exists
    `);
    
    if (!tableCheck?.exists) {
      return res.json({
        ok: true,
        stats: [],
        summary: { total: 0, new: 0, responded: 0 },
        message: 'Tabla aún no creada — se crea al recibir primer reply'
      });
    }
    
    const stats = await databaseService.all(`
      SELECT agent, 
             COUNT(*) as total,
             COUNT(*) FILTER (WHERE status = 'new') as new_count,
             COUNT(*) FILTER (WHERE responded = true) as responded_count,
             MAX(received_at) as last_reply_at
      FROM email_replies
      GROUP BY agent
      ORDER BY new_count DESC
    `, []);
    
    const summary = await databaseService.get(`
      SELECT COUNT(*) as total,
             COUNT(*) FILTER (WHERE status = 'new') as new_count,
             COUNT(*) FILTER (WHERE responded = true) as responded
      FROM email_replies
    `, []);
    
    return res.json({
      ok: true,
      stats: stats || [],
      summary: summary || { total: 0, new_count: 0, responded: 0 }
    });
    
  } catch (error) {
    console.error('[EMAIL-REPLIES] Error stats:', error);
    return res.status(500).json({ ok: false, error: error.message });
  }
});

/**
 * PATCH /api/email-replies/:id/respond
 * Envía una respuesta manual a un email de cliente
 * Body: { responseText: string }
 */
router.patch('/:id/respond', async (req, res) => {
  try {
    await databaseService.ensureInitialized();
    const { id } = req.params;
    const { responseText } = req.body || {};
    
    if (!responseText || !responseText.trim()) {
      return res.status(400).json({ ok: false, error: 'Texto de respuesta requerido' });
    }
    
    // Obtener el reply original
    const reply = await databaseService.get(
      `SELECT * FROM email_replies WHERE id = $1`, [id]
    );
    
    if (!reply) {
      return res.status(404).json({ ok: false, error: 'Respuesta no encontrada' });
    }
    
    if (reply.responded) {
      return res.status(409).json({ ok: false, error: 'Ya se respondió a este email' });
    }
    
    // Construir respuesta con el membrete del agente correcto
    const agentName = AGENT_FROM_NAMES[reply.agent] || AGENT_FROM_NAMES._default;
    const fromAddress = `"${agentName}" <${DEFAULT_FROM_EMAIL}>`;
    
    // Subject: mantener el Re: del thread
    const subject = reply.subject.startsWith('Re:') ? reply.subject : `Re: ${reply.subject}`;
    
    // Build HTML con template del agente
    const agentKey = reply.agent.toUpperCase();
    let html;
    try {
      html = buildEmailTemplate(agentKey, `${agentKey}_REPLY`, {
        nombre: reply.from_name || '',
        mensaje: responseText.trim()
      });
    } catch (_) {
      // Fallback: respuesta simple sin template
      html = `
        <div style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;padding:20px;color:#1a1a1a;">
          <p>Hola ${reply.from_name || ''},</p>
          <p>${responseText.trim().replace(/\n/g, '<br>')}</p>
          <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0;">
          <p style="font-size:12px;color:#6b7280;">
            ${agentName}<br>
            Coworkia Business Center<br>
            📍 Whymper 403, Edificio Finistere, Quito<br>
            📞 +593 99 483 7117
          </p>
        </div>
      `;
    }
    
    // Enviar email de respuesta con threading correcto
    const emailResult = await sendEmail({
      to: reply.from_email,
      subject,
      html,
      from: fromAddress,
      agent: reply.agent,
    });
    
    if (!emailResult.success) {
      return res.status(500).json({ ok: false, error: 'Error enviando email: ' + emailResult.error });
    }
    
    // Actualizar estado
    await databaseService.run(`
      UPDATE email_replies 
      SET responded = true, 
          response_sent_at = CURRENT_TIMESTAMP,
          status = 'responded'
      WHERE id = $1
    `, [id]);
    
    console.log(`[EMAIL-REPLIES] ✅ Respuesta enviada a ${reply.from_email} (agente: ${reply.agent})`);
    
    return res.json({
      ok: true,
      message: `Respuesta enviada como ${reply.agent}`,
      emailSent: true,
      messageId: emailResult.messageId
    });
    
  } catch (error) {
    console.error('[EMAIL-REPLIES] Error responding:', error);
    return res.status(500).json({ ok: false, error: error.message });
  }
});

/**
 * PATCH /api/email-replies/:id/dismiss
 * Marca un reply como procesado/ignorado (no requiere respuesta)
 */
router.patch('/:id/dismiss', async (req, res) => {
  try {
    await databaseService.ensureInitialized();
    const { id } = req.params;
    
    await databaseService.run(`
      UPDATE email_replies 
      SET status = 'dismissed'
      WHERE id = $1
    `, [id]);
    
    return res.json({ ok: true, message: 'Reply descartado' });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
});

export default router;
