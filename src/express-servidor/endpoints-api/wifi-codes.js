/**
 * 📡 API de Códigos WiFi — para sincronización con Mac Mini (portal cautivo)
 *
 * Todos los endpoints requieren cabecera:
 *   X-Wifi-Api-Key: <WIFI_SYNC_API_KEY desde .env>
 *
 * Rutas:
 *   GET  /api/wifi-codes/pending     → Mac Mini descarga códigos nuevos
 *   POST /api/wifi-codes/confirm-sync → Mac Mini confirma que los recibió
 *   GET  /api/wifi-codes/stats        → Healthcheck / admin
 */

import { Router } from 'express';
import {
  getPendingCodes,
  markCodesAsSynced,
  getWifiCodesStats
} from '../../servicios/wifi-codes-service.js';

const router = Router();

// ---------------------------------------------------------------------------
// 🔐 Middleware de autenticación por API Key
// ---------------------------------------------------------------------------
function requireWifiApiKey(req, res, next) {
  const expectedKey = process.env.WIFI_SYNC_API_KEY;

  if (!expectedKey) {
    console.error('[WiFi-API] ❌ WIFI_SYNC_API_KEY no está configurado en .env');
    return res.status(503).json({ ok: false, error: 'WiFi sync not configured' });
  }

  const provided = req.headers['x-wifi-api-key'] || req.query.api_key;

  if (!provided || provided !== expectedKey) {
    console.warn('[WiFi-API] ⚠️ Intento de acceso con API key inválida desde', req.ip);
    return res.status(401).json({ ok: false, error: 'Unauthorized' });
  }

  next();
}

// ---------------------------------------------------------------------------
// GET /api/wifi-codes/pending
// El Mac Mini llama esto cada 5 min para descargar códigos nuevos
// Parámetro opcional: ?since=120  (minutos hacia atrás, default 60)
// ---------------------------------------------------------------------------
router.get('/api/wifi-codes/pending', requireWifiApiKey, async (req, res) => {
  try {
    const sinceMinutes = Math.min(Math.max(parseInt(req.query.since || '60', 10), 5), 1440);
    const codes = await getPendingCodes(sinceMinutes);

    console.log(`[WiFi-API] 📥 Solicitud sync: ${codes.length} códigos pendientes`);

    return res.json({
      ok: true,
      count: codes.length,
      codes: codes.map(c => ({
        id: c.id,
        code: c.code,
        duration_hours: c.duration_hours,
        valid_for_date: c.valid_for_date,
        created_at: c.created_at
      }))
    });
  } catch (err) {
    console.error('[WiFi-API] ❌ Error en GET /pending:', err);
    return res.status(500).json({ ok: false, error: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/wifi-codes/confirm-sync
// Mac Mini confirma que guardó los códigos en su SQLite local
// Body: { "ids": ["uuid1", "uuid2", ...] }
// ---------------------------------------------------------------------------
router.post('/api/wifi-codes/confirm-sync', requireWifiApiKey, async (req, res) => {
  try {
    const { ids } = req.body || {};

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ ok: false, error: 'ids array is required' });
    }

    // Validar que todos son strings no vacíos (evitar inyección)
    const safeIds = ids.filter(id => typeof id === 'string' && id.trim().length > 0).slice(0, 500);

    if (safeIds.length === 0) {
      return res.status(400).json({ ok: false, error: 'No valid ids provided' });
    }

    const result = await markCodesAsSynced(safeIds);
    console.log(`[WiFi-API] ✅ Sync confirmado: ${result.updated} códigos actualizados`);

    return res.json({ ok: true, updated: result.updated });
  } catch (err) {
    console.error('[WiFi-API] ❌ Error en POST /confirm-sync:', err);
    return res.status(500).json({ ok: false, error: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/wifi-codes/stats
// Panel admin / healthcheck
// ---------------------------------------------------------------------------
router.get('/api/wifi-codes/stats', requireWifiApiKey, async (req, res) => {
  try {
    const stats = await getWifiCodesStats();
    return res.json({ ok: true, stats });
  } catch (err) {
    console.error('[WiFi-API] ❌ Error en GET /stats:', err);
    return res.status(500).json({ ok: false, error: 'Internal server error' });
  }
});

export default router;
