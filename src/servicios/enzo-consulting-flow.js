/**
 * enzo-consulting-flow.js
 *
 * Flujo consultivo conversacional de Enzo — MarketingLab.
 *
 * FASES:
 *   DECODING   → Enzo recibe el mensaje, extrae intención con OpenAI, hace 2-3 preguntas
 *   QUALIFYING → Recoge respuestas y completa el brief
 *   CONFIRMING → Enzo resume lo entendido y pide confirmación (SI/NO)
 *   PROCESSING → Genera el plan con OpenAI y envía email
 */

import { complete } from '../servicios-ia/openai.js';
import { thinkingCompleteJSON, isGeminiAvailable } from '../servicios-ia/gemini.js';
import { getPendingConfirmation, setPendingConfirmation, clearPendingConfirmation } from './reservation-state.js';
import { generateEnzoEmailHTML } from './generic-email-templates.js';
import { renderEnzoBriefHTML } from './enzo-brief-generator.js';
import { sendEmail, AGENT_FROM_NAMES, DEFAULT_FROM_EMAIL } from './email.js';
import enzoRepository from '../database/enzoRepository.js';
import { generateSequentialCode } from '../utils/code-generator.js';

const ENZO_STATE_KEY = 'enzo_consulting';
const TTL_MINUTES = 60;

// ─── DETECCIÓN ─────────────────────────────────────────────────────────────

/**
 * Detecta si el mensaje es una consulta de marketing/IA/automatización para Enzo.
 * NO incluye comandos del jefe (esos van por enzo-cotizacion-email.js).
 */
export function isEnzoConsultingIntent(message) {
  if (!message) return false;
  return /\b(marketing|publicidad|redes\s*sociales|instagram|facebook|tiktok|google\s*ads|meta\s*ads|contenido|branding|posicionamiento|seo|sem|campan[aã]|evento|lanzamiento|estrategia|agente\s*ia|bot|automatiz|ia\b|inteligencia\s*artificial|chatbot|whatsapp\s*bot|sistema|funnel|leads?|clientes|ventas|crecer|posicionar|digital)\b/i.test(message);
}

// ─── ESTADO ────────────────────────────────────────────────────────────────

async function getState(userId) {
  const pending = await getPendingConfirmation(userId).catch(() => null);
  if (pending?.type === ENZO_STATE_KEY) return pending;
  return null;
}

async function saveState(userId, state) {
  await setPendingConfirmation(userId, { ...state, type: ENZO_STATE_KEY, agentName: 'ENZO' }, TTL_MINUTES);
}

async function clearState(userId) {
  await clearPendingConfirmation(userId).catch(() => null);
}

// ─── OPENAI: DECODIFICADOR ─────────────────────────────────────────────────

/**
 * OpenAI analiza el mensaje inicial y devuelve:
 * - El intent detectado
 * - Lo que ya entendió claramente
 * - Las 2-3 preguntas que DEBE hacer para completar el brief
 */
async function decodeClientMessage(message) {
  const prompt = `Un cliente escribió esto a Enzo de MarketingLab Ecuador:
"${message}"

Tu tarea: extrae lo que ya sabemos y define exactamente qué preguntar. Devuelve JSON:
{
  "intent": "marketing_digital|ia_automatizacion|evento|estrategia|otro",
  "empresa": "nombre de la empresa si lo mencionó, o null",
  "sector": "sector del negocio si lo mencionó, o null",
  "objetivo": "objetivo principal detectado, o null",
  "email": "email si lo mencionó, o null",
  "understood": ["frase corta de lo que ya entendiste 1", "frase corta 2"],
  "questions": [
    "Primera pregunta CONCRETA que necesitas responder para diseñar su plan (máx 1 línea)",
    "Segunda pregunta esencial (máx 1 línea)"
  ]
}

Reglas:
- Máximo 2 preguntas. Si el mensaje ya es muy completo, 1 pregunta.
- Las preguntas deben ser ESPECÍFICAS para su negocio, no genéricas.
- Si ya hay email en el mensaje, NO lo preguntes.
- Si ya hay empresa clara, NO lo preguntes.
- La última pregunta SIEMPRE debe pedir el email si no lo tenemos.
- Responde SOLO JSON.`;

  const raw = await complete(prompt, {
    model: 'gpt-4o',
    temperature: 0.3,
    max_tokens: 600,
  });

  try {
    return JSON.parse(raw.replace(/```json\n?|\n?```/g, '').trim());
  } catch {
    return null;
  }
}

// ─── OPENAI: GENERADOR DE PLAN ─────────────────────────────────────────────

/**
 * Con el brief completo, genera el plan estratégico de Enzo.
 */
async function generatePlan(brief) {
  const prompt = `Eres Enzo, Director de MarketingLab Ecuador. Un cliente ha confirmado este brief:

Empresa: ${brief.empresa || 'No especificada'}
Sector: ${brief.sector || 'No especificado'}
Objetivo: ${brief.objetivo || 'No especificado'}
Contexto completo: ${brief.fullContext}

Genera un plan estratégico CONCRETO. Devuelve JSON:
{
  "ideaCentral": {
    "titulo": "Nombre corto del concepto (3-5 palabras, poderoso)",
    "descripcion": "Párrafo de 4-5 líneas describiendo la idea diferenciadora. Conecta con su situación específica. Que se sienta como 'esto fue diseñado para mí'."
  },
  "objetivos": [
    {"numero": 1, "texto": "Objetivo SMART específico para su negocio y plazo realista"},
    {"numero": 2, "texto": "Segundo objetivo SMART"},
    {"numero": 3, "texto": "Tercer objetivo SMART"}
  ],
  "planAccion": [
    {"semana": "Semana 1", "icono": "🔍", "titulo": "título corto", "acciones": ["acción específica 1", "acción específica 2"]},
    {"semana": "Semana 2", "icono": "🚀", "titulo": "título corto", "acciones": ["acción 1", "acción 2"]},
    {"semana": "Semana 3", "icono": "📊", "titulo": "título corto", "acciones": ["acción 1", "acción 2"]},
    {"semana": "Semana 4", "icono": "🏆", "titulo": "título corto", "acciones": ["acción 1", "acción 2"]}
  ],
  "kpis": [
    {"metrica": "nombre KPI", "objetivo": "valor objetivo realista", "frecuencia": "semanal|mensual"},
    {"metrica": "nombre KPI 2", "objetivo": "valor objetivo", "frecuencia": "mensual"},
    {"metrica": "nombre KPI 3", "objetivo": "valor objetivo", "frecuencia": "mensual"}
  ],
  "mensajeWA": "Mensaje corto y vendedor para WhatsApp (máx 5 líneas) avisando que el plan llegó al email. Usa emojis con moderación. Menciona 1 highlight del plan."
}

Reglas críticas:
- Todo debe ser específico para ESTE cliente, no genérico
- Los KPIs deben ser medibles y realistas para Ecuador
- El plan de acción debe arrancar siendo ejecutable desde el día 1
- NO exageres números ni prometas resultados imposibles
- Responde SOLO JSON.`;

  const PLAN_SYSTEM = 'Eres Enzo, Director de MarketingLab Ecuador. Produces planes estratégicos CONCRETOS y personalizados. Devuelves SOLO JSON válido.';

  // 🧠 Intentar con Gemini thinking primero
  if (isGeminiAvailable()) {
    const geminiResult = await thinkingCompleteJSON(prompt, {
      system: PLAN_SYSTEM,
      maxOutputTokens: 2000,
      thinkingBudget: 8192,
      timeout: 55000,
    });

    if (geminiResult?.ideaCentral && geminiResult?.planAccion) {
      console.log('[ENZO-PLAN] ✅ Plan generado con Gemini thinking');
      return geminiResult;
    }
    console.warn('[ENZO-PLAN] Gemini no retornó estructura válida, fallback a OpenAI');
  }

  // Fallback a OpenAI
  const raw = await complete(prompt, {
    model: 'gpt-4o',
    temperature: 0.5,
    max_tokens: 2000,
  });

  try {
    const result = JSON.parse(raw.replace(/```json\n?|\n?```/g, '').trim());
    console.log('[ENZO-PLAN] ✅ Plan generado con OpenAI (fallback)');
    return result;
  } catch {
    return null;
  }
}

// ─── HTML DEL PLAN ─────────────────────────────────────────────────────────

function renderPlanHTML(plan, brief) {
  if (!plan) return null;

  const objetivosHTML = (plan.objetivos || []).map((o, i) => `
    <div style="display: flex; align-items: flex-start; margin-bottom: 10px;">
      <div style="min-width: 26px; height: 26px; background: #2DD4BF; border-radius: 50%; color: #042f2e; font-size: 11px; font-weight: 900; display: flex; align-items: center; justify-content: center; margin-right: 10px; margin-top: 1px; flex-shrink: 0;">${o.numero}</div>
      <div style="color: #374151; font-size: 13px; line-height: 1.55;">${o.texto}</div>
    </div>`).join('');

  const semanaCards = (plan.planAccion || []).map(s => `
    <td style="width: 25%; padding: 0 3px; vertical-align: top;">
      <div style="background: #0A0F1E; border-radius: 10px; padding: 14px 12px; text-align: center; box-sizing: border-box;">
        <div style="color: #2DD4BF; font-size: 9px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 6px;">${s.semana}</div>
        <div style="font-size: 20px; margin-bottom: 6px;">${s.icono}</div>
        <div style="color: white; font-size: 11px; font-weight: 700; margin-bottom: 8px;">${s.titulo}</div>
        ${(s.acciones || []).map(a => `<div style="color: rgba(255,255,255,0.5); font-size: 10px; line-height: 1.5; margin-bottom: 3px;">· ${a}</div>`).join('')}
      </div>
    </td>`).join('');

  const kpiRows = (plan.kpis || []).map((k, i) => `
    <tr style="background: ${i % 2 === 0 ? '#F9FAFB' : 'white'};">
      <td style="padding: 10px 14px; color: #374151; font-size: 13px; border-bottom: 1px solid #F3F4F6;">${k.metrica}</td>
      <td style="padding: 10px 14px; color: #0D9488; font-size: 13px; font-weight: 700; border-bottom: 1px solid #F3F4F6;">${k.objetivo}</td>
      <td style="padding: 10px 14px; color: #9CA3AF; font-size: 12px; border-bottom: 1px solid #F3F4F6;">${k.frecuencia}</td>
    </tr>`).join('');

  return `
    <!-- ═══ PLAN ESTRATÉGICO PERSONALIZADO ═══ -->
    <div style="margin: 0 0 24px;">

      <!-- Idea central -->
      <div style="background: linear-gradient(135deg, #0A0F1E 0%, #0D1520 100%); border-radius: 14px; padding: 24px; margin-bottom: 20px; text-align: center;">
        <div style="color: #2DD4BF; font-size: 9px; font-weight: 800; letter-spacing: 3px; text-transform: uppercase; margin-bottom: 10px;">💡 La idea central</div>
        <div style="color: white; font-size: 20px; font-weight: 900; margin-bottom: 14px; line-height: 1.25;">${plan.ideaCentral?.titulo || ''}</div>
        <div style="color: rgba(255,255,255,0.75); font-size: 13px; line-height: 1.75; max-width: 480px; margin: 0 auto;">${plan.ideaCentral?.descripcion || ''}</div>
      </div>

      <!-- Objetivos SMART -->
      <div style="margin-bottom: 20px;">
        <div style="font-size: 11px; font-weight: 700; color: #2DD4BF; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 14px;">🎯 Objetivos</div>
        <div style="background: #F8FFFE; border-left: 4px solid #2DD4BF; border-radius: 0 12px 12px 0; padding: 18px 20px;">
          ${objetivosHTML}
        </div>
      </div>

      <!-- Plan de acción 4 semanas -->
      <div style="margin-bottom: 20px;">
        <div style="font-size: 11px; font-weight: 700; color: #2DD4BF; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 14px;">🗓️ Plan de acción</div>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>${semanaCards}</tr>
        </table>
      </div>

      <!-- KPIs -->
      <div style="margin-bottom: 20px;">
        <div style="font-size: 11px; font-weight: 700; color: #2DD4BF; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 14px;">📊 KPIs que vamos a medir</div>
        <table style="width: 100%; border-collapse: collapse; border-radius: 12px; overflow: hidden;">
          <tr style="background: #0A0F1E;">
            <td style="padding: 9px 14px; color: #2DD4BF; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">Métrica</td>
            <td style="padding: 9px 14px; color: #2DD4BF; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">Objetivo</td>
            <td style="padding: 9px 14px; color: #6B7280; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">Revisión</td>
          </tr>
          ${kpiRows}
        </table>
      </div>

      <!-- CTA reunión -->
      <div style="background: linear-gradient(135deg, #1F2937 0%, #0A0F1E 100%); border-radius: 14px; padding: 24px; text-align: center;">
        <div style="color: rgba(255,255,255,0.6); font-size: 12px; line-height: 1.6; margin-bottom: 18px;">
          Este es tu plan base. En la reunión lo afinamos según tu presupuesto, recursos y tiempos.<br>
          <strong style="color: rgba(255,255,255,0.8);">La primera consultoría es gratuita.</strong>
        </div>
        <a href="https://wa.me/593994837117?text=Hola%20Enzo%2C%20vi%20mi%20plan%20y%20quiero%20agendar%20la%20reuni%C3%B3n%20en%20Coworkia"
           style="display: inline-block; background: linear-gradient(135deg, #2DD4BF 0%, #0D9488 100%); color: #042f2e; padding: 14px 32px; text-decoration: none; border-radius: 50px; font-weight: 800; font-size: 14px; box-shadow: 0 6px 20px rgba(45,212,191,0.35);">
          📅 Agendar reunión en Coworkia — sin costo
        </a>
        <p style="color: rgba(255,255,255,0.3); font-size: 10px; margin: 12px 0 0;">45 minutos · Coworkia Ecuador · Sin compromiso</p>
      </div>

    </div>`;
}

// ─── ENVÍO DE EMAIL CON EL PLAN ────────────────────────────────────────────

async function sendPlanEmail(brief, plan, leadId) {
  const planHTML = renderPlanHTML(plan, brief);

  const html = generateEnzoEmailHTML({
    userName:    brief.empresa || brief.nombre || 'Equipo',
    projectType: brief.intent === 'ia_automatizacion' ? 'Automatización IA' : 'Campaña Digital',
    companyName: brief.empresa || '',
    email:       brief.email,
    phone:       brief.telefono || '',
    budget:      '',
    urgency:     '',
    description: brief.fullContext,
    leadId,
    briefHTML:   planHTML,
  }, { type: 'confirmation' });

  await sendEmail({
    to:      brief.email,
    subject: `🚀 Tu plan estratégico − ${plan?.ideaCentral?.titulo || 'MarketingLab'} | Enzo`,
    html,
    from:    { name: AGENT_FROM_NAMES.enzo, address: DEFAULT_FROM_EMAIL },
  });
}

// ─── FLUJO PRINCIPAL ───────────────────────────────────────────────────────

/**
 * Punto de entrada principal. Devuelve { handled: true, reply } si tomó el mensaje,
 * o { handled: false } si debe seguir al LLM normal.
 *
 * @param {string} userId
 * @param {string} message
 * @param {Object} profile
 */
export async function processEnzoConsultingFlow(userId, message, profile) {
  const state = await getState(userId);

  // ── FASE: QUALIFYING — ya hay preguntas pendientes ──────────────────────
  if (state?.phase === 'QUALIFYING') {
    return _handleQualifyingAnswer(userId, message, state);
  }

  // ── FASE: CONFIRMING — esperando SI/NO ──────────────────────────────────
  if (state?.phase === 'CONFIRMING') {
    return _handleConfirmation(userId, message, state, profile);
  }

  // ── FASE: DECODE — primer mensaje ───────────────────────────────────────
  if (isEnzoConsultingIntent(message)) {
    return _handleInitialMessage(userId, message, profile);
  }

  return { handled: false };
}

// ─── DECODE: primer mensaje ────────────────────────────────────────────────

async function _handleInitialMessage(userId, message, profile) {
  console.log('[ENZO-FLOW] 🧠 Decodificando mensaje inicial...');

  const decoded = await decodeClientMessage(message);
  if (!decoded) {
    return { handled: false }; // fallo silencioso, deja que el LLM normal maneje
  }

  const newState = {
    phase:       'QUALIFYING',
    initialMessage: message,
    intent:      decoded.intent,
    empresa:     decoded.empresa,
    sector:      decoded.sector,
    objetivo:    decoded.objetivo,
    email:       decoded.email,
    questions:   decoded.questions || [],
    answers:     {},
    currentQ:    0,
    fullContext:  message,
  };

  await saveState(userId, newState);

  // Construir respuesta de Enzo: acknowledgment + primera pregunta
  const understood = decoded.understood?.length
    ? `Entendido, ${decoded.understood.join(' y ')}. `
    : '';

  const firstQuestion = (decoded.questions || [])[0];
  if (!firstQuestion) {
    // Si ya tiene todo, pasar directo a CONFIRMING
    return _buildConfirmationMessage(userId, newState);
  }

  const reply = `${understood}\n\nPara diseñarte el mejor plan, necesito saber:\n\n*${firstQuestion}*`;

  return { handled: true, reply: reply.trim() };
}

// ─── QUALIFYING: recogiendo respuestas ────────────────────────────────────

async function _handleQualifyingAnswer(userId, message, state) {
  const questions = state.questions || [];
  const currentQ = state.currentQ || 0;

  // Guardar respuesta de la pregunta actual
  const updatedAnswers = { ...state.answers, [`q${currentQ}`]: message };
  const updatedContext = `${state.fullContext}\n[Respuesta ${currentQ + 1}]: ${message}`;

  // Extraer datos del nuevo mensaje (puede tener email, empresa, etc.)
  const emailMatch = message.match(/[\w.+-]+@[\w.-]+\.[a-zA-Z]{2,}/);
  const newEmail = emailMatch ? emailMatch[0] : state.email;

  const updatedState = {
    ...state,
    answers:     updatedAnswers,
    fullContext:  updatedContext,
    email:       newEmail || state.email,
    currentQ:    currentQ + 1,
  };

  const nextQuestion = questions[currentQ + 1];

  if (nextQuestion) {
    await saveState(userId, updatedState);
    return { handled: true, reply: `*${nextQuestion}*` };
  }

  // Sin más preguntas → pasar a CONFIRMING
  return _buildConfirmationMessage(userId, updatedState);
}

// ─── CONFIRMING: resumen y validación ─────────────────────────────────────

async function _buildConfirmationMessage(userId, state) {
  const updatedState = { ...state, phase: 'CONFIRMING' };
  await saveState(userId, updatedState);

  const empresa = state.empresa ? `*${state.empresa}*` : 'tu empresa';
  const objetivo = state.objetivo || Object.values(state.answers)[0] || 'tu proyecto';

  const summary = `Perfecto${state.empresa ? `, ${state.empresa}` : ''}. Esto es lo que entendí:\n\n` +
    `• *Empresa:* ${state.empresa || 'no especificada'}\n` +
    `• *Objetivo:* ${objetivo}\n` +
    (state.sector ? `• *Sector:* ${state.sector}\n` : '') +
    (state.email ? `• *Email:* ${state.email}\n` : '') +
    `\n¿Confirmas para que prepare tu plan estratégico? _(responde *SI* o *NO*)_`;

  return { handled: true, reply: summary };
}

// ─── CONFIRMING: respuesta SI/NO ──────────────────────────────────────────

async function _handleConfirmation(userId, message, state, profile) {
  const isYes = /^(s[ií]|yes|dale|ok|okay|correcto|exacto|confirmo|adelante|perfecto|claro|bien)\b/i.test(message.trim());
  const isNo  = /^(no|nop|cancel|cambiar|modificar|ajustar|incorrecto|falso)\b/i.test(message.trim());

  if (isNo) {
    await clearState(userId);
    return { handled: true, reply: '¿Qué ajustamos? Cuéntame y lo corrijo.' };
  }

  if (!isYes) {
    return {
      handled: true,
      reply: 'Responde *SI* para que prepare tu plan, o *NO* si hay algo que corregir.',
    };
  }

  // ── SI confirmado → necesitamos email ───────────────────────────────────
  if (!state.email) {
    const waitingState = { ...state, phase: 'WAITING_EMAIL' };
    await saveState(userId, waitingState);
    return { handled: true, reply: '¡Genial! ¿A qué email te envío el plan? 📩' };
  }

  return _processPlan(userId, state, profile);
}

// Manejar email cuando lo piden en WAITING_EMAIL
async function _handleWaitingEmail(userId, message, state, profile) {
  const emailMatch = message.match(/[\w.+-]+@[\w.-]+\.[a-zA-Z]{2,}/);
  if (!emailMatch) {
    return { handled: true, reply: 'No detecté un email válido. ¿Me lo confirmas? (ej: tu@empresa.com)' };
  }
  const updatedState = { ...state, email: emailMatch[0] };
  return _processPlan(userId, updatedState, profile);
}

// ─── PROCESSING: generar plan y enviar email ──────────────────────────────

async function _processPlan(userId, state, profile) {
  await clearState(userId);

  console.log('[ENZO-FLOW] ⚡ Generando plan estratégico con OpenAI...');

  // Aviso inmediato al usuario mientras OpenAI trabaja
  const thinkingMsg = '⚡ *Preparando tu plan estratégico...*\n\nEsto toma unos segundos. Cuando esté listo te llega al email y te aviso aquí. 🚀';

  // Generar plan en segundo plano (no await aquí — devolvemos respuesta rápida)
  _generateAndSendPlan(userId, state, profile).catch(err => {
    console.error('[ENZO-FLOW] ❌ Error generando plan:', err.message);
  });

  return { handled: true, reply: thinkingMsg };
}

async function _generateAndSendPlan(userId, state, profile) {
  const plan = await generatePlan(state);
  if (!plan) {
    console.error('[ENZO-FLOW] ❌ OpenAI no devolvió plan válido');
    return;
  }

  // Generar código de referencia
  const leadId = await generateSequentialCode('ENZO').catch(() => `ML-${Date.now()}`);

  // Guardar lead en DB
  await enzoRepository.saveMarketingLead({
    userPhone:   userId,
    userName:    profile?.name || state.empresa || 'Cliente',
    projectType: state.intent === 'ia_automatizacion' ? 'Automatización IA' : 'Campaña Digital',
    companyName: state.empresa || '',
    email:       state.email,
    phone:       userId,
    budget:      '',
    urgency:     '',
    description: state.fullContext,
  }).catch(e => console.warn('[ENZO-FLOW] ⚠️ No se guardó lead:', e.message));

  // Enviar email con el plan
  await sendPlanEmail(state, plan, leadId);

  console.log(`[ENZO-FLOW] ✅ Plan enviado a ${state.email}`);

  // Enviar notificación WA con el highlight del plan
  const { enviarWhatsApp } = await import('../express-servidor/endpoints-api/wassenger.js').catch(() => ({ enviarWhatsApp: null }));
  if (enviarWhatsApp && plan.mensajeWA) {
    const finalMsg = `${plan.mensajeWA}\n\n📄 Ref: *${leadId}*`;
    await enviarWhatsApp(userId, finalMsg).catch(() => null);
  }
}

// Re-export para manejar WAITING_EMAIL desde el router
export async function processEnzoConsultingFlowFull(userId, message, profile) {
  const state = await getState(userId);

  if (state?.phase === 'WAITING_EMAIL') {
    return _handleWaitingEmail(userId, message, state, profile);
  }

  return processEnzoConsultingFlow(userId, message, profile);
}
