// deteccion-intenciones/orquestador.js
// Aurora Core — Orquestador central del ecosistema Coworkia

import { AURORA } from './aurora.js';
import { ALUNA } from './aluna.js';
import { ADRIANA } from './adriana.js';
import { ENZO } from './enzo.js';
import { ANGELA } from './angela.js';
import { AXEL } from './axel.js';
import { GABI } from './gabi.js';
import { TOMI } from './tomi.js';
import { detectarIntencion } from './detectar-intencion.js';

export const AGENTES = {
  AURORA,
  ALUNA,
  ADRIANA,
  ENZO,
  ANGELA,
  AXEL,
  GABI,
  TOMI
};

/**
 * Aurora Core decide TODO.
 */
export function procesarMensaje(mensaje, perfil = {}, historial = [], formData = {}) {
  const activeAgent = perfil.activeAgent || 'AURORA';

  // 1. Detectar intención
  const intent = detectarIntencion(mensaje, activeAgent);

  // 2. Aurora Core decide a qué agente ir
  const targetAgent = decidirAgente(intent, activeAgent);
  
  // 3. Detectar handoff y capturar contexto
  const isHandoff = targetAgent !== activeAgent;
  const handoffContext = isHandoff ? {
    fromAgent: activeAgent,
    toAgent: targetAgent,
    reason: intent.reason,
    userMessage: mensaje,
    timestamp: new Date().toISOString()
  } : null;

  // 4. Construir contexto reducido (Aurora filtra)
  const contexto = construirContexto(perfil, historial, formData, handoffContext);

  // 5. Construir prompt para el agente
  const agente = AGENTES[targetAgent];
  if (!agente) throw new Error(`Agente no encontrado: ${targetAgent}`);

  const prompt = `
${contexto}

MENSAJE DEL USUARIO:
"${mensaje}"

INSTRUCCIONES:
- Responde como ${agente.nombre}
- Mantén tu rol: ${agente.rol}
- No inventes datos que Aurora no te haya dado
- Si el tema no es de tu especialidad, indícalo
`.trim();

  const systemPrompt =
    typeof agente.getSystemPrompt === 'function'
      ? agente.getSystemPrompt(perfil.preferredLanguage || 'es')
      : agente.systemPrompt;

  return {
    agente: agente.nombre,
    agenteKey: targetAgent,
    razonSeleccion: intent.reason,
    systemPrompt,
    prompt,
    metadata: {
      agentHandoff: isHandoff,
      targetAgent,
      intent,
      handoffContext
    }
  };
}

/**
 * Reglas duras de selección de agente.
 */
function decidirAgente(intent, activeAgent) {
  if (intent.flags?.agentHandoff) return intent.agent;
  if (intent.flags?.returningToAurora) return 'AURORA';
  if (intent.flags?.requiresAurora) return 'AURORA';

  // Si hay agente activo y no se pidió cambio explícito, mantener
  if (activeAgent && activeAgent !== 'AURORA' && !intent.flags?.forceChange) {
    return activeAgent;
  }

  return intent.agent || 'AURORA';
}

/**
 * Aurora resume lo que el agente necesita saber.
 */
function construirContexto(perfil = {}, historial = [], formData = {}, handoffContext = null) {
  const lineas = [];

  lineas.push(`USUARIO: ${perfil.name || 'Cliente'}`);
  if (perfil.email) lineas.push(`Email: ${perfil.email}`);

  if (perfil.upcomingReservations?.length) {
    lineas.push(`Reservas futuras: ${perfil.upcomingReservations.length}`);
  }

  if (formData?.summary) {
    lineas.push(`Reserva en proceso: ${formData.summary}`);
  }
  
  // 🤝 CONTEXTO DE HANDOFF: Info crucial para continuidad conversacional
  if (handoffContext) {
    lineas.push('\n🤝 CONTEXTO DE TRANSFERENCIA:');
    lineas.push(`De: ${handoffContext.fromAgent}`);
    lineas.push(`Motivo: ${handoffContext.reason}`);
    lineas.push(`Mensaje que disparó handoff: "${handoffContext.userMessage}"`);
    lineas.push('\n⚠️ IMPORTANTE: El usuario ya mencionó su necesidad. NO preguntes nuevamente lo que ya dijo.');
  }

  const ultimos = historial.slice(-6);
  if (ultimos.length) {
    lineas.push('\nHISTORIAL RECIENTE:');
    ultimos.forEach(m => {
      lineas.push(`${m.role === 'user' ? 'Usuario' : m.agent}: ${m.content}`);
    });
  }

  return lineas.join('\n');
}

export default {
  procesarMensaje,
  AGENTES
};
