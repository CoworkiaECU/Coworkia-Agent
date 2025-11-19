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
  const agente = AGENTES[intencion.agent];
  
  // 🚫 CANCELACIÓN DETECTADA
  const esCancelacion = Boolean(intencion.flags?.cancelacion);
  
  // 🔄 RELEVO ENTRE AGENTES
  const esRelevoHaciaOtro = Boolean(intencion.flags?.agentHandoff);
  const esRetornoAurora = Boolean(intencion.flags?.returningToAurora);
  
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
    throw new Error(`Agente ${intencion.agent} no encontrado`);
  }

  // 2. Construir contexto de perfil
  const contextoUsuario = construirContextoPerfil(perfil, { postEmailSupport: esSoportePostEmail });

  // 3. Construir contexto de historial
  const contextoHistorial = construirContextoHistorial(historial);

  // 4. 🧠 Construir contexto de formulario parcial
  const contextoFormulario = formData ? construirContextoFormulario(formData) : '';

  // 🔍 DEBUG: Log del contexto construido
  console.log('[DEBUG-CONTEXTO] 🧠 Contexto para Aurora:', {
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

  const instruccionesRelevo = esRelevoHaciaOtro ? `
🤝 RELEVO A OTRO AGENTE - MENSAJE PERSONALIZADO:
- El usuario mencionó ${intencion.agent === 'ENZO' ? '@Enzo' : intencion.agent === 'ADRIANA' ? '@Adriana' : '@Aluna'}
- DEBES usar este mensaje EXACTO según el contexto:

SI ES PRIMER MENSAJE (firstVisit: true O conversationCount: 0):
"¡Hola ${perfil.name || perfil.whatsappDisplayName || 'amigo/a'}! 👋 Te conecto con ${AGENTES[intencion.agent].nombre} 🚀, tu ${AGENTES[intencion.agent].descripcionCorta}.

Si necesitas volver a hablar de reservas, menciona @Aurora y tu pregunta. ¡Estaré aquí! 😊"

SI ESTÁ EN MEDIO DE CONVERSACIÓN:
"Listo ${perfil.whatsappDisplayName || perfil.name || 'amigo/a'}, te comunico de inmediato con ${AGENTES[intencion.agent].nombre}.

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
  
  const esPrimeraVisita = perfil.firstVisit && !esSoportePostEmail && !esCancelacion;

  const prompt = `
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
${formData && !esCancelacion ? '- IMPORTANTE: Ya tengo algunos datos de su reserva (ver arriba), NO los vuelvas a preguntar' : ''}
${formData && formData.needsMoreInfo && !esCancelacion ? `- Pregunta SOLO por: ${formData.nextQuestion}` : ''}
${esPrimeraVisita ? '- Si es primera visita, menciona el día gratis (solo Aurora)' : ''}
${!esSoportePostEmail && !esCancelacion ? '- Si detectas cambio de tema que requiere otro agente, deriva apropiadamente' : ''}
${!esSoportePostEmail && !esCancelacion ? '- Máximo 4-5 líneas, excepto casos que requieran más detalle' : ''}
${!esSoportePostEmail && !esCancelacion ? '- Siempre termina con siguiente paso claro o pregunta de seguimiento' : ''}
${esSoportePostEmail && !esCancelacion ? '- Responde brevemente y cierra confirmando que estás disponible para más consultas' : ''}
${instruccionesPostEmail}
  `.trim();

  return {
    agente: agente.nombre,
    agenteKey: intencion.agent,
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
      targetAgent: esRelevoHaciaOtro ? intencion.agent : null,
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
  
  // 🆕 Información de primera visita vs cliente recurrente
  if (perfil.firstVisit !== undefined) {
    if (perfil.firstVisit) {
      lineas.push(`\n🎉 PRIMERA VISITA DETECTADA:`);
      lineas.push(`- HOT DESK GRATIS (2 horas)`);
      lineas.push(`- NO mencionar precio $10`);
      lineas.push(`- NO pedir pago hasta confirmar`);
      lineas.push(`- Decir: "Como es tu primera vez, tienes 2h GRATIS 🎉"`);
    } else {
      lineas.push(`\n💼 CLIENTE RECURRENTE:`);
      lineas.push(`- Ya conoce Coworkia`);
      lineas.push(`- Hot Desk: $10 por 2h`);
      lineas.push(`- Pedir pago después de confirmar`);
    }
  }

  // 🆕 Flag de reserva recién confirmada (temporal)
  if (perfil.justConfirmed) {
    lineas.push(`- RESERVA RECIÉN CONFIRMADA: SÍ`);
    lineas.push(`- Confirmada en: ${perfil.justConfirmedAt || 'hace momentos'}`);
    lineas.push(`✅ Usuario tiene reserva lista, si pregunta o necesita algo:`);  
    lineas.push(`   1. Mencionar su reserva existente de forma AMIGABLE`);
    lineas.push(`   2. Preguntar: "¿Quieres hacer otra reserva para un día diferente?"`);
    lineas.push(`   3. Si dice SÍ, iniciar flujo normal de nueva reserva`);
  }

  // 🆕 Información sobre uso del día gratis
  if (perfil.freeTrialUsed !== undefined) {
    if (perfil.freeTrialUsed) {
      lineas.push(`- Día gratis usado: SÍ → **DEBE PAGAR**`);
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
      lineas.push(`- Día gratis disponible: SÍ → Puede usarlo gratis`);
    }
  }

  // 🔄 RESERVA EN CURSO (pendingConfirmation)
  if (perfil.pendingConfirmation) {
    lineas.push(`\n🔔 RESERVA EN CURSO - ESPERANDO CONFIRMACIÓN:`);
    lineas.push(`- Fecha: ${perfil.pendingConfirmation.date || 'No definida'}`);
    lineas.push(`- Hora: ${perfil.pendingConfirmation.startTime || 'No definida'} - ${perfil.pendingConfirmation.endTime || 'No definida'}`);
    lineas.push(`- Servicio: ${perfil.pendingConfirmation.serviceType || 'No definido'}`);
    lineas.push(`- Email: ${perfil.pendingConfirmation.email || '❌ FALTA'}`);
    lineas.push(`- Acompañantes: ${perfil.pendingConfirmation.guestCount || 0}`);
    lineas.push(`- Gratis: ${perfil.pendingConfirmation.wasFree ? 'SÍ 🎉' : 'NO - Pago requerido'}`);
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
    // CRÍTICO: Siempre mostrar (0 total) para usuarios nuevos
    lineas.push(`\n📋 HISTORIAL COMPLETO DE RESERVAS (0 total):`);
    lineas.push(`- Sin reservas previas`);
    lineas.push(`- ✅ ELEGIBLE PARA 2H GRATIS de Hot Desk`);
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
    lineas.push(`- Si usuario pregunta "¿qué reservas tengo?": Mostrar esta lista formateada`);
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
 * Construye contexto del historial reciente
 */
function construirContextoHistorial(historial = []) {
  if (!historial || historial.length === 0) {
    return 'HISTORIAL: Primera interacción - sin mensajes previos.';
  }

  const lineas = ['HISTORIAL CONVERSACIÓN (últimos mensajes):'];
  
  // Tomar últimos 10 mensajes para mejor contexto
  const recientes = historial.slice(-10);
  
  recientes.forEach((item, index) => {
    const timestamp = item.timestamp ? new Date(item.timestamp).toLocaleTimeString() : '';
    
    if (item.role === 'user') {
      lineas.push(`  Usuario: "${item.content}"`);
    } else if (item.role === 'assistant') {
      const agentInfo = item.agent ? ` [${item.agent}]` : '';
      // Mantener respuesta completa para mejor contexto
      lineas.push(`  Aurora${agentInfo}: "${item.content}"`);
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

  if (summary) {
    lineas.push(summary);
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
    lineas.push('\n✅ FORMULARIO COMPLETO - Proceder con validación y confirmación');
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
