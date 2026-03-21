/**
 * 📱 notify-magic.mjs — Notificación WhatsApp a Diego
 *
 * USO: node scripts/notify-magic.mjs "mensaje personalizado"
 *
 * Si no se pasa mensaje, usa el default de autopilot completado.
 * Lee credenciales desde .env del proyecto.
 */

import https from 'https';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, '../.env');

// Cargar .env
const envLines = readFileSync(envPath, 'utf8').split('\n');
const env = {};
for (const line of envLines) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)\s*=\s*(.+)$/);
  if (m) env[m[1]] = m[2].trim();
}

const token = env.WASSENGER_TOKEN || env.WASSENGER_API_KEY;
const phone = env.DIEGO_PERSONAL_PHONE || '+593987770788';
const message = process.argv[2] || '✨ *Sensei soy Magic* ✨\n🚀 Autopilot completado. Listo nena. 🎯';

if (!token) {
  console.error('❌ No se encontró WASSENGER_TOKEN en .env');
  process.exit(1);
}

const body = JSON.stringify({ phone, message });

const req = https.request({
  hostname: 'api.wassenger.com',
  path: '/v1/messages',
  method: 'POST',
  headers: {
    'Token': token,
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body)
  }
}, res => {
  let data = '';
  res.on('data', d => data += d);
  res.on('end', () => {
    try {
      const j = JSON.parse(data);
      if (j.id) {
        console.log('✅ Notificación enviada a', phone, '| id:', j.id);
      } else {
        console.error('❌ Error Wassenger:', j.message || JSON.stringify(j).slice(0, 200));
        process.exit(1);
      }
    } catch (e) {
      console.error('❌ Parse error:', data.slice(0, 200));
      process.exit(1);
    }
  });
});

req.on('error', e => {
  console.error('❌ Error de red:', e.message);
  process.exit(1);
});

req.write(body);
req.end();
