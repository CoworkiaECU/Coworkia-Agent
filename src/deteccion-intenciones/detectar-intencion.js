// Detector de intenciones: decide a qué agente activar según el mensaje del usuario.
// REGLA V2: 
// - AURORA ↔ ALUNA: Detección automática mediante keywords (natural)
// - Otros agentes: Solo @menciones explícitas
//
// ⚠️ LEGACY FILE - En proceso de deprecación
// Las detecciones comunes fueron movidas a intent-detection-helpers.js
// Este archivo mantiene solo la lógica de routing de agentes por compatibilidad

import { 
  detectarCancelacion as detectarCancelacionHelper,
  detectarSaludoCasual as detectarSaludoCasualHelper,
  detectarPreguntaIdentidad as detectarPreguntaIdentidadHelper,
  detectarSolicitudRecibo as detectarSolicitudReciboHelper,
  detectarSaludoConInteresServicio as detectarSaludoConInteresServicioHelper,
  detectVirtualAgentSalesPromo as detectVirtualAgentSalesPromoHelper,
  isEmailAddress
} from './intent-detection-helpers.js';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// KEYWORDS ESPECIALIZADAS (Aurora/Aluna/Paula)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// Keywords AURORA ↔ ALUNA (detección automática natural)
const ALUNA_KEYWORDS = [
  'membresía', 'membresias', 'membresías', 'membresia', 'plan mensual', 'planes mensuales',
  'plan 10', 'plan10', 'plan 20', 'plan20',
  'oficina virtual', 'virtual office', 'sala reuniones', 'meeting room'
];

const AURORA_KEYWORDS = [
  'hot desk', 'day pass', 'día gratis', 'dia gratis',
  'reserva', 'reservar', 'sala', 'reunión', 'reunion',
  'pagar', 'pago', 'transferencia', 'tarjeta', 'payphone',
  // Sinónimos de Hot Desk — evitar que vayan a Aluna por error (A3)
  'espacio individual', 'espacio de trabajo', 'puesto individual',
  'puesto de trabajo', 'espacio compartido', 'escritorio compartido',
  'escritorio individual', 'lugar de trabajo', 'sitio de trabajo'
];

// Keywords Paula: Requiere PROPERTY keywords (obligatorio) + LOCATION opcional
const PAULA_PROPERTY_KEYWORDS = [
  'bienes raices', 'bienes raíces', 'inmobiliaria', 'propiedad', 'propiedades',
  'casa', 'departamento', 'apartamento', 'villa', 'terreno',
  'comprar casa', 'vender casa', 'busco casa', 'busco departamento',
  'inversion inmobiliaria', 'inversión inmobiliaria', 'compra propiedad',
  'ECU-001', 'ECU-002', 'DOM-001', 'DOM-002'
];

const PAULA_LOCATION_KEYWORDS = [
  'ecuador', 'quito', 'guayaquil', 'cuenca', 'cumbaya', 'la pradera',
  'republica dominicana', 'república dominicana', 'punta cana', 'santo domingo'
];

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PATTERNS ESPECIALIZADOS (Aurora contextos)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const PAYMENT_LINK_REQUEST_PATTERNS = [
  /link.*pago/,
  /enlace.*pago/,
  /dame.*link/,
  /envia.*link/,
  /envia.*link/,
  /me.*das.*link/,
  /como.*pago/,
  /como.*pago/,
  /donde.*pago/,
  /donde.*pago/,
  /quiero.*pagar/,
  /necesito.*pagar/
];

const POST_EMAIL_SUPPORT_PATTERNS = [
  /recibi.*correo.*dud/,
  /recibi.*confirmacion/,
  /confirmacion.*dud/,
  /enlace.*confirmacion/,
  /link.*confirmacion/,
  /detalles.*reserva/,
  /mi\s+reserva/,
  /tengo\s+dud/,
  /dud.*reserva/,
  /info.*reserva/,
  /hora.*llegada/
];

const MODIFICACION_RESERVA_PATTERNS = [
  /cambiar.*hora/,
  /cambiar.*fecha/,
  /cambiar.*dia/,
  /cambiar.*dia/,
  /modificar.*reserva/,
  /modificar.*la/,
  /corrige.*la/,
  /corregir.*la/,
  /corrige.*para/,
  /corregir.*para/,
  /ajusta.*hora/,
  /ajustar.*hora/,
  /reprograma/,
  /reprogramar/,
  /reagenda/,
  /reagendar/,
  /mueve.*la/,
  /mover.*la/,
  /te\s+equivocaste/,
  /esta.*mal/,
  /esta.*mal/,
  /no.*es.*esa.*hora/,
  /otra.*hora/,
  /error.*hora/,
  /error.*fecha/,
  /mal.*hora/,
  /mal.*fecha/
];

// Keywords de colisión/daño vehicular para AXEL
const AXEL_COLLISION_KEYWORDS = [
  'choque', 'chocar', 'chocaron', 'accidente', 'colision', 'colisión',
  'abolladura', 'abollado', 'golpe', 'parachoques', 'paragolpes', 'fender',
  'latonería', 'pintura', 'pintar', 'reparar carro', 'reparar auto', 'enderezar',
  'cotizar daño', 'costo reparar', 'cotizacion carro', 'cotizacion auto', 'rayon', 'raspon'
];

const AXEL_DATA_KEYWORDS = [
  'marca', 'modelo', 'ano', 'año', 'email', 'correo', 'mail', 'nombre'
];

const AXEL_PHOTO_KEYWORDS = [
  'foto', 'fotos', 'imagen', 'imagenes', 'imágenes', 'envié foto', 'subi foto', 'subí foto'
];

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// RE-EXPORTS - Mantener compatibilidad con código existente
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Estas funciones ahora viven en intent-detection-helpers.js
// Los re-exports mantienen compatibilidad con imports existentes

export const detectarCancelacion = detectarCancelacionHelper;
export const detectarSaludoCasual = detectarSaludoCasualHelper;
export const detectarPreguntaIdentidad = detectarPreguntaIdentidadHelper;
export const detectarSolicitudRecibo = detectarSolicitudReciboHelper;
export const detectarSaludoConInteresServicio = detectarSaludoConInteresServicioHelper;
export const detectVirtualAgentSalesPromo = detectVirtualAgentSalesPromoHelper;

/**
 * Detecta intención y agente apropiado
 * IMPORTANTE: Esta función solo detecta CAMBIOS EXPLÍCITOS de agente
 * El orquestador es responsable de respetar el activeAgent si no hay cambio
 * 
 * @param {string} inputRaw - Mensaje del usuario
 * @param {string} currentAgent - Agente actualmente activo (para contexto)
 * @param {object} context - Contexto adicional (ej: hasActiveForm)
 * @returns {object} { agent, reason, flags }
 */
export function detectarIntencion(inputRaw = '', currentAgent = 'AURORA', context = {}) {
  const text = String(inputRaw || '').toLowerCase().trim();
  const normalized = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  
  // 🛡️ PROTECCIÓN: Si es un email, NO detectar intenciones implícitas
  // Evita que emails como "segpopular.ec@icloud.com" activen agente de seguros
  const isEmail = /@[a-z0-9.-]+\.[a-z]{2,}/i.test(text);
  if (isEmail) {
    return {
      agent: currentAgent,
      reason: 'email address - skip implicit detection',
      flags: { skipImplicitDetection: true }
    };
  }

  const isPostEmailSupport = POST_EMAIL_SUPPORT_PATTERNS.some(pattern => pattern.test(normalized));
  const isModificacionReserva = MODIFICACION_RESERVA_PATTERNS.some(pattern => pattern.test(normalized));
  const isCancelacion = detectarCancelacion(normalized);
  
  // ⚠️ IMPORTANTE: isCasualGreeting e isIdentityQuestion se evalúan DESPUÉS de @menciones
  // para que las @menciones explícitas tengan prioridad sobre saludos
  const isCasualGreeting = detectarSaludoCasual(normalized);
  const isIdentityQuestion = detectarPreguntaIdentidad(normalized);
  
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 1) CAMBIOS EXPLÍCITOS DE AGENTE (con @código)
  // ⚡ PRIORIDAD ABSOLUTA - @menciones SIEMPRE tienen máxima prioridad
  // 🛡️ PROTECCIÓN: Ignorar @menciones en EJEMPLOS de Aurora
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const isAuroraExample = text.includes('Ejemplo:') || text.includes('ejemplo:');
  
  if (!isAuroraExample) {
    // Solo detectar @menciones si NO es un ejemplo explicativo
    
    if (/@enzo/i.test(text)) {
      return { agent: 'ENZO', reason: 'trigger @Enzo', flags: { agentHandoff: true, fromAgent: currentAgent, targetAgent: 'ENZO' } };
    }

    if (/@adriana/i.test(text)) {
      return { agent: 'ADRIANA', reason: 'trigger @Adriana', flags: { agentHandoff: true, fromAgent: currentAgent, targetAgent: 'ADRIANA' } };
    }

    if (/@[áa]ngela/i.test(text)) {
      return { agent: 'ANGELA', reason: 'trigger @Ángela', flags: { agentHandoff: true, fromAgent: currentAgent, targetAgent: 'ANGELA' } };
    }

    if (/@axel/i.test(text)) {
      return { agent: 'AXEL', reason: 'trigger @Axel', flags: { agentHandoff: true, fromAgent: currentAgent, targetAgent: 'AXEL', axelPhotoInstructions: true } };
    }

    if (/@gabi/i.test(text)) {
      return { agent: 'GABI', reason: 'trigger @Gabi', flags: { agentHandoff: true, fromAgent: currentAgent, targetAgent: 'GABI' } };
    }

    if (/@paula/i.test(text)) {
      return { agent: 'PAULA', reason: 'trigger @Paula', flags: { agentHandoff: true, fromAgent: currentAgent, targetAgent: 'PAULA' } };
    }

    if (/@aluna/i.test(text)) {
      return { agent: 'ALUNA', reason: 'trigger @Aluna', flags: { agentHandoff: true, fromAgent: currentAgent, targetAgent: 'ALUNA' } };
    }

    if (/@aurora/i.test(text)) {
      return { agent: 'AURORA', reason: 'trigger @Aurora - retorno desde otro agente', flags: { agentHandoff: true, fromAgent: currentAgent, targetAgent: 'AURORA', returningToAurora: true } };
    }
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 2) DETECCIONES ESPECIALES - Evaluadas después de @menciones
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  
  // 2.1) Saludo con interés explícito en servicio
  const isSaludoConInteres = detectarSaludoConInteresServicio(text);
  
  if (isSaludoConInteres) {
    return {
      agent: currentAgent, // Mantener Aurora
      reason: 'greeting with service interest - present coworking spaces',
      flags: { 
        serviceInterest: true,
        requiresAurora: true,
        skipOtherAgents: true
      }
    };
  }
  
  // 2.2) Detectar mensaje promocional de venta de agentes virtuales
  const virtualAgentPromo = detectVirtualAgentSalesPromo(text);
  
  if (virtualAgentPromo.detected) {
    return {
      agent: 'AURORA',
      reason: 'virtual agent sales promotion - MarketingLab OneMind',
      flags: { 
        virtualAgentSalesPromo: true, 
        requiresAurora: true,
        skipDefaultGreeting: true,
        requiresSpecialResponse: true,
        confidence: virtualAgentPromo.confidence,
        detectionScore: virtualAgentPromo.score,
        detectionReasons: virtualAgentPromo.reasons
      }
    };
  }
  
  // 2.3) Cancelación detectada - mantener agente actual pero marcar flag
  if (isCancelacion) {
    // 🟡 Caso especial: mensaje "ya no... mejor cuéntame de las membresías" debe pasar a Aluna
    if (ALUNA_KEYWORDS.some(k => text.includes(k))) {
      return {
        agent: 'ALUNA',
        reason: 'frustrated_user_pivots_to_memberships',
        flags: { 
          cancelacion: true, 
          agentHandoff: true, // 🔥 FIX: Activar handoff para transición fluida
          suggestedAgent: 'ALUNA',
          fromAgent: currentAgent,
          targetAgent: 'ALUNA'
        }
      };
    }

    return {
      agent: currentAgent, // Mantener agente actual
      reason: 'user cancellation request',
      flags: { cancelacion: true }
    };
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 3) SALUDOS Y PREGUNTAS DE IDENTIDAD
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  
  // 3.1) Saludo casual detectado - mantener agente actual pero marcar flag
  // EXCEPCIÓN: Si el saludo incluye keywords de Aluna ("hola, info de membresías?"),
  // NO tratar como casual greeting — dejar caer al bloque de keywords de Aluna.
  const hasAlunaKeywordInGreeting = ALUNA_KEYWORDS.some(k => text.includes(k));
  if (isCasualGreeting && !hasAlunaKeywordInGreeting) {
    return {
      agent: currentAgent, // Mantener agente actual
      reason: 'casual greeting - no services offered',
      flags: { casualGreeting: true }
    };
  }

  // 3.2) Pregunta de identidad detectada - mantener agente actual pero marcar flag
  if (isIdentityQuestion) {
    return {
      agent: currentAgent, // Mantener agente actual
      reason: 'identity question - ecosystem presentation only',
      flags: { identityQuestion: true }
    };
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 4) CONTEXTOS ESPECIALES que requieren Aurora
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Solo para casos donde Aurora DEBE intervenir
  // NOTA V2: Handoffs implícitos ELIMINADOS. Solo @menciones explícitas cambian agente.
  
  // 4.1) Modificación de reserva existente
  if (isModificacionReserva) {
    return {
      agent: 'AURORA',
      reason: 'modification of existing reservation',
      flags: { modificacionReserva: true, postEmailSupport: true, requiresAurora: true }
    };
  }

  // 4.2) Usuario pide link de pago
  const isPaymentLinkRequest = PAYMENT_LINK_REQUEST_PATTERNS.some(pattern => pattern.test(normalized));
  if (isPaymentLinkRequest) {
    return {
      agent: 'AURORA',
      reason: 'payment link request for confirmed reservation',
      flags: { paymentLinkRequest: true, requiresAurora: true }
    };
  }

  // 4.3) Usuario llega desde enlace del correo post-confirmación
  if (isPostEmailSupport) {
    return {
      agent: 'AURORA',
      reason: 'post-email support link',
      flags: { postEmailSupport: true, requiresAurora: true }
    };
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 5) STICKY AGENTS: Una vez activo un agente especializado,
  //    se MANTIENE hasta comando @nombreagente explícito
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // REGLA: Solo @menciones explícitas cambian agentes especializados
  // BENEFICIO: Conversaciones no se interrumpen por keywords accidentales
  
  const SPECIALIZED_AGENTS = ['ALUNA', 'ADRIANA', 'ENZO', 'ANGELA', 'AXEL', 'GABI', 'PAULA'];

  // 5.0) Si AXEL está activo, seguir detectando señales relevantes sin cambiar de agente
  if (currentAgent === 'AXEL') {
    const hasCollisionIntent = AXEL_COLLISION_KEYWORDS.some(k => normalized.includes(k));
    const hasDataIntent = AXEL_DATA_KEYWORDS.some(k => normalized.includes(k));
    const hasPhotoIntent = AXEL_PHOTO_KEYWORDS.some(k => normalized.includes(k));

    if (hasCollisionIntent || hasDataIntent || hasPhotoIntent) {
      return {
        agent: 'AXEL',
        reason: 'axel_sticky_intent_detected',
        flags: {
          maintainingActive: true,
          requiresExplicitMention: true,
          axelQuoteIntent: hasCollisionIntent,
          axelDataCompletionIntent: hasDataIntent,
          axelPhotoCompletionIntent: hasPhotoIntent
        }
      };
    }
  }
  
  // 🔒 FIX A7: HANDOFF PROTECTION - funciones helper
  /**
   * Verifica si hay cooldown activo (handoff reciente en últimos 3 mensajes)
   * @returns {boolean} true si debe bloquear handoff
   */
  function shouldBlockDueToCooldown() {
    const lastHandoffCount = context?.perfil?.lastHandoffCount || 0;
    if (lastHandoffCount > 0 && lastHandoffCount <= 3) {
      console.log('[HANDOFF-PROTECTION] 🚫 Cooldown activo - bloqueando handoff (último hace', lastHandoffCount, 'mensajes)');
      return true;
    }
    return false;
  }

  /**
   * Verifica si hay formulario activo con >2 campos llenos
   * @returns {boolean} true si debe bloquear handoff
   */
  function shouldBlockDueToActiveForm() {
    const formData = context?.formData;
    if (!formData) return false;
    
    // Contar campos llenos en el formulario
    const filledFields = [
      formData.spaceType, formData.date, formData.time,
      formData.email, formData.numPeople, formData.durationHours
    ].filter(Boolean).length;
    
    if (filledFields > 2) {
      console.log('[HANDOFF-PROTECTION] 🚫 Formulario activo con', filledFields, 'campos - bloqueando handoff');
      return true;
    }
    return false;
  }
  
  // 5.0c) Si ALUNA está activa: detectar keywords Aurora → retorno automático
  //       Permite la ida y vuelta natural AURORA ↔ ALUNA sin @mención
  if (currentAgent === 'ALUNA') {
    if (AURORA_KEYWORDS.some(k => text.includes(k))) {
      // 🔒 FIX A7: HANDOFF PROTECTION
      if (shouldBlockDueToCooldown() || shouldBlockDueToActiveForm()) {
        console.log('[DETECT-INTENT] 🚫 Handoff ALUNA→AURORA bloqueado por protección');
        return {
          agent: 'ALUNA',
          reason: 'handoff_blocked_protection',
          flags: { maintainingActive: true, handoffBlocked: true }
        };
      }

      console.log('[DETECT-INTENT] 💡 Aluna detectó tema Aurora - cambiar a AURORA');
      return {
        agent: 'AURORA',
        reason: 'aluna_aurora_keyword_handoff',
        flags: {
          agentHandoff: true,
          suggestedAgent: 'AURORA',
          fromAgent: currentAgent,
          targetAgent: 'AURORA',
          isKeywordMatch: true,
          explicitHandoffMessage: '🔄 Te paso con Aurora para coordinar tu reserva...' // 🎯 FIX A7: Mensaje explícito
        }
      };
    }
  }

  // 5.1) Si agente especializado está activo → MANTENER (sticky)
  if (SPECIALIZED_AGENTS.includes(currentAgent)) {
    console.log(`[DETECT-INTENT] 🔒 Sticky agent activo: ${currentAgent} - MANTENER hasta @mención`);
    return {
      agent: currentAgent,
      reason: 'sticky_agent_active - only @mention changes agent',
      flags: { 
        maintainingActive: true,
        ignoreKeywords: true,
        requiresExplicitMention: true
      }
    };
  }
  
  // 5.2) SOLO si Aurora está activa: detectar keywords para SUGERIR
  //      (Aurora puede detectar temas y escalar a agentes especializados)
  if (currentAgent === 'AURORA') {
    // Detectar keywords Aluna (membresías)
    if (ALUNA_KEYWORDS.some(k => text.includes(k))) {
      // 🔒 FIX A7: HANDOFF PROTECTION
      if (shouldBlockDueToCooldown() || shouldBlockDueToActiveForm()) {
        console.log('[DETECT-INTENT] 🚫 Handoff AURORA→ALUNA bloqueado por protección');
        return {
          agent: 'AURORA',
          reason: 'handoff_blocked_protection',
          flags: { maintainingActive: true, handoffBlocked: true }
        };
      }

      console.log('[DETECT-INTENT] 💡 Aurora detectó tema Aluna - cambiar a ALUNA');
      return { 
        agent: 'ALUNA',
        reason: 'aurora_aluna_keyword_handoff',
        flags: { 
          agentHandoff: true, // 🔥 FIX: Activar handoff para que Aluna envíe mensaje de entrada
          suggestedAgent: 'ALUNA',
          fromAgent: currentAgent,
          targetAgent: 'ALUNA',
          isKeywordMatch: true,
          explicitHandoffMessage: '🔄 Te paso con Aluna para info sobre membresías...' // 🎯 FIX A7: Mensaje explícito
        }
      };
    }
    
    // Detectar keywords Aurora (reservas/pagos) - confirmar que es tema correcto
    if (AURORA_KEYWORDS.some(k => text.includes(k))) {
      return { 
        agent: 'AURORA', 
        reason: 'aurora_keyword_confirmed',
        flags: { confirmedAurora: true, isKeywordMatch: true }
      };
    }
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 6) FALLBACK: MANTENER agente actual
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Sin keywords detectadas ni comandos especiales → mantener agente
  return { 
    agent: currentAgent, 
    reason: 'maintaining_active_agent',
    flags: { maintainingActive: true }
  };
}
