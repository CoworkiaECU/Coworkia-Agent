/**
 * ⚠️ DEPRECATED — Usa magic-notify.mjs en su lugar
 *
 * Este script fue unificado en magic-notify.mjs (que usa la API interna
 * en vez de llamar a Wassenger directo). Se mantiene como redirect.
 *
 * USO: node scripts/magic-notify.mjs "mensaje" "success"
 */

import { execFileSync } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const target = resolve(__dirname, 'magic-notify.mjs');
const args = process.argv.slice(2);

console.warn('⚠️  notify-magic.mjs está deprecado. Usa magic-notify.mjs');
try {
  execFileSync('node', [target, ...args], { stdio: 'inherit' });
} catch (e) {
  process.exit(e.status || 1);
}
