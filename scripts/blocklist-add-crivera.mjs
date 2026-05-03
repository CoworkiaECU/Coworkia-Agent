/**
 * 🚑 Script — agregar crivera@ecuamangueras.com a la blocklist
 *
 * Uso local:   node scripts/blocklist-add-crivera.mjs
 * Uso Heroku:  heroku run --app coworkia-agent node scripts/blocklist-add-crivera.mjs
 *
 * Razón: el servidor MX de ecuamangueras.com (206.222.23.50) está caído desde
 * el 28-abr-2026. Gmail retiene los envíos y reintenta cada cierto tiempo,
 * generando un DSN por intento. Marcamos el email como "soft_bounce" para
 * que ningún follow-up automático (D+1 / D+3 / renovación) vuelva a enviarle.
 *
 * Para "perdonar" el email cuando la oficina del cliente arregle su MX:
 *   curl -X DELETE https://coworkia-agent-e97d15dac56f.herokuapp.com/api/email-bounces/crivera@ecuamangueras.com
 */

import { addToBlocklist, isBlocked } from '../src/servicios/email-blocklist.js';

const EMAIL = 'crivera@ecuamangueras.com';

async function main() {
  const before = await isBlocked(EMAIL);
  if (before.blocked) {
    console.log(`[BLOCKLIST] ℹ️ ${EMAIL} ya está bloqueado (${before.reason}, count=${before.bounce_count})`);
    process.exit(0);
  }

  const result = await addToBlocklist(EMAIL, {
    reason: 'soft_bounce',
    lastError: 'SMTP timeout: ecuamangueras.com MX 206.222.23.50 timed out (reportado 02-may-2026, ALU-2026-0032)',
    agent: 'aluna',
  });

  if (result.ok) {
    console.log(`[BLOCKLIST] ✅ ${EMAIL} agregado a blocklist`);
  } else {
    console.error(`[BLOCKLIST] ❌ Error: ${result.error}`);
    process.exit(1);
  }
  process.exit(0);
}

main().catch(err => {
  console.error('[BLOCKLIST] ❌ Fatal:', err);
  process.exit(1);
});
