// Detector de intenciones: decide a qué agente activar según el mensaje del usuario.
// Reglas:
// - Aurora (por defecto): info, reservas, Hot Desk 1, cobros unitarios.
// - Aluna: membresías/planes mensuales (Plan 10, Plan 20, oficina virtual).
// - Adriana: solo con @Adriana explícito (seguros Segpopular).
// - Enzo: solo si el usuario menciona @Enzo (experto en marketing/IA/ventas).

const ALUNA_KEYWORDS = [
  'membresía', 'membresia', 'plan mensual', 'planes',
  'plan 10', 'plan10', 'plan 20', 'plan20',
  'oficina virtual', 'virtual office', 'sala reuniones', 'meeting room'
];

const AURORA_KEYWORDS = [
  'hot desk', 'day pass', 'día gratis', 'dia gratis',
  'reserva', 'reservar', 'sala', 'reunión', 'reunion',
  'pagar', 'pago', 'transferencia', 'tarjeta', 'payphone'
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

const CANCELACION_PATTERNS = [
  /^cancela$/,
  /^cancelar$/,
  /^cancel$/,
  /cancela.*reserva/,
  /cancelar.*reserva/,
  /ya\s+no\s+quiero/,
  /mejor\s+no/,
  /olvida/,
  /olvidalo/,
  /olvidalo/,
  /dejalo/,
  /dejalo/,
  /no\s+importa/,
  /no\s+sigo/,
  /no\s+continuo/,
  /no\s+continuo/,
  /prefiero\s+no/,
  /no\s+gracias.*ya/,
  /no.*por\s+ahora/,
  /cambio.*de\s+opinion/,
  /cambio.*de\s+opinion/,
  /cambie.*de\s+opinion/,
  /cambie.*de\s+opinion/,
  // Nuevos patrones ampliados
  /^no\s*quiero$/,
  /^no$/,
  /^borra$/,
  /^borrar$/,
  /^elimina$/,
  /^eliminar$/,
  /^descartar$/,
  /^stop$/,
  /^alto$/,
  /ya\s*no/,
  /borra.*todo/,
  /elimina.*todo/,
  /limpia.*todo/
];

// Patrones FLEXIBLES para saludos casuales - detectan el saludo aunque haya otras palabras
const CASUAL_GREETING_PATTERNS = [
  /^hola\b/,  // hola, hola aurora, hola como estas
  /^hi\b/,    // hi, hi there
  /^hello\b/, // hello, hello aurora
  /^hey\b/,   // hey, hey there
  /^buenas\b/, // buenas, buenas tardes aurora
  /^buenos\s+dias\b/,
  /^buenas\s+tardes\b/,
  /^buenas\s+noches\b/,
  /^buen\s+dia\b/,
  /^que\s+tal\b/,     // que tal, que tal como estas
  /^como\s+estas\b/,  // como estas, como estas aurora
  /^como\s+esta\b/,
  /^saludos\b/,
  /^hola\s+de\s+nuevo\b/,
  /^hola\s+otra\s+vez\b/
];

const IDENTITY_QUESTION_PATTERNS = [
  /quien\s+eres/,
  /que\s+eres/,
  /que\s+haces/,
  /que\s+sabes\s+hacer/,
  /que\s+puedes\s+hacer/,
  /dime\s+quien\s+eres/,
  /quiero\s+saber\s+quien\s+eres/,
  /quiero\s+que\s+me\s+digas\s+quien\s+eres/,
  /que\s+me\s+puedes\s+ofrecer/,
  /que\s+servicios\s+tienen/,
  /que\s+servicios\s+ofrecen/,
  /cuales\s+son\s+tus\s+servicios/,
  /que\s+es\s+coworkia/
];

/**
 * Detecta si el usuario quiere cancelar un flujo activo
 * @param {string} text - Mensaje del usuario normalizado
 * @returns {boolean} true si es una cancelación
 */
export function detectarCancelacion(text) {
  const normalized = text.toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return CANCELACION_PATTERNS.some(pattern => pattern.test(normalized));
}

/**
 * Detecta si el mensaje es un saludo casual (hola, buenos días, etc.)
 * @param {string} text - Mensaje del usuario normalizado
 * @returns {boolean} true si es un saludo casual
 */
export function detectarSaludoCasual(text) {
  const normalized = text.toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return CASUAL_GREETING_PATTERNS.some(pattern => pattern.test(normalized));
}

/**
 * Detecta si el usuario está preguntando sobre la identidad/servicios de Aurora
 * @param {string} text - Mensaje del usuario normalizado
 * @returns {boolean} true si es una pregunta de identidad
 */
export function detectarPreguntaIdentidad(text) {
  const normalized = text.toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return IDENTITY_QUESTION_PATTERNS.some(pattern => pattern.test(normalized));
}

/**
 * Detecta si el usuario saluda CON interés explícito en probar servicios
 * Ejemplos: "Hola Coworkia quiero probar", "Buenos días quiero el servicio"
 * @param {string} text - Mensaje del usuario normalizado
 * @returns {boolean} true si es saludo con interés en servicio
 */
export function detectarSaludoConInteresServicio(text) {
  const normalized = text.toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  
  const patterns = [
    /hola.*coworkia.*(quiero|necesito|me interesa)/i,
    /hola.*(quiero|necesito).*(servicio|probar|usar)/i,
    /buenos.*(quiero|necesito).*(servicio|probar)/i,
    /buenas.*(quiero|necesito).*(servicio|probar)/i
  ];
  
  return patterns.some(pattern => pattern.test(normalized));
}

/**
 * 🤖 Detecta si el usuario pregunta por VENTA de agentes virtuales
 * (No info de coworking, sino venta del sistema OneMind)
 * 
 * Usa scoring system con keywords por categorías:
 * - Mención de Aurora/agente virtual (obligatorio)
 * - Pregunta sobre capacidades
 * - Contexto empresarial
 * - Palabras de interés
 * 
 * @param {string} text - Mensaje del usuario
 * @returns {object} { detected: boolean, confidence: number, score: number, reasons: string, reason: string }
 */
export function detectVirtualAgentSalesPromo(text) {
  // Normalizar: quitar signos, lowercase, normalizar acentos
  const normalized = text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // quitar acentos
    .replace(/[¿?¡!,.:;]/g, ' ') // quitar signos de puntuación
    .replace(/\s+/g, ' ') // normalizar espacios múltiples
    .trim();
  
  let score = 0;
  const reasons = [];
  
  // Categoría 1: Mención de Aurora o agente virtual (OBLIGATORIO)
  const mentionKeywords = [
    'aurora',
    'agente virtual',
    'agente como tu',
    'agente como ti',
    'sistema como tu',
    'sistema como ti',
    'bot como este',
    'bot como tu',
    'asistente virtual'
  ];
  
  const hasMention = mentionKeywords.some(k => normalized.includes(k));
  if (hasMention) {
    score += 3;
    reasons.push('mencion_agente');
  } else {
    // Si no menciona agente/aurora, no es venta de sistema
    return { detected: false, confidence: 0, score: 0, reasons: '', reason: 'no_agent_mention' };
  }
  
  // Categoría 2: Pregunta sobre capacidades (alta prioridad)
  const capabilityKeywords = [
    'que puede hacer',
    'que puedes hacer',
    'como funciona',
    'que hace',
    'capacidades',
    'funcionalidades',
    'que ofrece',
    'que ofreces'
  ];
  
  if (capabilityKeywords.some(k => normalized.includes(k))) {
    score += 2;
    reasons.push('pregunta_capacidades');
  }
  
  // Categoría 3: Contexto empresarial
  const businessKeywords = [
    'para mi empresa',
    'para mi negocio',
    'para la empresa',
    'implementar',
    'contratar',
    'adquirir',
    'comprar',
    'sistema para',
    'quiero uno',
    'quiero un sistema',
    'necesito uno'
  ];
  
  if (businessKeywords.some(k => normalized.includes(k))) {
    score += 2;
    reasons.push('contexto_empresarial');
  }
  
  // Categoría 4: Palabras que indican interés en el producto
  const interestKeywords = [
    'me interesa',
    'muestrame',
    'dame informacion',
    'cuentame',
    'explicame',
    'quiero que me digas',
    'quiero conocer'
  ];
  
  if (interestKeywords.some(k => normalized.includes(k))) {
    score += 1;
    reasons.push('interes_producto');
  }
  
  // Decisión: score >= 4 = detectado (mención + contexto adicional significativo)
  const detected = score >= 4;
  const confidence = Math.min(score / 8, 1); // Normalizar 0-1 (máximo posible: 8)
  
  if (detected) {
    console.log(`[VIRTUAL-AGENT-PROMO] ✅ Detectado (score: ${score}/8, confidence: ${(confidence * 100).toFixed(0)}%, reasons: ${reasons.join(', ')})`);
  } else {
    console.log(`[VIRTUAL-AGENT-PROMO] ❌ No detectado (score: ${score}/8, insuficiente)`);
  }
  
  return {
    detected,
    confidence,
    score,
    reasons: reasons.join(', '),
    reason: detected ? 'virtual_agent_sales_detected' : 'insufficient_score'
  };
}

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
  const isCasualGreeting = detectarSaludoCasual(normalized);
  const isIdentityQuestion = detectarPreguntaIdentidad(normalized);
  
  // 0.5) Saludo con interés explícito en servicio - Aurora presenta coworking SOLO
  const isSaludoConInteres = detectarSaludoConInteresServicio(text);
  
  if (isSaludoConInteres) {
    return {
      agent: currentAgent, // Mantener Aurora
      reason: 'greeting with service interest - present coworking spaces',
      flags: { 
        serviceInterest: true,
        requiresAurora: true,
        skipOtherAgents: true // No mencionar otros agentes en respuesta
      }
    };
  }
  
  // 🤖 Detectar mensaje promocional de venta de agentes virtuales
  const virtualAgentPromo = detectVirtualAgentSalesPromo(text);
  
  // 0) PROMOCIÓN: Venta de sistema de agentes virtuales
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
  
  // 0) Cancelación detectada - mantener agente actual pero marcar flag
  if (isCancelacion) {
    return {
      agent: currentAgent, // Mantener agente actual
      reason: 'user cancellation request',
      flags: { cancelacion: true }
    };
  }

  // 0.5) Saludo casual detectado - mantener agente actual pero marcar flag
  if (isCasualGreeting) {
    return {
      agent: currentAgent, // Mantener agente actual
      reason: 'casual greeting - no services offered',
      flags: { casualGreeting: true }
    };
  }

  // 0.6) Pregunta de identidad detectada - mantener agente actual pero marcar flag
  if (isIdentityQuestion) {
    return {
      agent: currentAgent, // Mantener agente actual
      reason: 'identity question - ecosystem presentation only',
      flags: { identityQuestion: true }
    };
  }

  // 1) CAMBIOS EXPLÍCITOS DE AGENTE (con @código)
  // 🛡️ PROTECCIÓN: Ignorar @menciones en EJEMPLOS de Aurora (mensajes que contienen "Ejemplo:")
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
      return { agent: 'AXEL', reason: 'trigger @Axel', flags: { agentHandoff: true, fromAgent: currentAgent, targetAgent: 'AXEL' } };
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

  // 2) CONTEXTOS ESPECIALES que requieren Aurora (independiente del agente activo)
  // Solo para casos donde Aurora DEBE intervenir
  
  // 2.5) 🔄 MODIFICACIÓN DE RESERVA EXISTENTE
  if (isModificacionReserva) {
    return {
      agent: 'AURORA',
      reason: 'modification of existing reservation',
      flags: { modificacionReserva: true, postEmailSupport: true, requiresAurora: true }
    };
  }

  // 2.6) 💳 Usuario pide link de pago
  const isPaymentLinkRequest = PAYMENT_LINK_REQUEST_PATTERNS.some(pattern => pattern.test(normalized));
  if (isPaymentLinkRequest) {
    return {
      agent: 'AURORA',
      reason: 'payment link request for confirmed reservation',
      flags: { paymentLinkRequest: true, requiresAurora: true }
    };
  }

  // 2.7) Usuario llega desde enlace del correo post-confirmación
  if (isPostEmailSupport) {
    return {
      agent: 'AURORA',
      reason: 'post-email support link',
      flags: { postEmailSupport: true, requiresAurora: true }
    };
  }

  // 3) HANDOFFS IMPLÍCITOS: Keywords que activan cambio de agente automáticamente
  // Estos son más fuertes que keywords sugeridos - fuerzan el handoff
  
  // Angela (Salud)
  const angelaKeywords = [
    'salud', 'medico', 'médico', 'doctor', 'consulta medica', 'medicina',
    'bienestar', 'seguro medico', 'seguro médico', 'atencion medica',
    'atención médica', 'empresa de salud', 'medbeneficio', 'angela'
  ];
  
  if (angelaKeywords.some(k => text.includes(k))) {
    return {
      agent: 'ANGELA',
      reason: 'implicit health keywords - handoff to Angela',
      flags: { agentHandoff: true, fromAgent: currentAgent, targetAgent: 'ANGELA', implicitHandoff: true }
    };
  }
  
  // Adriana (Seguros)
  const adrianaKeywords = [
    'seguro', 'poliza', 'póliza', 'aseguradora', 'asegurar',
    'cobertura', 'cotizacion seguro', 'cotización seguro', 'segpopular',
    'insurance', 'adriana'
  ];
  
  if (adrianaKeywords.some(k => text.includes(k))) {
    return {
      agent: 'ADRIANA',
      reason: 'implicit insurance keywords - handoff to Adriana',
      flags: { agentHandoff: true, fromAgent: currentAgent, targetAgent: 'ADRIANA', implicitHandoff: true }
    };
  }
  
  // Enzo (Marketing)
  const enzoKeywords = [
    'marketing', 'publicidad', 'redes sociales', 'social media',
    'campana', 'campaña', 'estrategia digital', 'marketinglab',
    'contenido digital', 'posicionamiento', 'seo', 'enzo'
  ];
  
  if (enzoKeywords.some(k => text.includes(k))) {
    return {
      agent: 'ENZO',
      reason: 'implicit marketing keywords - handoff to Enzo',
      flags: { agentHandoff: true, fromAgent: currentAgent, targetAgent: 'ENZO', implicitHandoff: true }
    };
  }
  
  // Axel (Reparación vehicular)
  const axelKeywords = [
    'choque', 'colision', 'colisión', 'rayado', 'abollado', 'golpe carro',
    'daño vehicular', 'daño auto', 'reparar carro', 'pintura carro',
    'paintbull', 'taller', 'axel'
  ];
  
  if (axelKeywords.some(k => text.includes(k))) {
    return {
      agent: 'AXEL',
      reason: 'implicit vehicle repair keywords - handoff to Axel',
      flags: { agentHandoff: true, fromAgent: currentAgent, targetAgent: 'AXEL', implicitHandoff: true }
    };
  }
  
  // Gabi (Legal/Finanzas)
  const gabiKeywords = [
    'legal', 'abogado', 'abogada', 'contador', 'contabilidad',
    'finanzas', 'impuestos', 'tributario', 'uafe', 'compliance',
    'consulta legal', 'asesoria legal', 'gabi'
  ];
  
  if (gabiKeywords.some(k => text.includes(k))) {
    return {
      agent: 'GABI',
      reason: 'implicit legal/finance keywords - handoff to Gabi',
      flags: { agentHandoff: true, fromAgent: currentAgent, targetAgent: 'GABI', implicitHandoff: true }
    };
  }
  
  // 4) KEYWORDS que SUGIEREN agente pero NO fuerzan cambio
  // El orquestador decidirá si cambiar según activeAgent
  
  // NOTA: Paula NO se activa por keywords, solo por @paula (handoff explícito)
  // Aurora/orquestador responden preguntas sobre propiedades y sugieren usar @paula
  
  // Keywords Aluna (membresías)
  if (ALUNA_KEYWORDS.some(k => text.includes(k))) {
    return { 
      agent: 'ALUNA', 
      reason: 'keywords membresías/planes',
      flags: { suggestedAgent: 'ALUNA', isKeywordMatch: true }
    };
  }

  if (AURORA_KEYWORDS.some(k => text.includes(k))) {
    return { 
      agent: 'AURORA', 
      reason: 'keywords reservas/pagos',
      flags: { suggestedAgent: 'AURORA', isKeywordMatch: true }
    };
  }

  // 5) Fallback: NO cambiar agente, dejar que orquestador use activeAgent
  return { 
    agent: currentAgent, // Mantener agente actual
    reason: 'no explicit trigger - maintaining active agent',
    flags: { maintainingActive: true }
  };
}
