#!/usr/bin/env node
/**
 * 📲 Notificar a Diego sobre email de test Xiaomi v1149
 * Envía mensaje WA para validación manual
 */

import fetch from 'node-fetch';

const WASSENGER_TOKEN = process.env.WASSENGER_TOKEN;
const DIEGO_PHONE = process.env.DIEGO_PERSONAL_PHONE;

if (!WASSENGER_TOKEN || !DIEGO_PHONE) {
  console.error('❌ Falta WASSENGER_TOKEN o DIEGO_PERSONAL_PHONE');
  process.exit(1);
}

const message = `🧪 *TEST v1149 — Fix Xiaomi MIUI*

Nena, te acabo de enviar un email de prueba a:
📧 yo@diegovillota.com

*BLOQUE B COMPLETADO:*
✅ Eliminado dark mode CSS (@media queries)
✅ Forzado light mode universal
✅ Deploy v1149 en producción

*TESTING MANUAL (B2):*
1️⃣ Abre el email en tu Xiaomi
2️⃣ Verifica que los colores se vean bien (azul SegPopular, tablas, header)
3️⃣ Chequea que el texto sea legible (no negro sobre negro)
4️⃣ Opcional: reenvía a tu iPhone para validar no regression

🟢 Si se ve perfecto → responde *"OK Xiaomi"*
🔴 Si hay problemas → describe qué falla (screenshot ayuda)

*Siguiente:*
- Si OK → Bloque C (xiaomiSafe flag + auto-detect)
- Si NOK → debug + fix + re-test

_Email de test tiene subject: "🧪 TEST v1149 Xiaomi — Adriana Seguros"_
_Commits: 5202016 (B1), fc6d212 (test script)_`;

console.log('📲 Enviando notificación a Diego...\n');

try {
  const response = await fetch('https://api.wassenger.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Token': WASSENGER_TOKEN
    },
    body: JSON.stringify({
      phone: DIEGO_PHONE,
      message: message
    })
  });

  const result = await response.json();

  if (response.ok) {
    console.log('✅ Notificación enviada exitosamente');
    console.log(`📬 MessageId: ${result.id || 'N/A'}\n`);
  } else {
    console.error('❌ Error enviando notificación:', result);
    process.exit(1);
  }
} catch (error) {
  console.error('❌ Error fatal:', error.message);
  process.exit(1);
}

console.log('🏁 Notificación completada. Esperando validación de Diego...');
