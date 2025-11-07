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

/**
 * Selecciona el agente apropiado y construye el prompt completo
 * @param {string} mensaje - Mensaje del usuario
 * @param {object} perfil - Perfil del usuario (opcional)
 * @param {array} historial - Últimas interacciones (opcional)
 * @returns {object} { agente, systemPrompt, prompt, metadata }
 */
export function procesarMensaje(mensaje, perfil = {}, historial = []) {
  // 1. Detectar intención y agente apropiado
  const intencion = detectarIntencion(mensaje);
  const agente = AGENTES[intencion.agent];

  if (!agente) {
    throw new Error(`Agente ${intencion.agent} no encontrado`);
  }

  // 2. Construir contexto de perfil
  const contextoUsuario = construirContextoPerfil(perfil);

  // 3. Construir contexto de historial
  const contextoHistorial = construirContextoHistorial(historial);

  // 4. Construir prompt completo con contexto
  const prompt = `
${contextoUsuario}

${contextoHistorial}

MENSAJE ACTUAL DEL USUARIO:
${mensaje}

INSTRUCCIONES:
- Responde como ${agente.nombre} según tu rol y personalidad
- Usa el contexto del perfil y el historial para personalizar
- Si es primera visita, menciona el día gratis (solo Aurora)
- Si detectas cambio de tema que requiere otro agente, deriva apropiadamente
- Máximo 4-5 líneas, excepto casos que requieran más detalle
- Siempre termina con siguiente paso claro o pregunta de seguimiento
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
        isFirstMessage: !historial || historial.length === 0
      }
    }
  };
}

/**
 * Construye contexto legible del perfil del usuario
 */
function construirContextoPerfil(perfil = {}) {
  if (!perfil || Object.keys(perfil).length === 0) {
    return 'PERFIL USUARIO: Usuario nuevo sin perfil registrado. Es primera vez.';
  }

  const lineas = ['PERFIL USUARIO:'];
  
  // 🆕 Información del nombre detectado
  if (perfil.name) {
    lineas.push(`- Nombre: ${perfil.name} ✅`);
    if (perfil.whatsappDisplayName && perfil.whatsappDisplayName !== perfil.name) {
      lineas.push(`- WhatsApp muestra: "${perfil.whatsappDisplayName}"`);
    }
  } else {
    lineas.push(`- Nombre: No detectado → **USAR "Hola" genérico**`);
  }
  
  if (perfil.userId) lineas.push(`- ID: ${perfil.userId}`);
  if (perfil.email) lineas.push(`- Email: ${perfil.email}`);
  if (perfil.channel) lineas.push(`- Canal: ${perfil.channel}`);
  
  // 🆕 Información de primera visita vs cliente recurrente
  if (perfil.firstVisit !== undefined) {
    if (perfil.firstVisit) {
      lineas.push(`- Primera visita: SÍ → Usa saludo de presentación profesional como Aurora`);
      lineas.push(`- Ofrecer día gratis SOLO si pregunta por servicios (no agresivamente)`);
    } else {
      lineas.push(`- Cliente recurrente: Ya conoce Coworkia, saludo más directo y familiar`);
      lineas.push(`- NO ofrecer día gratis (ya lo usó antes)`);
    }
  }

  // 🆕 Información sobre uso del día gratis
  if (perfil.freeTrialUsed !== undefined) {
    if (perfil.freeTrialUsed) {
      lineas.push(`- Día gratis usado: SÍ (${perfil.freeTrialDate || 'fecha anterior'}) → **DEBE PAGAR**`);
    } else {
      lineas.push(`- Día gratis disponible: SÍ → Puede usarlo gratis`);
    }
  }

  // 🆕 Historial de reservas
  if (perfil.reservationHistory && perfil.reservationHistory.length > 0) {
    const ultimaReserva = perfil.reservationHistory[perfil.reservationHistory.length - 1];
    lineas.push(`- Última reserva: ${ultimaReserva.date} - ${ultimaReserva.type} (${ultimaReserva.status})`);
    lineas.push(`- Total reservas: ${perfil.reservationHistory.length}`);
  }

  // 🆕 Conteo de mensajes para personalización
  if (perfil.conversationCount) {
    lineas.push(`- Mensajes enviados: ${perfil.conversationCount}`);
  }
  
  if (perfil.lastMessageAt) lineas.push(`- Última interacción: ${perfil.lastMessageAt}`);
  
  return lineas.join('\n');
}

/**
 * Construye contexto del historial reciente
 */
function construirContextoHistorial(historial = []) {
  if (!historial || historial.length === 0) {
    return 'HISTORIAL: Primera interacción - sin mensajes previos.';
  }

  const lineas = ['HISTORIAL CONVERSACIÓN:'];
  
  // Tomar últimos 5 mensajes máximo para no saturar el contexto
  const recientes = historial.slice(-5);
  
  recientes.forEach((item, index) => {
    const timestamp = item.timestamp ? new Date(item.timestamp).toLocaleTimeString() : '';
    
    if (item.role === 'user') {
      lineas.push(`${timestamp} Usuario: "${item.content}"`);
    } else if (item.role === 'assistant') {
      const agentInfo = item.agent ? ` (${item.agent})` : '';
      // Limitar respuesta a 80 caracteres para no saturar
      const shortResponse = item.content.length > 80 ? 
        item.content.substring(0, 80) + '...' : 
        item.content;
      lineas.push(`${timestamp} Bot${agentInfo}: "${shortResponse}"`);
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
