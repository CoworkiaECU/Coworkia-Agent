#!/usr/bin/env node
/**
 * 🔐 Generador de tokens seguros para webhooks
 * 
 * Este script genera tokens criptográficamente seguros para
 * proteger los webhooks de Wassenger.
 * 
 * Uso: node scripts/generate-webhook-secret.js
 */

import crypto from 'crypto';

console.log('\n🔐 GENERADOR DE TOKENS SEGUROS PARA WEBHOOKS\n');
console.log('═'.repeat(60));

// Generar secreto HMAC (para firma criptográfica)
const webhookSecret = crypto.randomBytes(32).toString('hex');
console.log('\n📝 WASSENGER_WEBHOOK_SECRET (para HMAC signature):');
console.log(`   ${webhookSecret}`);

// Generar token compartido simple (alternativa más simple)
const webhookToken = crypto.randomBytes(24).toString('base64url');
console.log('\n🎫 WASSENGER_WEBHOOK_TOKEN (token simple):');
console.log(`   ${webhookToken}`);

console.log('\n═'.repeat(60));
console.log('\n📋 INSTRUCCIONES DE CONFIGURACIÓN:\n');

console.log('1️⃣  CONFIGURAR EN HEROKU:');
console.log('   ─────────────────────────────────────────────────────');
console.log('   heroku config:set WASSENGER_WEBHOOK_SECRET=' + webhookSecret);
console.log('   # O alternativamente (método más simple):');
console.log('   heroku config:set WASSENGER_WEBHOOK_TOKEN=' + webhookToken);
console.log('');

console.log('2️⃣  ACTUALIZAR EN PANEL DE WASSENGER:');
console.log('   ─────────────────────────────────────────────────────');
console.log('   URL del webhook: https://tu-app.herokuapp.com/webhooks/wassenger');
console.log('');
console.log('   Si usas HMAC (RECOMENDADO):');
console.log('     • Header: x-webhook-signature');
console.log('     • Algoritmo: HMAC-SHA256');
console.log('     • Secret: ' + webhookSecret);
console.log('');
console.log('   Si usas token simple:');
console.log('     • Header: x-wassenger-token');
console.log('     • Valor: ' + webhookToken);
console.log('');

console.log('3️⃣  VERIFICAR CONFIGURACIÓN:');
console.log('   ─────────────────────────────────────────────────────');
console.log('   heroku config | grep WASSENGER');
console.log('   heroku logs --tail --app tu-app');
console.log('');

console.log('4️⃣  PROBAR WEBHOOK:');
console.log('   ─────────────────────────────────────────────────────');
console.log('   • Envía un mensaje de prueba desde WhatsApp');
console.log('   • Revisa los logs: heroku logs --tail');
console.log('   • Deberías ver: [WEBHOOK-SECURITY] ✅ Firma válida');
console.log('');

console.log('⚠️  SEGURIDAD:');
console.log('   ─────────────────────────────────────────────────────');
console.log('   • NO compartas estos tokens públicamente');
console.log('   • NO los subas a git');
console.log('   • Rota los tokens cada 90 días');
console.log('   • Usa HMAC (webhook secret) en producción');
console.log('');

console.log('═'.repeat(60));
console.log('\n✅ Tokens generados exitosamente\n');
