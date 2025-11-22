// Cerebro Principal: Orquestador de Agentes de Coworkia
// Integra Aurora, Aluna, Adriana y Enzo con memoria contextual

import { AURORA } from './aurora.js';
import { ALUNA } from './aluna.js';
import { ADRIANA } from './adriana.js';
import { ENZO } from './enzo.js';
import { detectarIntencion } from './detectar-intencion.js';

// Configuración de agentes
export const AGENTES = {
  AURORA,
  ALUNA,
  ADRIANA,
  ENZO
};

const POST_EMAIL_REACTIVATION_KEYWORDS = [
  'cancelar',
  'cancelación',
  'cancelacion',
  'cambiar fecha',
  'cambiar hora',
  'modificar reserva',
  'reprogramar',
  'reagendar',
  'otra fecha',
  'otra hora',
  'nueva reserva',
  'reservar'
];

/**
 * Selecciona el agente apropiado y construye el prompt completo
 * @param {string} mensaje - Mensaje del usuario
 * @param {object} perfil - Perfil del usuario (opcional)
 * @param {array} historial - Últimas interacciones (opcional)
 * @param {object} formData - Datos del formulario parcial (opcional)
 * @returns {object} { agente, systemPrompt, prompt, metadata }
 */
export function procesarMensaje(mensaje, perfil = {}, historial = [], formData = null) {
  // 1. Detectar intención y agente apropiado
  const intencion = detectarIntencion(mensaje);
  
  // 🎯 RESPETAR AGENTE ACTIVO: Si hay un agente activo y NO se menciona cambio explícito,
  // usar el agente activo en lugar del detectado
  const activeAgent = perfil.activeAgent || 'AURORA';
  const isAgentHandoff = Boolean(intencion.flags?.agentHandoff);
  const isReturningToAurora = Boolean(intencion.flags?.returningToAurora);
  
  // Si NO hay handoff ni retorno, usar el agente activo
  let agenteKey = intencion.agent.toLowerCase(); // Normalizar a minúsculas para consistencia DB
  if (!isAgentHandoff && !isReturningToAurora) {
    agenteKey = activeAgent.toLowerCase(); // Normalizar también el agente activo
    console.log(`[ORQUESTADOR] 🎯 Usando agente activo: ${activeAgent} (detectado fue: ${intencion.agent})`);
  }
  
  const agente = AGENTES[agenteKey.toUpperCase()]; // AGENTES usa claves en mayúsculas
  
  // 🚫 CANCELACIÓN DETECTADA
  const esCancelacion = Boolean(intencion.flags?.cancelacion);
  
  // 🔄 RELEVO ENTRE AGENTES
  const esRelevoHaciaOtro = isAgentHandoff;
  const esRetornoAurora = isReturningToAurora;
  
  // 🔄 MODIFICACIÓN DE RESERVA DETECTADA
  const esModificacionReserva = Boolean(intencion.flags?.modificacionReserva);
  
  // 🛟 SOPORTE POST-EMAIL: activar si:
  // - Se detecta patrón post-email en el mensaje (detalles reserva, mi reserva, etc.)
  // - O si justConfirmed está activo
  // - O si tiene reservas Y NO tiene pendingConfirmation (ya confirmó antes)
  const tieneReservasConfirmadas = perfil.reservationHistory && perfil.reservationHistory.length > 0;
  const sinReservaPendiente = !perfil.pendingConfirmation;
  const esSoportePostEmail = Boolean(
    intencion.flags?.postEmailSupport || 
    perfil.justConfirmed || 
    (tieneReservasConfirmadas && sinReservaPendiente)
  );

  if (!agente) {
    throw new Error(`Agente ${agenteKey} no encontrado`);
  }

  // 2. Construir contexto según el agente
  // 🎯 CONTEXTO ESPECÍFICO POR AGENTE:
  // - Aurora: Recibe TODO (perfil, historial, reservas, formularios)
  // - Enzo/Adriana/Aluna: Solo nombre, historial de CONVERSACIÓN (no reservas)
  
  const esAurora = agenteKey === 'aurora'; // Comparar con minúscula después de normalización
  
  // Contexto de perfil: Aurora recibe todo, otros solo básico
  const contextoUsuario = esAurora 
    ? construirContextoPerfil(perfil, { postEmailSupport: esSoportePostEmail })
    : construirContextoPerfilBasico(perfil);

  // Contexto de historial: Filtrar por agente activo
  const contextoHistorial = construirContextoHistorial(historial, agenteKey);

  // 4. 🧠 Contexto de formulario: SOLO AURORA
  const contextoFormulario = (esAurora && formData) ? construirContextoFormulario(formData) : '';

  // 🔍 DEBUG: Log del contexto construido
  console.log(`[DEBUG-CONTEXTO] 🧠 Contexto para ${agenteKey}:`, {
    tieneHistorial: historial && historial.length > 0,
    mensajesHistorial: historial ? historial.length : 0,
    tienePendingConfirmation: !!(perfil.pendingConfirmation),
    pendingData: perfil.pendingConfirmation ? {
      date: perfil.pendingConfirmation.date,
      startTime: perfil.pendingConfirmation.startTime
    } : null,
    tieneFormData: !!formData,
    primeraVisita: perfil.firstVisit,
    tieneEmail: !!perfil.email,
    modoSoportePostEmail: esSoportePostEmail,
    esModificacionReserva: esModificacionReserva,
    tieneReservasConfirmadas: perfil.reservationHistory && perfil.reservationHistory.length > 0,
    cantidadReservas: perfil.reservationHistory ? perfil.reservationHistory.length : 0
  });

  // 5. Construir prompt completo con contexto
  const instruccionesModificacion = esModificacionReserva ? `
🔄 MODIFICACIÓN DE RESERVA DETECTADA:
- El usuario quiere MODIFICAR/CAMBIAR una reserva existente, NO crear una nueva
- Usuario dijo: "${mensaje}"
- Busca en el contexto cuál reserva quiere modificar (puede decir "la del lunes", "la de las 12", "la que te dije")
- NO ofrezcas crear nueva reserva - él quiere cambiar la existente
- Pregunta: "¿A qué fecha y hora prefieres cambiar tu reserva?"
- Una vez obtenida nueva fecha/hora, confirma: "Perfecto! Cambio tu reserva a [nueva info]. ¿Confirmas?"` : '';
  
  const instruccionesPostEmail = esSoportePostEmail ? `
- 🛟 MODO SOPORTE POST-CONFIRMACIÓN: Usa los datos de la reserva confirmada para responder dudas específicas.
- 🚫 NO reinicies el flujo de reservas ni vuelvas a pedir datos, a menos que el usuario escriba explícitamente alguno de estos keywords: ${POST_EMAIL_REACTIVATION_KEYWORDS.join(', ')}.
- ✅ Si menciona esas palabras clave, entonces sí guía el flujo adecuado (cancelar, reprogramar o nueva reserva).` : '';
  
  const instruccionesCancelacion = esCancelacion ? `
🚫 CANCELACIÓN DETECTADA:
- El usuario quiere CANCELAR el flujo actual de reserva
- NO sigas preguntando datos de la reserva
- NO intentes completar el formulario
- Confirma que has cancelado el proceso
- Ofrece ayuda conversacional: "¿En qué más puedo ayudarte?"
- Mantente disponible para responder preguntas generales sobre Coworkia
- Si quiere reservar después, esperará a que lo solicite explícitamente` : '';

  // Para el handoff, necesitamos el agente DESTINO (el detectado), no el activo
  const targetAgentKey = intencion.flags?.targetAgent || intencion.agent;
  
  const instruccionesRelevo = esRelevoHaciaOtro ? `
👋 RELEVO ENTRE AGENTES - MENSAJE DE TRANSICIÓN:
- El usuario mencionó ${targetAgentKey === 'ENZO' ? '@Enzo' : targetAgentKey === 'ADRIANA' ? '@Adriana' : '@Aluna'}
- DEBES usar este mensaje EXACTO según el contexto:

SI ES PRIMER MENSAJE (firstVisit: true O conversationCount: 0):
"¡Hola ${perfil.name || perfil.whatsappDisplayName || 'amigo/a'}! 👋 Te conecto con ${AGENTES[targetAgentKey].nombre} 🚀, tu ${AGENTES[targetAgentKey].descripcionCorta}.

Si necesitas volver a hablar de reservas, menciona @Aurora y tu pregunta. ¡Estaré aquí! 😊"

SI ESTÁ EN MEDIO DE CONVERSACIÓN:
"Listo ${perfil.whatsappDisplayName || perfil.name || 'amigo/a'}, te comunico de inmediato con ${AGENTES[targetAgentKey].nombre}.

Si necesitas volver a hablar de reservas, menciona @Aurora y tu pregunta. ¡Estaré aquí! 😊"

- Usa EXACTAMENTE uno de estos dos mensajes según el contexto
- NO agregues nada más, NO improvises` : '';

  const instruccionesRetorno = esRetornoAurora ? `
👋 RETORNO DE USUARIO A AURORA - MENSAJE DE ENTRADA:
- El usuario mencionó @Aurora - está volviendo después de hablar con otro agente
- PRIMERO el otro agente debe despedirse (esto ya fue enviado antes)
- AHORA TÚ (Aurora) debes usar este mensaje de entrada:

"¡Hola ${perfil.whatsappDisplayName || perfil.name || 'de nuevo'}! Te asisto en Coworkia a partir de ahora 😊"

- DESPUÉS del saludo, resume datos de reserva si existen (ver FORMULARIO PARCIAL)
- Si hay formulario parcial, pregunta: "¿Quieres continuar con tu reserva?"
- NO menciones conversaciones con otros agentes
- Enfócate SOLO en reservas y servicios de Coworkia` : '';
  
  // Solo mencionar día gratis si es primera visita Y NO hay resumeMessage (retoma)
  const tieneResumeMessage = formData && formData.resumeMessage;
  const esPrimeraVisita = perfil.firstVisit && !esSoportePostEmail && !esCancelacion && !tieneResumeMessage;

  // 🎯 PROMPT DIFERENTE SEGÚN AGENTE
  let prompt;
  
  if (esAurora) {
    // AURORA: Prompt completo con reservas, formularios, instrucciones específicas
    prompt = `
${contextoUsuario}

${contextoHistorial}

${contextoFormulario}

MENSAJE ACTUAL DEL USUARIO:
${mensaje}

INSTRUCCIONES:
- Responde como ${agente.nombre} según tu rol y personalidad
- Usa el contexto del perfil y el historial para personalizar
${esRelevoHaciaOtro ? instruccionesRelevo : ''}
${esRetornoAurora ? instruccionesRetorno : ''}
${esCancelacion ? instruccionesCancelacion : ''}
${esModificacionReserva ? instruccionesModificacion : ''}
${esSoportePostEmail ? `
🚨 MODO SOPORTE ACTIVADO - NO VENDER NI INICIAR RESERVAS:
- El usuario YA TIENE una reserva confirmada (ver sección RESERVA CONFIRMADA arriba)
- Tu rol es SOLO responder preguntas sobre esa reserva existente
- NO ofrezcas Hot Desk, Sala de Reuniones ni preguntes qué espacio necesita
- NO inicies nuevo flujo de reserva
- Responde directamente usando los datos de su RESERVA CONFIRMADA
- Si pregunta por cambios/cancelación, usa keywords: ${POST_EMAIL_REACTIVATION_KEYWORDS.join(', ')}
` : ''}
${formData && formData.form && formData.form.wasFree ? `
🎉 PRIMERA VISITA GRATIS:
- Este usuario tiene día gratis disponible
- 🚫 NO menciones precio ($10, $25, etc.)
- 🚫 NO preguntes método de pago
- ✅ Siempre di "GRATIS" o "sin costo por ser tu primera visita"
` : ''}
${formData && !esCancelacion ? '- IMPORTANTE: Ya tengo algunos datos de su reserva (ver arriba), NO los vuelvas a preguntar' : ''}
${formData && formData.needsMoreInfo && !esCancelacion ? `- Pregunta SOLO por: ${formData.nextQuestion}` : ''}
${esPrimeraVisita ? '- El usuario es nuevo, menciona naturalmente el beneficio de primera visita cuando sea relevante' : ''}
${!esSoportePostEmail && !esCancelacion ? '- Si detectas cambio de tema que requiere otro agente, deriva apropiadamente' : ''}
${!esSoportePostEmail && !esCancelacion ? '- Máximo 4-5 líneas, excepto casos que requieran más detalle' : ''}
${!esSoportePostEmail && !esCancelacion ? '- Siempre termina con siguiente paso claro o pregunta de seguimiento' : ''}
${esSoportePostEmail && !esCancelacion ? '- Responde brevemente y cierra confirmando que estás disponible para más consultas' : ''}
${instruccionesPostEmail}
  `.trim();
  } else {
    // ENZO, ADRIANA, ALUNA: Prompt limpio, sin reservas, 100% enfocado en su especialidad
    const tieneHistorialConAgente = historial && historial.length > 0;
    
    prompt = `
${contextoUsuario}

${contextoHistorial}

MENSAJE DEL USUARIO:
"${mensaje}"

INSTRUCCIONES GENERALES:
- Responde como ${agente.nombre} según tu rol y especialidad
- Mantén contexto de conversación (memoria activa 24h hasta @Aurora)
- NO menciones reservas, espacios de coworking ni servicios de Coworkia
- Área de expertise exclusiva: ${agente.rol}
- Si preguntan por reservas: "Para eso Sensei, habla con @Aurora 🏢"

🎯 CONTINUIDAD DE CONVERSACIÓN:
${tieneHistorialConAgente ? 
`- YA tienes historial con este usuario arriba ⬆️
- NO saludes de nuevo ("Hola", "¿En qué te ayudo?", etc.)
- CONTINÚA la conversación directamente
- Avanza, profundiza, ejecuta sobre lo ya hablado
- Si ya explicaste algo, NO lo repitas` : 
`- Primera interacción con este usuario
- Usa tu mensaje de entrada característico
- Establece el tono de trabajo`}

📎 SI USUARIO ENVÍA ARCHIVOS/IMÁGENES:
- Analiza el contenido compartido (PDF, Word, Excel, imágenes)
- Da insights accionables del archivo
- Referencia específicamente lo que viste en el documento

💡 RESPUESTAS:
- Conciso pero completo
- Mantén personalidad y tono característico
- Emojis estratégicos para reforzar ideas
  `.trim();
  }

  return {
    agente: agente.nombre,
    agenteKey: agenteKey,
    razonSeleccion: intencion.reason,
    systemPrompt: agente.systemPrompt,
    prompt,
    metadata: {
      rol: agente.rol,
      responsabilidades: agente.responsabilidades,
      primeraVisita: perfil.firstVisit || false,
      // 🆕 Contexto extendido para los agentes
      userProfile: {
        isFirstTime: perfil.firstVisit || false,
        freeTrialUsed: perfil.freeTrialUsed || false,
        freeTrialDate: perfil.freeTrialDate || null,
        conversationCount: perfil.conversationCount || 0,
        totalReservations: perfil.reservationHistory ? perfil.reservationHistory.length : 0,
        hasEmail: !!perfil.email,
        name: perfil.name || null
      },
      conversationContext: {
        hasHistory: historial && historial.length > 0,
        messageCount: historial ? historial.length : 0,
        isFirstMessage: !historial || historial.length === 0,
        postEmailSupport: esSoportePostEmail,
        cancelacion: esCancelacion
      },
      postEmailSupport: esSoportePostEmail,
      cancelacion: esCancelacion,
      agentHandoff: esRelevoHaciaOtro,
      returningToAurora: esRetornoAurora,
      targetAgent: esRelevoHaciaOtro ? targetAgentKey : null,
      // 🚫 Flag para indicar si se debe guardar formulario parcial
      shouldSavePartialForm: esCancelacion && formData && Object.keys(formData).length > 0
    }
  };
}

/**
 * Construye contexto legible del perfil del usuario
 */
function construirContextoPerfil(perfil = {}, extraFlags = {}) {
  if (!perfil || Object.keys(perfil).length === 0) {
    return 'PERFIL USUARIO: Usuario nuevo sin perfil registrado. Es primera vez.';
  }

  const lineas = ['PERFIL USUARIO:'];
  
  // 🆕 Información del nombre (sin saludos automáticos)
  if (perfil.name) {
    lineas.push(`- Nombre detectado: ${perfil.name} ✅`);
    if (perfil.whatsappDisplayName && perfil.whatsappDisplayName !== perfil.name) {
      lineas.push(`- WhatsApp muestra: "${perfil.whatsappDisplayName}"`);
    }
  } else {
    lineas.push(`- Nombre: No detectado`);
  }
  
  if (perfil.userId) lineas.push(`- ID: ${perfil.userId}`);
  if (perfil.email) lineas.push(`- Email: ${perfil.email}`);
  if (perfil.channel) lineas.push(`- Canal: ${perfil.channel}`);
  
  // 🆕 ELIMINADO: firstVisit es redundante, usamos solo free_trial_used

  // 🆕 Flag de reserva recién confirmada (temporal)
  if (perfil.justConfirmed) {
    lineas.push(`- RESERVA RECIÉN CONFIRMADA: SÍ`);
    lineas.push(`- Confirmada en: ${perfil.justConfirmedAt || 'hace momentos'}`);
    lineas.push(`✅ Usuario tiene reserva lista, si pregunta o necesita algo:`);  
    lineas.push(`   1. Mencionar su reserva existente de forma AMIGABLE`);
    lineas.push(`   2. Preguntar: "¿Quieres hacer otra reserva para un día diferente?"`);
    lineas.push(`   3. Si dice SÍ, iniciar flujo normal de nueva reserva`);
  }

  // 🎯 FUENTE DE VERDAD: free_trial_used (campo autoritativo)
  console.log('[ORQUESTADOR] 🔍 DEBUG freeTrialUsed:', perfil.freeTrialUsed, 'Type:', typeof perfil.freeTrialUsed);
  console.log('[ORQUESTADOR] 🔍 DEBUG reservationHistory length:', perfil.reservationHistory?.length || 0);
  
  if (perfil.freeTrialUsed !== undefined) {
    if (perfil.freeTrialUsed) {
      lineas.push(`\n💼 CLIENTE RECURRENTE:`);
      lineas.push(`- Día gratis usado: SÍ → **DEBE PAGAR**`);
      lineas.push(`- Hot Desk: $10 por 2h`);
      if (perfil.freeTrialDate) {
        lineas.push(`  * Fecha de uso: ${perfil.freeTrialDate}`);
      }
      
      // Mostrar lastReservation si existe (más confiable que reservationHistory)
      if (perfil.lastReservation) {
        const lastRes = perfil.lastReservation;
        lineas.push(`  * Última visita: ${lastRes.date || 'fecha desconocida'} a las ${lastRes.startTime || 'N/A'}`);
        const tipoEspacio = lastRes.serviceType === 'hotDesk' ? 'Hot Desk' : 'Sala de Reuniones';
        lineas.push(`  * Espacio usado: ${tipoEspacio}`);
        if (perfil.email) {
          lineas.push(`  * Confirmación enviada a: ${perfil.email}`);
        }
      } else if (perfil.reservationHistory && perfil.reservationHistory.length > 0) {
        // Fallback a reservationHistory si lastReservation no existe
        const ultimaReserva = perfil.reservationHistory[perfil.reservationHistory.length - 1];
        if (ultimaReserva.wasFree) {
          lineas.push(`  * Espacio usado: ${ultimaReserva.type || 'Hot Desk'}`);
          lineas.push(`  * Horario: ${ultimaReserva.startTime || 'N/A'} - ${ultimaReserva.endTime || 'N/A'}`);
        }
      }
      
      lineas.push(`  ⚠️ Si usuario INSISTE que nunca vino, agendar como excepción SIN PAGO`);
    } else {
      lineas.push(`\n🎉 CLIENTE NUEVO:`);
      lineas.push(`- Día gratis disponible: SÍ → 2h GRATIS`);
      lineas.push(`- NO pedir pago, NO mencionar precio`);
    }
  }

  // 🔄 RESERVA EN CURSO (pendingConfirmation)
  if (perfil.pendingConfirmation) {
    // 🚨 CALCULAR wasFree basándose en free_trial_used del usuario, NO del formulario
    const esGratisPorFreeTrial = !perfil.freeTrialUsed;
    
    lineas.push(`\n🔔 RESERVA EN CURSO - ESPERANDO CONFIRMACIÓN:`);
    lineas.push(`- Fecha: ${perfil.pendingConfirmation.date || 'No definida'}`);
    lineas.push(`- Hora: ${perfil.pendingConfirmation.startTime || 'No definida'} - ${perfil.pendingConfirmation.endTime || 'No definida'}`);
    lineas.push(`- Servicio: ${perfil.pendingConfirmation.serviceType || 'No definido'}`);
    lineas.push(`- Email: ${perfil.pendingConfirmation.email || '❌ FALTA'}`);
    lineas.push(`- Acompañantes: ${perfil.pendingConfirmation.guestCount || 0}`);
    lineas.push(`- Gratis: ${esGratisPorFreeTrial ? 'SÍ 🎉 - Free trial disponible' : 'NO - Pago requerido'}`);
    lineas.push(`\n⚠️ IMPORTANTE: Si usuario cambia de tema, NO borres esta reserva. Guárdala y retómala después.`);
  }

  // 🆕 Historial COMPLETO de reservas con precios
  if (perfil.reservationHistory && perfil.reservationHistory.length > 0) {
    lineas.push(`\n📋 HISTORIAL COMPLETO DE RESERVAS (${perfil.reservationHistory.length} total):`);
    
    perfil.reservationHistory.forEach((reserva, index) => {
      const numero = index + 1;
      const fecha = reserva.date || 'fecha desconocida';
      const hora = reserva.startTime || 'N/A';
      const tipo = reserva.serviceType === 'hotDesk' ? 'Hot Desk' : 
                   reserva.serviceType === 'meetingRoom' ? 'Sala de Reuniones' : 
                   reserva.type || 'Hot Desk';
      
      // Determinar si fue gratis o pagado
      const esGratis = reserva.wasFree === true;
      const precio = esGratis ? 'GRATIS 🎉' : 
                     tipo === 'Hot Desk' ? '$10' : 
                     tipo === 'Sala de Reuniones' ? '$29' : 
                     reserva.price ? `$${reserva.price}` : 'PAGADO';
      
      lineas.push(`${numero}. ${fecha} ${hora} - ${tipo} - ${precio}`);
    });
    
    lineas.push(`\n💡 Si usuario pregunta por sus reservas, muéstrale este historial con precios claros`);
  } else {
    // Historial vacío (informativo, no determina elegibilidad)
    lineas.push(`\n📋 HISTORIAL COMPLETO DE RESERVAS (0 total):`);
    lineas.push(`- Sin reservas confirmadas aún`);
  }

  // 🆕 RESERVAS CONFIRMADAS FUTURAS (para detectar conflictos y mostrar agenda)
  if (perfil.upcomingReservations && perfil.upcomingReservations.length > 0) {
    lineas.push(`\n📅 RESERVAS CONFIRMADAS FUTURAS (${perfil.upcomingReservations.length} próximas):`);
    
    perfil.upcomingReservations.forEach((reserva, index) => {
      const numero = index + 1;
      const fecha = reserva.date;
      const tiempo = reserva.time || `${reserva.start_time || 'N/A'}-${reserva.end_time || 'N/A'}`;
      const espacio = reserva.space || (reserva.service_type === 'hotDesk' ? 'Hot Desk' : 'Sala de Reuniones');
      const personas = reserva.people > 1 ? ` (${reserva.people} personas)` : '';
      const precio = reserva.price || (reserva.was_free ? 'GRATIS' : 'PAGADO');
      
      lineas.push(`${numero}. ${fecha} ${tiempo} - ${espacio}${personas} - ${precio}`);
    });
    
    lineas.push(`\n⚠️ IMPORTANTE - DETECCIÓN DE CONFLICTOS:`);
    lineas.push(`- Cuando usuario solicite nueva reserva, REVISAR si fecha/hora coincide con estas`);
    lineas.push(`- Si hay conflicto: "Ya tienes [espacio] reservado para [fecha] [hora]. ¿Quieres cambiarla o hacer otra diferente?"`);
    lineas.push(`\n📋 Si usuario pregunta "¿qué reservas tengo?" o "cuántas reservas tengo?", responde EXACTAMENTE así:`);
    lineas.push(`"Tienes ${perfil.upcomingReservations.length} reserva${perfil.upcomingReservations.length > 1 ? 's' : ''} confirmada${perfil.upcomingReservations.length > 1 ? 's' : ''}: 📅\n\n" + [lista con formato]`);
    lineas.push(`\nFORMATO DE LISTA (usa emojis y líneas separadas):`);
    lineas.push(`${perfil.upcomingReservations.length === 1 ? '"' : ''}📅 [Fecha]\n⏰ [Hora inicio] - [Hora fin]\n🏢 [Tipo de espacio]${perfil.upcomingReservations.length === 1 ? '\n💰 [Precio o GRATIS]"' : ''}`);
    lineas.push(`Si son múltiples reservas, separar cada una con línea en blanco.`);
  } else {
    lineas.push(`\n📅 RESERVAS CONFIRMADAS FUTURAS: Ninguna`);
    lineas.push(`\n⚠️ Este usuario NO tiene reservas confirmadas todavía.`);
    lineas.push(`- Si pregunta "¿qué reservas tengo?" → Responder: "No tienes reservas confirmadas aún. ¿Te gustaría hacer una reserva?"`);
    lineas.push(`- NO inventes fechas ni horarios que no existen en el sistema.`);
  }

  // 🆕 Conteo de mensajes para personalización
  if (perfil.conversationCount) {
    lineas.push(`- Mensajes enviados: ${perfil.conversationCount}`);
  }
  
  if (perfil.lastMessageAt) lineas.push(`- Última interacción: ${perfil.lastMessageAt}`);

  if (extraFlags.postEmailSupport) {
    lineas.push(`\n🛟 MODO SOPORTE POST-CONFIRMACIÓN ACTIVADO:`);
    lineas.push(`- Usuario llegó desde enlace de confirmación por correo`);
    lineas.push(`- NO reiniciar flujo de reservas ni pedir datos nuevamente`);
    lineas.push(`- Solo reactivar reserva si menciona: ${POST_EMAIL_REACTIVATION_KEYWORDS.join(', ')}`);
    
    // 🎯 MOSTRAR ÚLTIMA RESERVA CONFIRMADA
    if (perfil.reservationHistory && perfil.reservationHistory.length > 0) {
      const ultimaReserva = perfil.reservationHistory[perfil.reservationHistory.length - 1];
      lineas.push(`\n📋 RESERVA CONFIRMADA DEL USUARIO (usar estos datos para responder):`);
      lineas.push(`- Espacio: ${ultimaReserva.type || 'Hot Desk'}`);
      lineas.push(`- Fecha de la visita: ${ultimaReserva.date || 'No disponible'}`);
      
      // Extraer hora de inicio y fin del campo time si existe
      if (ultimaReserva.time) {
        lineas.push(`- Hora de llegada: ${ultimaReserva.time}`);
      } else if (ultimaReserva.startTime && ultimaReserva.endTime) {
        lineas.push(`- Hora de llegada: ${ultimaReserva.startTime} - ${ultimaReserva.endTime}`);
      }
      
      lineas.push(`- Estado: ${ultimaReserva.status || 'confirmada'}`);
      lineas.push(`- Precio: ${ultimaReserva.wasFree ? 'GRATIS (primera vez)' : 'Pagado'}`);
      lineas.push(`\n✅ USA ESTOS DATOS para responder cualquier pregunta sobre su reserva`);
    } else {
      lineas.push(`\n⚠️ No se encontró historial de reservas - pedir al usuario que aclare su consulta`);
    }
  }
  
  return lineas.join('\n');
}

/**
 * Construye contexto BÁSICO del perfil para agentes NO-Aurora
 * Solo incluye nombre y datos mínimos, sin reservas ni formularios
 */
function construirContextoPerfilBasico(perfil = {}) {
  if (!perfil || Object.keys(perfil).length === 0) {
    return 'USUARIO: Primera interacción';
  }

  const lineas = ['USUARIO:'];
  
  if (perfil.name) {
    lineas.push(`- Nombre: ${perfil.name}`);
  } else if (perfil.whatsappDisplayName) {
    lineas.push(`- Nombre: ${perfil.whatsappDisplayName}`);
  }
  
  // Información mínima, sin reservas ni detalles de Coworkia
  if (perfil.conversationCount && perfil.conversationCount > 1) {
    lineas.push(`- Han conversado ${perfil.conversationCount} veces antes`);
  }
  
  return lineas.join('\n');
}

/**
 * Construye contexto del historial reciente
 * Si se especifica agenteKey, filtra solo mensajes relevantes para ese agente
 */
function construirContextoHistorial(historial = [], agenteKey = null) {
  if (!historial || historial.length === 0) {
    return 'HISTORIAL: Primera interacción - sin mensajes previos.';
  }

  const lineas = ['HISTORIAL CONVERSACIÓN (últimos mensajes):'];
  
  // 🎯 FILTRADO POR AGENTE: Si NO es Aurora, solo mostrar conversaciones con ese agente
  let recientes = historial.slice(-10);
  
  if (agenteKey && agenteKey !== 'AURORA') {
    // Filtrar solo mensajes del usuario Y respuestas de este agente específico
    recientes = recientes.filter(item => {
      if (item.role === 'user') return true;
      if (item.role === 'assistant') {
        // Verificar si el mensaje es de este agente
        const messageAgent = item.agent?.toUpperCase() || 'AURORA';
        return messageAgent === agenteKey;
      }
      return false;
    });
    
    if (recientes.length === 0) {
      return `HISTORIAL: Primera conversación con ${agenteKey}. No hay mensajes previos con este agente.`;
    }
  }
  
  recientes.forEach((item, index) => {
    const timestamp = item.timestamp ? new Date(item.timestamp).toLocaleTimeString() : '';
    
    if (item.role === 'user') {
      lineas.push(`  Usuario: "${item.content}"`);
    } else if (item.role === 'assistant') {
      const agentName = item.agent || 'Aurora';
      lineas.push(`  ${agentName}: "${item.content}"`);
    }
  });

  lineas.push(''); // Línea en blanco para separar
  lineas.push('INSTRUCCIONES SEGÚN HISTORIAL:');
  
  // 🆕 Detectar patrones en el historial para dar instrucciones específicas
  const userMessages = recientes.filter(m => m.role === 'user');
  const lastUserMessage = userMessages[userMessages.length - 1];
  
  if (userMessages.length === 1) {
    lineas.push('- Es el primer mensaje del usuario, presentarte cálidamente');
  } else if (userMessages.length > 1) {
    lineas.push('- Usuario ya ha enviado mensajes anteriores, NO te presentes de nuevo');
    lineas.push('- Continúa la conversación naturalmente basándote en el contexto');
  }

  // Detectar si hay preguntas sin resolver
  if (lastUserMessage && lastUserMessage.content.includes('?')) {
    lineas.push('- Asegúrate de responder la pregunta actual del usuario');
  }

  return lineas.join('\n');
}

/**
 * 🧠 Construye contexto del formulario parcial de reserva
 */
function construirContextoFormulario(formData) {
  if (!formData || !formData.form) {
    return '';
  }

  const { form, summary, needsMoreInfo, nextQuestion, resumeMessage, userMessage } = formData;
  const lineas = ['🧠 FORMULARIO PARCIAL DE RESERVA (datos ya proporcionados):'];

  // 💰 Calcular si es gratis basado en freeTrialUsed
  const esGratis = form.freeTrialUsed === false;
  
  if (summary) {
    // Agregar indicador de precio gratis si aplica
    const summaryConPrecio = esGratis ? 
      `${summary}\n💰 Precio: GRATIS 🎉 (Primera visita)` : 
      summary;
    lineas.push(summaryConPrecio);
  }

  const missing = form.getMissingFields();
  if (missing.length > 0) {
    lineas.push('\n❓ DATOS FALTANTES:');
    const fieldNames = {
      spaceType: 'Tipo de espacio (Hot Desk o Sala)',
      date: 'Fecha de la visita',
      time: 'Hora de llegada',
      email: 'Correo electrónico'
    };
    missing.forEach(field => {
      lineas.push(`- ${fieldNames[field] || field}`);
    });
  }

  // 🚨 DETECCIÓN DE FRUSTRACIÓN: Usuario dice "ya te dije", "te dije", "ya lo dije"
  if (userMessage && /\b(ya\s+(te\s+)?dij[eé]|te\s+dij[eé]|ya\s+lo\s+dij[eé])\b/i.test(userMessage)) {
    lineas.push('\n⚠️ FRUSTRACIÓN DETECTADA - Usuario repitió información:');
    lineas.push('- El usuario está frustrado porque ya dio este dato antes');
    lineas.push('- DEBES:');
    lineas.push('  1. Pedir disculpas por el despiste: "¡Disculpa! Tienes razón, ya me lo dijiste" 🙏');
    lineas.push('  2. Mostrar RESUMEN COMPLETO de TODOS los datos que tienes:');
    lineas.push('     ' + summary);
    lineas.push('  3. Confirmar con el usuario: "¿Todo esto está correcto?"');
    lineas.push('  4. Solo preguntar por lo que REALMENTE falta');
    lineas.push('- NO vuelvas a preguntar por datos que ya tienes');
    lineas.push('- SÉ AMABLE y reconoce el error');
  }
  // 🔄 INSTRUCCIÓN ESPECIAL: Usuario retoma reserva
  else if (resumeMessage) {
    lineas.push('\n🔄 RETOMANDO RESERVA:');
    lineas.push('- El usuario tiene datos previos de una reserva en proceso');
    lineas.push('- DEBES usar exactamente este mensaje de resumen:');
    lineas.push('---');
    lineas.push(resumeMessage);
    lineas.push('---');
    lineas.push('- NO agregues nada más, solo espera respuesta del usuario');
    lineas.push('- Si confirma los datos, continúa con lo que falta');
    lineas.push('- Si quiere cambiar algo, actualiza y confirma los cambios');
  } else if (needsMoreInfo && nextQuestion) {
    lineas.push(`\n💡 INSTRUCCIONES DE FORMULARIO:`);
    lineas.push('- REVISA los datos que YA TIENES (arriba) antes de preguntar');
    lineas.push('- SOLO pregunta por lo que REALMENTE falta');
    lineas.push('- NO repitas preguntas si ya tienes el dato');
    lineas.push('- Sé NATURAL y amigable al pedir información');
    lineas.push(`- Pregunta sugerida: ${nextQuestion}`);
  } else if (!needsMoreInfo) {
    lineas.push('\n✅ FORMULARIO COMPLETO - MOSTRAR RESUMEN Y PEDIR CONFIRMACIÓN:');
    lineas.push('');
    lineas.push('IMPORTANTE: Usa este formato EXACTO para el resumen:');
    lineas.push('');
    lineas.push('"Tu reserva para el *[ESPACIO]* está lista:');
    lineas.push('📅 Fecha: [DÍA NOMBRE] [DD/MM]');
    lineas.push('🕐 Hora: [HH:MM] ([X] horas)');
    lineas.push('📧 Email: [email]');
    if (form.wasFree || (form.totalPrice === 0 && summary.includes('GRATIS'))) {
      lineas.push('💰 Precio: GRATIS 🎉 (primera visita)');
    } else {
      lineas.push('💰 Precio: $[XX]');
      lineas.push('💳 Pago: [MÉTODO]');
    }
    lineas.push('');
    lineas.push('¿Confirmas estos datos? Responde SI para confirmar o NO si quieres cambiar algo."');
    lineas.push('');
    lineas.push('🚨 CRÍTICO:');
    lineas.push('- NO preguntes por más datos');
    lineas.push('- NO menciones "completar formulario"');
    lineas.push('- SOLO muestra el resumen y pide SI/NO');
    lineas.push('- Si hay datos adicionales del usuario, ignóralos hasta que confirme');
  }

  return lineas.join('\n');
}

/**
 * Obtiene ejemplo de respuesta del agente (para testing/debug)
 */
export function obtenerEjemplo(agenteKey, tipo = 'bienvenida') {
  const agente = AGENTES[agenteKey];
  if (!agente || !agente.ejemplos) return null;
  return agente.ejemplos[tipo] || null;
}

/**
 * Lista todos los agentes disponibles
 */
export function listarAgentes() {
  return Object.entries(AGENTES).map(([key, agente]) => ({
    key,
    nombre: agente.nombre,
    rol: agente.rol,
    responsabilidades: agente.responsabilidades
  }));
}

/**
 * Valida si un cambio de agente es apropiado
 */
export function validarCambioAgente(agenteActual, mensajeNuevo) {
  const intencionNueva = detectarIntencion(mensajeNuevo);
  
  return {
    requiereCambio: intencionNueva.agent !== agenteActual,
    nuevoAgente: intencionNueva.agent,
    razon: intencionNueva.reason
  };
}

export default {
  procesarMensaje,
  obtenerEjemplo,
  listarAgentes,
  validarCambioAgente,
  AGENTES
};
