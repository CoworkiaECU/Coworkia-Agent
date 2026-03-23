#!/usr/bin/env node
/**
 * ✨ magic-notify.mjs — Notifica a Diego por WhatsApp desde autopilot
 *
 * USO desde terminal durante autopilot:
 *   node scripts/magic-notify.mjs "titulo" "type"
 *   node scripts/magic-notify.mjs "B10 + F1/F2 completados" "success"
 *   node scripts/magic-notify.mjs "Deploy completado — v1087 live" "success"
 *
 * Types: success | error | question | checkpoint
 *
 * Llama al endpoint /api/magic/notify en producción.
 * Requiere INTERNAL_API_KEY en .env local.
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import https from 'https';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Cargar .env local manualmente (sin dependencia de dotenv) ─────────────────
function loadEnv() {
  try {
    const envPath = resolve(__dirname, '../.env');
    const lines   = readFileSync(envPath, 'utf-8').split('\n');
    for (const line of lines) {
      const match = line.match(/^([^#=]+)=(.*)$/);
      if (match && !process.env[match[1].trim()]) {
        process.env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '');
      }
    }
  } catch { /* sin .env local — ok */ }
}
loadEnv();

// ── Args ──────────────────────────────────────────────────────────────────────
const title   = process.argv[2] || 'Autopilot — Tarea completada';
const type    = process.argv[3] || 'success';
const plan    = process.argv[4] || '';

const MAGIC_KEY = process.env.INTERNAL_API_KEY;
const BASE_URL  = 'https://coworkia-agent-e97d15dac56f.herokuapp.com';

if (!MAGIC_KEY) {
  console.error('❌ INTERNAL_API_KEY no configurada en .env');
  process.exit(1);
}

// ── Armar payload ─────────────────────────────────────────────────────────────
const now  = new Date().toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' });
const data = {
  plan:   plan || title,
  tasks:  1,
  time:   now,
  commits: []
};

const body = JSON.stringify({ type, title, data, key: MAGIC_KEY });

// ── Enviar ────────────────────────────────────────────────────────────────────
const url  = new URL('/api/magic/notify', BASE_URL);
const opts = {
  hostname: url.hostname,
  path:     url.pathname,
  method:   'POST',
  headers: {
    'Content-Type':  'application/json',
    'Content-Length': Buffer.byteLength(body),
    'x-magic-key':   MAGIC_KEY
  }
};

const req = https.request(opts, (res) => {
  let d = '';
  res.on('data', c => { d += c; });
  res.on('end', () => {
    try {
      const json = JSON.parse(d);
      if (json.ok || json.result?.success) {
        console.log(`✅ Magic notificó a Diego: "${title}"`);
      } else {
        console.warn('⚠️ Magic respondió pero no-ok:', JSON.stringify(json).slice(0, 200));
      }
    } catch {
      console.warn('⚠️ Respuesta inesperada:', d.slice(0, 100));
    }
  });
});

req.on('error', (err) => {
  console.error('❌ Error de red:', err.message);
});

req.write(body);
req.end();
