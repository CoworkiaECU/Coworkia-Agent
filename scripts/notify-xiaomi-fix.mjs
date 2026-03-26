/**
 * Notificar a Diego por WhatsApp sobre Autopilot Xiaomi fix
 */
import https from 'https';

const TOKEN = process.env.WASSENGER_TOKEN;
const PHONE = process.env.DIEGO_PERSONAL_PHONE;

const message = `🤖 *Autopilot Magic✨ — Fix Xiaomi v1147*

✅ *Bloque A completado (25min)*

📋 Cambios aplicados:
• Gradientes con fallback sólido (Xiaomi-safe)
• Box-shadows sin hex-alpha transparente  
• Borders sin colores alpha

🎯 *Testing pendiente:*
1️⃣ Enviar email de prueba a ti mismo desde dashboard Aurora/Aluna
2️⃣ Abrirlo en tu Xiaomi
3️⃣ Verificar que se vea bien (no deformado)

📱 Si se ve bien: *"LISTO"*
📱 Si aún falla: *"NECESITA MÁS"* (ejecuto Bloques B+C)

Deploy: v1147 (\`4341c00\`)
Status: ⏸️ Esperando confirmación testing`;

const payload = JSON.stringify({ phone: PHONE, message });

const req = https.request({
  hostname: 'api.wassenger.com',
  path: '/v1/messages',
  method: 'POST',
  headers: {
    'Token': TOKEN,
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload)
  }
}, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      if (json.id) {
        console.log('✅ Notificado a Diego - ID:', json.id);
      } else {
        console.warn('⚠️ Error:', json.message || data);
      }
    } catch (e) {
      console.error('❌ Parse error:', data.slice(0, 100));
    }
  });
});

req.on('error', (e) => console.error('❌ Network error:', e.message));
req.write(payload);
req.end();
