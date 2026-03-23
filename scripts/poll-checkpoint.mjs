#!/usr/bin/env node
/**
 * 🤖 poll-checkpoint.mjs
 *
 * Uso:
 *   node scripts/poll-checkpoint.mjs --block "Bloque 1 wiring" [--timeout 10]
 *
 * Qué hace:
 *   1. Llama POST /api/autopilot/checkpoint → registra en DB + envía WA a Diego
 *   2. Pollea GET /api/autopilot/checkpoint-answer cada 15 segundos
 *   3. Cuando Diego responde desde WA (SIGUIENTE / PARA / DEPLOY / SKIP):
 *      - imprime el comando recibido
 *      - sale con exit code 0 si debe continuar (SIGUIENTE / DEPLOY / SKIP)
 *      - sale con exit code 2 si debe parar (PARA)
 *   4. Si Diego no responde en tiempo → sale con exit code 0 (auto-SIGUIENTE)
 *
 * Variables de entorno requeridas:
 *   AUTOPILOT_BASE_URL    — URL del servidor (ej: https://coworkia-agent-xxx.herokuapp.com)
 *   CHECKPOINT_SECRET     — Token para autenticar con el servidor
 *
 * Obtener de Heroku con:
 *   heroku config:get CHECKPOINT_SECRET --app coworkia-agent
 *   heroku config:get AUTOPILOT_BASE_URL --app coworkia-agent
 */

import { parseArgs } from 'util';

// ─── Parse arguments ──────────────────────────────────────────────────────────

const { values } = parseArgs({
  options: {
    block:   { type: 'string',  short: 'b', default: 'Bloque completado' },
    timeout: { type: 'string',  short: 't', default: '10' },
    message: { type: 'string',  short: 'm', default: '' },
  },
  strict: false,
});

const blockName      = values.block;
const timeoutMinutes = parseInt(values.timeout, 10) || 10;
const customMessage  = values.message;

// ─── Config ───────────────────────────────────────────────────────────────────

const BASE_URL = process.env.AUTOPILOT_BASE_URL || 'https://coworkia-agent-e97d15dac56f.herokuapp.com';
const SECRET   = process.env.CHECKPOINT_SECRET;

if (!SECRET) {
  console.error('❌ CHECKPOINT_SECRET no configurado.');
  console.error('   Obtenerlo con: heroku config:get CHECKPOINT_SECRET --app coworkia-agent');
  console.error('   Luego: export CHECKPOINT_SECRET=<valor>');
  process.exit(1);
}

const POLL_INTERVAL_MS  = 15_000;  // 15 segundos entre checks
const TIMEOUT_MS        = timeoutMinutes * 60 * 1000;

// ─── HTTP helpers ─────────────────────────────────────────────────────────────

async function apiPost(path, body) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method:  'POST',
    headers: {
      'Authorization': `Bearer ${SECRET}`,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify(body),
  });
  return res.json();
}

async function apiGet(path) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Authorization': `Bearer ${SECRET}` },
  });
  return res.json();
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n🤖 [CHECKPOINT] Registrando bloque: "${blockName}"`);
  console.log(`⏱️  Timeout: ${timeoutMinutes} min | Poll: cada ${POLL_INTERVAL_MS / 1000}s\n`);

  // 1. Registrar checkpoint en servidor → envía WA a Diego
  let checkpointId;
  try {
    const result = await apiPost('/api/autopilot/checkpoint', {
      blockName,
      message: customMessage || blockName,
      timeoutMinutes,
    });

    if (!result.ok) {
      console.error('❌ Error registrando checkpoint:', result.error);
      // Si falla el servidor, continuar automáticamente (no bloquear el autopilot)
      console.log('⚠️  Auto-continuando por error de servidor...');
      process.exit(0);
    }

    checkpointId = result.checkpointId;
    console.log(`✅ Checkpoint #${checkpointId} registrado. WA enviado a Diego.`);
    console.log(`\n📱 Diego puede responder: SIGUIENTE · DEPLOY · SKIP · PARA\n`);
  } catch (err) {
    console.error('❌ No se pudo contactar el servidor:', err.message);
    console.log('⚠️  Auto-continuando por error de red...');
    process.exit(0);
  }

  // 2. Polling loop
  const startTime = Date.now();
  let attempt = 0;

  while (true) {
    await sleep(POLL_INTERVAL_MS);
    attempt++;

    const elapsed = Date.now() - startTime;
    const secsElapsed = Math.round(elapsed / 1000);
    const secsLeft    = Math.round((TIMEOUT_MS - elapsed) / 1000);

    if (elapsed >= TIMEOUT_MS) {
      console.log(`\n⏰ Timeout de ${timeoutMinutes} min alcanzado (sin respuesta)`);
      console.log('▶️  Auto-SIGUIENTE — continuando al próximo bloque\n');
      process.exit(0);
    }

    let data;
    try {
      data = await apiGet('/api/autopilot/checkpoint-answer');
    } catch (err) {
      console.log(`[${secsElapsed}s] ⚠️  Error de red al polllear — reintentando...`);
      continue;
    }

    if (data.status === 'waiting') {
      process.stdout.write(`[${secsElapsed}s] ⏳ Esperando respuesta de Diego... (${secsLeft}s restantes)\r`);
      continue;
    }

    if (data.status === 'none') {
      // No hay checkpoint activo — servidor reiniciado? continuar
      console.log(`\n[${secsElapsed}s] ⚠️  Checkpoint no encontrado en servidor`);
      console.log('▶️  Auto-SIGUIENTE\n');
      process.exit(0);
    }

    if (data.status === 'expired') {
      console.log(`\n[${secsElapsed}s] ⏰ Checkpoint expirado en servidor`);
      console.log('▶️  Auto-SIGUIENTE\n');
      process.exit(0);
    }

    if (data.status === 'answered') {
      const cmd = (data.command || '').toUpperCase();
      console.log(`\n\n✅ Diego respondió: *${cmd}*`);

      switch (cmd) {
        case 'SIGUIENTE':
          console.log('▶️  Continuando al siguiente bloque...\n');
          process.exit(0);

        case 'DEPLOY':
          console.log('🚀 Deploying a Heroku antes de continuar...\n');
          // El autopilot que llama este script debe leer stdout y decidir
          // Salir con código especial que el autopilot interprete como "deploy + continuar"
          process.stdout.write('ACTION:DEPLOY\n');
          process.exit(0);

        case 'SKIP':
          console.log('⏭️  Saltando bloque actual...\n');
          process.stdout.write('ACTION:SKIP\n');
          process.exit(0);

        case 'PARA':
          console.log('🛑 Autopilot pausado por Diego.\n');
          process.exit(2);  // exit code 2 = parar

        default:
          console.log(`❓ Comando no reconocido: ${cmd} — continuando\n`);
          process.exit(0);
      }
    }
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

main().catch(err => {
  console.error('❌ Error fatal en poll-checkpoint:', err.message);
  process.exit(0); // no bloquear el autopilot
});
