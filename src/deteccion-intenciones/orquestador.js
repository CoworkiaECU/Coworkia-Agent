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
      primeraVisita: perfil.firstVisit || false
    }
  };
}

/**
 * Construye contexto legible del perfil del usuario
 */
function construirContextoPerfil(perfil = {}) {
  if (!perfil || Object.keys(perfil).length === 0) {
    return 'PERFIL USUARIO: Usuario nuevo sin perfil registrado.';
  }

  const lineas = ['PERFIL USUARIO:'];
  
  if (perfil.name) lineas.push(`- Nombre: ${perfil.name}`);
  if (perfil.userId) lineas.push(`- ID: ${perfil.userId}`);
  if (perfil.email) lineas.push(`- Email: ${perfil.email}`);
  if (perfil.channel) lineas.push(`- Canal: ${perfil.channel}`);
  if (perfil.firstVisit !== undefined) {
    lineas.push(`- Primera visita: ${perfil.firstVisit ? 'SÍ (mencionar día gratis)' : 'NO (cliente recurrente)'}`);
  }
  if (perfil.lastMessageAt) lineas.push(`- Última interacción: ${perfil.lastMessageAt}`);
  
  return lineas.join('\n');
}

/**
 * Construye contexto del historial reciente
 */
function construirContextoHistorial(historial = []) {
  if (!historial || historial.length === 0) {
    return 'HISTORIAL: Primera interacción.';
  }

  const lineas = ['HISTORIAL RECIENTE:'];
  
  // Tomar últimas 3 interacciones máximo
  const recientes = historial.slice(-3);
  
  recientes.forEach((item, index) => {
    lineas.push(`${index + 1}. Usuario: "${item.input || item.message}"`);
    if (item.agent) lineas.push(`   → Atendió: ${item.agent}`);
    if (item.output) lineas.push(`   → Respuesta: "${item.output.substring(0, 100)}..."`);
  });

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
