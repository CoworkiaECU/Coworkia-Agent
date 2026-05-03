/**
 * 📛 /api/email-bounces — Admin endpoint para gestionar la blocklist de emails
 *
 * GET    /api/email-bounces                  → lista todas las entradas
 * GET    /api/email-bounces?onlyBlocked=true → solo activos
 * POST   /api/email-bounces                  → agregar manualmente { email, reason }
 * DELETE /api/email-bounces/:email           → desbloquear (perdón)
 */

import express from 'express';
import {
  listBlocklist,
  addToBlocklist,
  removeFromBlocklist,
  isBlocked,
} from '../../servicios/email-blocklist.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const onlyBlocked = String(req.query.onlyBlocked || '').toLowerCase() === 'true';
    const rows = await listBlocklist({ onlyBlocked });
    res.json({ ok: true, count: rows.length, items: rows });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.get('/:email', async (req, res) => {
  try {
    const status = await isBlocked(req.params.email);
    res.json({ ok: true, email: req.params.email, ...status });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { email, reason = 'manual', lastError = null, agent = null } = req.body || {};
    if (!email) return res.status(400).json({ ok: false, error: 'email requerido' });
    const result = await addToBlocklist(email, { reason, lastError, agent });
    if (!result.ok) return res.status(500).json(result);
    res.json({ ok: true, email, reason });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.delete('/:email', async (req, res) => {
  try {
    const result = await removeFromBlocklist(req.params.email);
    if (!result.ok) return res.status(500).json(result);
    res.json({ ok: true, email: req.params.email, unblocked: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

export default router;
