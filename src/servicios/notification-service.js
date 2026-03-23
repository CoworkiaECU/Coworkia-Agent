/**
 * 📱 notification-service.js — Notificaciones WhatsApp al celular de Diego
 *
 * Reutiliza WASSENGER_TOKEN + DIEGO_PERSONAL_PHONE del .env.
 * Fall-through silencioso: si falla la notificación, se loguea pero
 * NUNCA bloquea el flujo principal del sistema.
 *
 * Funciones exportadas:
 *  - notifyHighIntent(lead)
 *  - notifyDailyReport(stats)
 *  - notifyCriticalError(context, error)
 *  - notifyAutopilotComplete(tasksCompleted, errors)
 *  - notifyAutopilotBlocked(reason)
 */

import https from 'https';

// ─── Config ───────────────────────────────────────────────────────────────────
// Leemos en runtime (no en import-time) para que dotenv ya esté cargado
const getPhone = () => process.env.DIEGO_PERSONAL_PHONE || '+593987770788';
const getToken = () => process.env.WASSENGER_TOKEN || process.env.WASSENGER_API_KEY;

// ─── Transport ────────────────────────────────────────────────────────────────
/**
 * Envía mensaje WhatsApp al número de Diego.
 * @param {string} message
 * @returns {Promise<{ok: boolean, id?: string, error?: string}>}
 */
async function _send(message) {
  const TOKEN = getToken();
  const PHONE = getPhone();

  if (!TOKEN) {
    console.warn('[NOTIFY] ⚠️ WASSENGER_TOKEN no configurado — notificación omitida');
    return { ok: false, error: 'NO_TOKEN' };
  }

  return new Promise((resolve) => {
    const body = JSON.stringify({ phone: PHONE, message });
    const req = https.request({
      hostname: 'api.wassenger.com',
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'Token': TOKEN,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.id) {
            console.log(`[NOTIFY] ✅ Enviado a ${PHONE} | id: ${json.id}`);
            resolve({ ok: true, id: json.id });
          } else {
            console.warn('[NOTIFY] ⚠️ Wassenger error:', json.message || JSON.stringify(json).slice(0, 200));
            resolve({ ok: false, error: json.message || 'WASSENGER_ERROR' });
          }
        } catch (e) {
          console.warn('[NOTIFY] ⚠️ Parse error:', data.slice(0, 100));
          resolve({ ok: false, error: 'PARSE_ERROR' });
        }
      });
    });

    req.on('error', (err) => {
      console.warn('[NOTIFY] ⚠️ Network error:', err.message);
      resolve({ ok: false, error: err.message });
    });

    req.write(body);
    req.end();
  });
}

// ─── Funciones públicas ───────────────────────────────────────────────────────

/**
 * 🔥 Lead de Aluna con señal de alto interés comercial.
 * @param {{ nombre?: string, phone?: string, plan?: string, keyword?: string, category?: string }} lead
 */
export async function notifyHighIntent(lead) {
  try {
    const nombre   = lead.nombre   || lead.clientName || 'Cliente';
    const keyword  = lead.keyword  || '';
    const category = lead.category || '';
    const plan     = lead.plan     || '';
    const phone    = lead.phone    || lead.userPhone  || '';

    const msg = [
      `🔥 *LEAD CALIENTE*`,
      ``,
      `👤 *${nombre}*${phone ? ` (${phone})` : ''}`,
      plan     ? `🎫 Plan: ${plan}`                : null,
      keyword  ? `💬 Dijo: "${keyword}"`           : null,
      category ? `📂 Categoría: ${category}`       : null,
      ``,
      `→ Abre el dashboard Aluna para tomar acción 🏃`,
    ].filter(l => l !== null).join('\n');

    await _send(msg);
  } catch (err) {
    console.warn('[NOTIFY] notifyHighIntent error:', err.message);
  }
}

/**
 * 📊 Reporte diario matutino.
 * @param {{ aluna?: object, aurora?: object, adriana?: object }} stats
 */
export async function notifyDailyReport(stats = {}) {
  try {
    const a  = stats.aluna   || {};
    const au = stats.aurora  || {};
    const ad = stats.adriana || {};

    const totalActive = (a.newToday || 0) + (au.todayReservations || 0) + (ad.newToday || 0);

    const lines = [
      `📊 *Buenos días Diego!*`,
      ``,
      `💜 *Aluna:* ${a.newToday || 0} leads nuevos today · ${a.followupsSent || 0} follow-ups enviados · ${a.conversions || 0} convertidos`,
      `🏢 *Aurora:* ${au.todayReservations || 0} reservas hoy · ${au.pendingConfirmations || 0} pendientes de confirmar`,
      `🛡️ *Adriana:* ${ad.newToday || 0} cotizaciones nuevas · ${ad.accepted || 0} aceptadas`,
      ``,
      `📈 Total activos: *${totalActive}*`,
      new Date().toLocaleDateString('es-EC', { weekday: 'long', day: 'numeric', month: 'long' }),
    ];

    await _send(lines.join('\n'));
  } catch (err) {
    console.warn('[NOTIFY] notifyDailyReport error:', err.message);
  }
}

/**
 * 🚨 Error crítico en producción.
 * @param {string} context  — Módulo o función donde ocurrió
 * @param {Error|string} error
 */
export async function notifyCriticalError(context, error) {
  try {
    const errMsg = (error instanceof Error) ? error.message : String(error);
    const msg = [
      `🚨 *ERROR CRÍTICO*`,
      ``,
      `📍 ${context}`,
      `❌ ${errMsg.slice(0, 300)}`,
      ``,
      `⏱️ ${new Date().toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' })}`,
    ].join('\n');

    await _send(msg);
  } catch (err) {
    console.warn('[NOTIFY] notifyCriticalError error:', err.message);
  }
}

/**
 * 🛡️ Adriana — Lead aceptó la cotización de seguro.
 * Diego recibe aviso inmediato para coordinar KYC + emisión con VAZ.
 * @param {{ clientName?: string, marca?: string, modelo?: string, anio?: string|number, primaAnual?: number|string, quoteCode?: string }} data
 */
export async function notifyAdrianaAccepted({ clientName = 'Cliente', marca = '', modelo = '', anio = '', primaAnual = '', quoteCode = '' } = {}) {
  try {
    const vehicleDesc = [marca, modelo, anio].filter(Boolean).join(' ') || 'Vehículo';
    const prima = primaAnual ? `$${Number(primaAnual).toLocaleString()}` : '—';
    const msg = [
      `🛡️ *ADRIANA — Nuevo Seguro Aceptado!*`,
      ``,
      `👤 Cliente: *${clientName}*`,
      `🚗 Vehículo: ${vehicleDesc}`,
      `💰 Prima anual: *${prima}*`,
      `🏢 Aseguradora: VAZ Seguros`,
      quoteCode ? `📋 Ref: ${quoteCode}` : '',
      ``,
      `Siguiente paso: coordinar KYC y emisión`,
      `Dashboard: https://coworkia-agent.herokuapp.com/adriana-seguros.html`,
    ].filter(l => l !== '').join('\n');

    await _send(msg);
  } catch (err) {
    console.warn('[NOTIFY] notifyAdrianaAccepted error:', err.message);
  }
}

/**
 * ✅ Autopilot completó un bloque de trabajo.
 * @param {number} tasksCompleted
 * @param {number} errors
 * @param {string} [blockName]
 */
export async function notifyAutopilotComplete(tasksCompleted, errors = 0, blockName = '') {
  try {
    const statusEmoji = errors === 0 ? '✅' : '⚠️';
    const msg = [
      `${statusEmoji} *Autopilot completó*${blockName ? ` — ${blockName}` : ''}`,
      ``,
      `📋 Tareas: *${tasksCompleted}* completadas`,
      errors > 0 ? `❗ Errores: *${errors}*` : `🎯 Sin errores`,
      ``,
      `¿Deploy a producción? Responde *SI* / *NO*`,
    ].filter(Boolean).join('\n');

    await _send(msg);
  } catch (err) {
    console.warn('[NOTIFY] notifyAutopilotComplete error:', err.message);
  }
}

/**
 * ⏸️ Autopilot bloqueado — requiere decisión humana.
 * @param {string} reason
 */
export async function notifyAutopilotBlocked(reason) {
  try {
    const msg = [
      `⏸️ *Autopilot pausado*`,
      ``,
      `🤔 ${reason}`,
      ``,
      `Responde para continuar o indica cómo proceder.`,
    ].join('\n');

    await _send(msg);
  } catch (err) {
    console.warn('[NOTIFY] notifyAutopilotBlocked error:', err.message);
  }
}

/**
 * 📦 Commit de código — notifica a Diego qué se commiteó.
 * Llamado por el git hook post-commit automáticamente.
 * @param {string} hash   - Short commit hash (e.g. "f020b6e")
 * @param {string} msg    - Mensaje del commit
 * @param {string} chat   - Identificador del chat que hizo el commit ("Aurora" | "Adriana" | etc.)
 * @param {string[]} files - Lista de archivos modificados
 */
export async function notifyGitCommit(hash = '', msg = '', chat = 'Copilot', files = []) {
  try {
    const filesLine = files.length
      ? `📁 Archivos:\n${files.slice(0, 8).map(f => `  • ${f}`).join('\n')}${files.length > 8 ? `\n  … +${files.length - 8} más` : ''}`
      : '';

    const text = [
      `📦 *Commit nuevo — ${chat}*`,
      ``,
      `🔖 \`${hash}\``,
      `💬 ${msg}`,
      ``,
      filesLine,
      ``,
      `_(usa STATUS para ver estado del sistema)_`,
    ].filter(Boolean).join('\n');

    await _send(text);
  } catch (err) {
    console.warn('[NOTIFY] notifyGitCommit error:', err.message);
  }
}

/**
 * Envía un mensaje de texto libre a Diego por WhatsApp.
 * @param {string} message
 */
export async function notifyRaw(message) {
  await _send(message);
}
