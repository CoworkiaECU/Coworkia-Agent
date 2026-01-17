// deteccion-intenciones/orquestador.js
// Aurora Core — Orquestador central del ecosistema Coworkia

import { AURORA } from './aurora.js';
import { ALUNA } from './aluna.js';
import { ADRIANA } from './adriana.js';
import { ENZO } from './enzo.js';
import { ANGELA } from './angela.js';
import { AXEL } from './axel.js';
import { GABI } from './gabi.js';
import { PAULA } from './paula.js';
import { detectarIntencion } from './detectar-intencion.js';
import { loggers } from '../utils/logger.js';

/**
 * Detecta si Paula recibe mensaje fuera de su scope (bienes raíces)
 * @param {string} mensaje - Mensaje del usuario
 * @returns {Object|null} - { service, targetAgent } o null
 */
function detectPaulaOutOfScope(mensaje) {
  const text = mensaje.toLowerCase();
  
  // 1. Coworkia / Aurora keywords (espacios de trabajo)
  const coworkiaRegex = /\b(coworkia|coworking|hot\s*desk|day\s*pass|sala.*reuni[oó]n|oficina.*compartida|membres[ií]a.*coworking|espacio.*trabajo|workspace|reserva.*sala|hot.*desk)\b/i;
  if (coworkiaRegex.test(text)) {
    return { service: 'coworkia', targetAgent: 'AURORA' };
  }
  
  // 2. Seguros / Adriana keywords
  const segurosRegex = /\b(seguro|poliza|póliza|asegurar|cobertura|cotizaci[oó]n.*seguro|segpopular|bmi|aig|chubb|sweaden|seguro.*vehic|seguro.*vida)\b/i;
  if (segurosRegex.test(text)) {
    return { service: 'seguros', targetAgent: 'ADRIANA' };
  }
  
  // 3. Marketing / Enzo keywords
  const marketingRegex = /\b(marketing|publicidad|redes.*sociales|social.*media|campa[ñn]a|estrategia.*digital|marketinglab|seo|sem|contenido.*digital|posicionamiento)\b/i;
  if (marketingRegex.test(text)) {
    return { service: 'marketing', targetAgent: 'ENZO' };
  }
  
  // 4. Salud / Angela keywords
  const saludRegex = /\b(salud|m[eé]dico|doctor|consulta.*m[eé]dica|medicina|bienestar|medbeneficios?|atenci[oó]n.*m[eé]dica)\b/i;
  if (saludRegex.test(text)) {
    return { service: 'salud', targetAgent: 'ANGELA' };
  }
  
  // 5. Reparación vehicular / Axel keywords
  const reparacionRegex = /\b(choque|colisi[oó]n|rayado|abollado|da[ñn]o.*vehicular|da[ñn]o.*carro|reparar.*carro|pintura.*carro|paintbull|taller|enderezada)\b/i;
  if (reparacionRegex.test(text)) {
    return { service: 'reparacion_vehicular', targetAgent: 'AXEL' };
  }
  
  // 6. Legal/Finanzas / Gabi keywords
  const legalRegex = /\b(legal|abogad[oa]|contador|contabilidad|finanzas|impuestos|tributario|uafe|compliance|consulta.*legal|asesor[ií]a.*legal)\b/i;
  if (legalRegex.test(text)) {
    return { service: 'legal_finanzas', targetAgent: 'GABI' };
  }
  
  return null; // No detectó out-of-scope
}

export const AGENTES = {
  AURORA,
  ALUNA,
  ADRIANA,
  ENZO,
  ANGELA,
  AXEL,
  GABI,
  PAULA
};

/**
 * Función unificada para obtener mensajes de handoff entre agentes
 * @param {string} fromAgent - Agente actual (ej: 'AURORA')
 * @param {string} toAgent - Agente destino (ej: 'ANGELA')
 * @param {string} userName - Nombre del usuario
 * @param {string} userLanguage - Idioma preferido ('es', 'en', etc.)
 * @returns {Object} { despedida: string, entrada: string }
 */
export function getHandoffMessages(fromAgent, toAgent, userName = 'amigo', userLanguage = 'es') {
  const agenteActual = AGENTES[fromAgent];
  const nuevoAgente = AGENTES[toAgent];
  
  let mensajeDespedida = null;
  let mensajeEntrada = null;
  
  // 1. MENSAJE DE DESPEDIDA del agente actual
  
  // Caso especial: Aurora tiene mensajes específicos por agente destino
  if (fromAgent === 'AURORA' && typeof agenteActual?.getHandover === 'function') {
    mensajeDespedida = agenteActual.getHandover(toAgent, userName);
  }
  
  // Si no hay mensaje específico, usar mensaje genérico del agente actual
  if (!mensajeDespedida) {
    if (typeof agenteActual?.getHandover === 'function') {
      const handoverData = agenteActual.getHandover(userLanguage);
      mensajeDespedida = handoverData?.llamado?.replace(/{nombre}/g, userName);
    } else if (agenteActual?.handover?.llamado) {
      mensajeDespedida = agenteActual.handover.llamado.replace(/{nombre}/g, userName);
    }
  }
  
  // Fallback genérico para despedida
  if (!mensajeDespedida) {
    mensajeDespedida = `${userName}, te conecto con ${nuevoAgente?.nombre || toAgent}.`;
  }
  
  // 2. MENSAJE DE ENTRADA del nuevo agente
  
  if (typeof nuevoAgente?.getMensajes === 'function') {
    const mensajes = nuevoAgente.getMensajes(userLanguage);
    mensajeEntrada = mensajes?.entrada?.replace(/{nombre}/g, userName);
  } else if (nuevoAgente?.mensajes?.entrada) {
    mensajeEntrada = nuevoAgente.mensajes.entrada.replace(/{nombre}/g, userName);
  }
  
  // Fallback genérico para entrada
  if (!mensajeEntrada) {
    mensajeEntrada = `¡Hola ${userName}! Soy ${nuevoAgente?.nombre || toAgent}. ¿En qué puedo ayudarte?`;
  }
  
  return {
    despedida: mensajeDespedida,
    entrada: mensajeEntrada
  };
}

/**
 * Aurora Core decide TODO.
 */
export async function procesarMensaje(mensaje, perfil = {}, historial = [], formData = {}) {
  const startTime = Date.now();
  const activeAgent = perfil.activeAgent || 'AURORA';
  const userId = perfil.userId || 'unknown';

  loggers.orquestador.userMessage(userId, activeAgent, mensaje);

  // 1. Detectar intención
  const intent = detectarIntencion(mensaje, activeAgent);
  loggers.orquestador.debug('Intención detectada', { userId, agent: activeAgent, intent: intent.type });

  // � DETECCIÓN OUT-OF-SCOPE: Si agente especializado detecta keywords de otros servicios
  if (activeAgent === 'PAULA') {
    const outOfScope = detectPaulaOutOfScope(mensaje);
    if (outOfScope) {
      console.log('[ORQUESTADOR] 🔀 Paula detectó out-of-scope:', outOfScope.service, '→', outOfScope.targetAgent);
      intent.agent = outOfScope.targetAgent;
      intent.reason = `paula_handoff_to_${outOfScope.service}`;
      intent.flags = { 
        ...intent.flags, 
        agentHandoff: true, 
        fromAgent: activeAgent, 
        targetAgent: outOfScope.targetAgent,
        outOfScope: true 
      };
    }
  }

  // �🗑️ MANEJO DE CANCELACIÓN: Si el usuario quiere cancelar, ejecutar limpieza automática
  if (intent.flags?.cancelacion) {
    console.log('[ORQUESTADOR] 🗑️ Cancelación detectada - Limpiando reservas pendientes');
    try {
      const { cancelUserPendingReservations } = await import('../servicios/calendario.js');
      const cancelResult = await cancelUserPendingReservations(userId);
      
      // Agregar información de cancelación al contexto
      intent.cancelacionResult = cancelResult;
      console.log('[ORQUESTADOR] ✅ Limpieza completada:', cancelResult);
    } catch (error) {
      console.error('[ORQUESTADOR] ❌ Error en limpieza de cancelación:', error);
      intent.cancelacionError = error.message;
    }
  }

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
  
  if (isHandoff) {
    loggers.orquestador.handoff(activeAgent, targetAgent, userId, intent.reason);
  }

  // 4. Construir contexto reducido (Aurora filtra según agente)
  const contexto = construirContexto(perfil, historial, formData, handoffContext, targetAgent, intent);

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
      ? agente.getSystemPrompt(perfil.freeTrialUsed || false, perfil.preferredLanguage || 'es')
      : agente.systemPrompt;

  const duration = Date.now() - startTime;
  loggers.orquestador.timing('procesarMensaje', duration, { userId, agent: targetAgent, isHandoff });

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
 * 🎯 ARQUITECTURA: Solo AURORA y ALUNA reciben contexto de reservas.
 * Otros agentes (Enzo, Angela, etc) operan sin contaminar con datos de coworking.
 */
function construirContexto(perfil = {}, historial = [], formData = {}, handoffContext = null, targetAgent = 'AURORA', intent = null) {
  const lineas = [];

  lineas.push(`USUARIO: ${perfil.name || 'Cliente'}`);
  if (perfil.email) lineas.push(`Email: ${perfil.email}`);

  // 🗑️ CANCELACIÓN: Si el usuario pidió cancelar, informar el resultado
  if (intent?.flags?.cancelacion && intent?.cancelacionResult) {
    const result = intent.cancelacionResult;
    lineas.push('\n🗑️ CANCELACIÓN SOLICITADA:');
    if (result.success) {
      lineas.push(`✅ Se cancelaron ${result.cancelledCount} reserva(s) pendiente(s)`);
      if (result.cancelledCount > 0) {
        lineas.push('📋 El sistema está limpio y disponible para nuevas reservas');
      } else {
        lineas.push('ℹ️ No había reservas pendientes por cancelar');
      }
    } else {
      lineas.push(`❌ Error: ${result.error}`);
    }
    lineas.push('\n💬 INSTRUCCIÓN: Confirma al usuario que su solicitud fue procesada y pregunta si desea hacer algo más.');
  }

  if (perfil.upcomingReservations?.length) {
    lineas.push(`Reservas futuras: ${perfil.upcomingReservations.length}`);
  }

  // 🔒 AISLAMIENTO: Solo agentes de coworking reciben contexto de reservas
  const isCoworkingAgent = ['AURORA', 'ALUNA'].includes(targetAgent);
  
  // 🔄 RETORNO A AURORA: Si viene de otro agente y tiene reserva pendiente, marcar para retomar
  const isReturningToAurora = targetAgent === 'AURORA' && 
                              handoffContext && 
                              handoffContext.fromAgent !== 'AURORA' &&
                              handoffContext.fromAgent !== 'ALUNA';
  
  if (isReturningToAurora && formData?.form && !formData.form.isComplete()) {
    lineas.push('\n🔄 USUARIO REGRESA CON RESERVA PENDIENTE:');
    
    const form = formData.form;
    const captured = [];
    
    if (form.spaceType) captured.push(form.spaceType === 'hotDesk' ? 'Hot Desk' : 'Sala Reuniones');
    if (form.date) captured.push(`fecha: ${form.date}`);
    if (form.time) captured.push(`hora: ${form.time}`);
    if (form.email) captured.push(`email: ${form.email}`);
    
    if (captured.length > 0) {
      lineas.push(`📋 Datos ya capturados: ${captured.join(', ')}`);
    }
    
    const missing = form.getMissingFields();
    if (missing.length > 0) {
      lineas.push(`❌ Falta: ${missing.join(', ')}`);
    }
    
    lineas.push('\n⚠️ ACCIÓN: Ya se le mostró un resumen de su reserva pendiente.');
    lineas.push('Si el usuario quiere continuar, procede con las preguntas faltantes.');
    lineas.push('Si quiere cambiar algo, actualiza los datos según indique.');
  }
  
  if (isCoworkingAgent && formData?.summary) {
    lineas.push(`Reserva en proceso: ${formData.summary}`);
  }
  
  // 📋 FORMULARIO DE RESERVA: Solo para Aurora/Aluna
  if (isCoworkingAgent && formData?.form) {
    const form = formData.form;
    const completed = [];
    const missing = [];
    
    // Analizar qué campos están completos y cuáles faltan
    if (form.spaceType) {
      const spaceLabel = form.spaceType === 'hotDesk' ? 'Hot Desk' : 'Sala Reuniones';
      completed.push(`tipo (${spaceLabel})`);
    } else {
      missing.push('tipo de espacio');
    }
    
    if (form.date) {
      completed.push(`fecha (${form.date})`);
    } else {
      missing.push('fecha');
    }
    
    if (form.time) {
      completed.push(`hora (${form.time})`);
    } else {
      missing.push('hora');
    }
    
    if (form.email) {
      completed.push(`email (${form.email})`);
    } else {
      missing.push('email');
    }
    
    if (form.numPeople && form.numPeople > 1) {
      completed.push(`personas (${form.numPeople})`);
    }
    
    // Construir mensaje informativo
    lineas.push('\n📋 FORMULARIO DE RESERVA EN PROCESO:');
    
    if (completed.length > 0) {
      lineas.push(`✅ Ya capturado: ${completed.join(', ')}`);
    }
    
    if (missing.length > 0) {
      lineas.push(`❌ Falta: ${missing.join(', ')}`);
      
      // Instrucción explícita para evitar preguntas redundantes
      const completedFields = completed.map(c => c.split('(')[0].trim());
      lineas.push(`\n⚠️ CRÍTICO: NO preguntes por ${completedFields.join(', ')}. Solo pregunta lo faltante: ${missing.join(', ')}`);
    } else {
      lineas.push('✅ Formulario completo - listo para confirmación');
    }
  }
  
  // 🤝 CONTEXTO DE HANDOFF: Info crucial para continuidad conversacional
  if (handoffContext) {
    lineas.push('\n🤝 CONTEXTO DE TRANSFERENCIA:');
    lineas.push(`De: ${handoffContext.fromAgent}`);
    lineas.push(`Motivo: ${handoffContext.reason}`);
    lineas.push(`Mensaje que disparó handoff: "${handoffContext.userMessage}"`);
    
    // 🔒 NOTA: No pasamos datos de reserva a agentes externos
    // Aurora mantiene el formulario pendiente para retomar después
    if (!isCoworkingAgent && handoffContext.fromAgent === 'AURORA') {
      lineas.push('\n📝 NOTA: Aurora mantendrá cualquier reserva pendiente para cuando el usuario regrese.');
    }
    
    lineas.push('\n⚠️ IMPORTANTE: El usuario ya mencionó su necesidad. NO preguntes nuevamente lo que ya dijo.');
  }

  // 💬 MEMORIA CONVERSACIONAL: Últimos 7-8 intercambios (hasta 15 mensajes)
  // Ampliado para mejor contexto en ecosistema multi-agente con handoffs
  if (historial.length > 0) {
    // Tomar últimos 15 mensajes (7-8 intercambios completos)
    const ultimos = historial.slice(-15);
    
    lineas.push('\n💬 CONVERSACIÓN RECIENTE:');
    
    ultimos.forEach((m, idx) => {
      const isUser = m.role === 'user';
      const speaker = isUser ? '👤 Usuario' : `🤖 ${m.agent || 'Asistente'}`;
      const prefix = isUser ? '' : '   '; // Indentar respuestas del asistente
      
      // Truncar mensajes muy largos (>150 chars) para optimizar tokens
      let content = m.content || '';
      if (content.length > 150) {
        content = content.substring(0, 147) + '...';
      }
      
      lineas.push(`${prefix}${speaker}: ${content}`);
    });
    
    lineas.push('\n📌 Usa esta conversación para contexto, pero NO repitas información que el usuario ya dio.');
  }

  return lineas.join('\n');
}

export default {
  procesarMensaje,
  AGENTES
};
