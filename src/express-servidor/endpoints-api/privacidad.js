/**
 * 🔐 PRIVACIDAD — Rutas LOPDP
 * 
 * GET  /privacidad         → Política de privacidad
 * GET  /privacidad/arco    → Formulario de derechos ARCO
 * POST /api/arco           → Recibir solicitud ARCO + notificar Diego
 * 
 * Cumplimiento: Ley Orgánica de Protección de Datos Personales (LOPDP) Ecuador
 */

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import databaseService from '../../database/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// ── GET /links ───────────────────────────────────────────────────────────────
router.get('/links', (_req, res) => {
  res.sendFile(path.join(__dirname, '../../../public/links.html'));
});

// ── GET /privacidad ─────────────────────────────────────────────────────────
router.get('/privacidad', (_req, res) => {
  res.sendFile(path.join(__dirname, '../../../public/privacidad.html'));
});

// ── GET /privacidad/arco ────────────────────────────────────────────────────
router.get('/privacidad/arco', (_req, res) => {
  res.sendFile(path.join(__dirname, '../../../public/privacidad-arco.html'));
});

// ── POST /api/arco ──────────────────────────────────────────────────────────
router.post('/api/arco', async (req, res) => {
  const { requestType, fullName, email, phone, description } = req.body;

  // Validación de campos requeridos
  const validTypes = ['acceso', 'rectificacion', 'cancelacion', 'oposicion'];
  if (!requestType || !validTypes.includes(requestType)) {
    return res.status(400).json({ ok: false, message: 'Tipo de solicitud inválido.' });
  }
  if (!fullName || fullName.trim().length < 2) {
    return res.status(400).json({ ok: false, message: 'Nombre completo requerido.' });
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ ok: false, message: 'Email inválido.' });
  }
  if (!description || description.trim().length < 10) {
    return res.status(400).json({ ok: false, message: 'Descripción demasiado corta.' });
  }

  try {
    // Guardar en BD
    const row = await databaseService.get(
      `INSERT INTO arco_requests (request_type, full_name, email, phone, description, status)
       VALUES ($1, $2, $3, $4, $5, 'pending')
       RETURNING id, created_at`,
      [
        requestType,
        fullName.trim(),
        email.trim().toLowerCase(),
        phone?.trim() || null,
        description.trim()
      ]
    );

    // Notificar a Diego por WhatsApp
    try {
      const { enviarWhatsApp } = await import('../../servicios/wassenger-service.js');
      const tipoLabel = { acceso: 'Acceso', rectificacion: 'Rectificación', cancelacion: 'Cancelación', oposicion: 'Oposición' };
      const msg = `⚖️ *Nueva solicitud ARCO #${row.id}*\n` +
        `Tipo: ${tipoLabel[requestType]}\n` +
        `Nombre: ${fullName.trim()}\n` +
        `Email: ${email.trim()}\n` +
        `${phone ? `Teléfono: ${phone}\n` : ''}` +
        `Descripción: ${description.trim().substring(0, 200)}\n\n` +
        `Plazo: 15 días hábiles para responder.`;
      await enviarWhatsApp(process.env.DIEGO_PERSONAL_PHONE, msg);
    } catch (notifyErr) {
      // Notificación no crítica — no fallar la solicitud si WhatsApp falla
      console.warn('[ARCO] ⚠️ No se pudo notificar a Diego por WA:', notifyErr.message);
    }

    console.log(`[ARCO] ✅ Solicitud #${row.id} registrada — tipo: ${requestType}, email: ${email}`);

    return res.status(201).json({
      ok: true,
      requestId: row.id,
      message: 'Solicitud recibida. Te contactaremos en máximo 15 días hábiles.'
    });

  } catch (err) {
    console.error('[ARCO] ❌ Error guardando solicitud:', err.message);
    return res.status(500).json({ ok: false, message: 'Error interno. Intenta nuevamente o escríbenos a coworkia.ec@gmail.com' });
  }
});

// 🔐 Estado de consentimiento de un usuario
router.get('/api/users/:phone/consent', async (req, res) => {
  try {
    const phone = (req.params.phone || '').replace(/[\s+\-().]/g, '');
    if (!phone || phone.length < 8) {
      return res.status(400).json({ ok: false, error: 'Número de teléfono inválido' });
    }

    const user = await databaseService.get(
      `SELECT phone_number, data_consent_at, data_consent_source FROM users WHERE phone_number = $1`,
      [phone]
    );

    if (!user) {
      return res.status(404).json({ ok: false, error: 'Usuario no encontrado' });
    }

    return res.json({
      ok: true,
      phone: user.phone_number,
      hasConsent: !!user.data_consent_at,
      consentAt: user.data_consent_at || null,
      consentSource: user.data_consent_source || null
    });
  } catch (err) {
    console.error('[CONSENT] ❌ Error consultando consentimiento:', err.message);
    return res.status(500).json({ ok: false, error: 'Error interno' });
  }
});

export default router;
