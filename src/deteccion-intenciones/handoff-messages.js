/**
 * 💬 MENSAJES DE HANDOFF CENTRALIZADOS
 * 
 * Reemplaza los getHandover() duplicados en cada agente individual.
 * Sistema V2: Mensajes centralizados, fáciles de mantener y consistentes.
 * 
 * REGLA: Solo el nuevo agente habla (silent handoff del agente saliente)
 * 
 * @date 30 Ene 2026
 */

/**
 * Nombres y contextos de cada agente
 */
const AGENT_INFO = {
  AURORA: {
    name: 'Aurora',
    context: 'reservas y coordinación de Coworkia',
    emoji: '✨'
  },
  ALUNA: {
    name: 'Aluna',
    context: 'membresías y planes mensuales',
    emoji: '🌙'
  },
  ADRIANA: {
    name: 'Adriana',
    context: 'seguros y coberturas',
    emoji: '🛡️'
  },
  ENZO: {
    name: 'Enzo',
    context: 'marketing e IA para negocios',
    emoji: '🚀'
  },
  ANGELA: {
    name: 'Ángela',
    context: 'salud y bienestar',
    emoji: '👩‍⚕️'
  },
  AXEL: {
    name: 'Axel',
    context: 'colisiones y reparación vehicular',
    emoji: '🔧'
  },
  GABI: {
    name: 'Gabi',
    context: 'legal y finanzas',
    emoji: '⚖️'
  },
  PAULA: {
    name: 'Paula',
    context: 'bienes raíces',
    emoji: '🏡'
  }
};

/**
 * Plantillas de mensajes de entrada por idioma
 * {fromAgent} = agente anterior
 * {toAgent} = nuevo agente (quien habla)
 * {userName} = nombre del usuario
 */
const ENTRY_TEMPLATES = {
  // Usuario nuevo llega al agente (sin historial previo)
  FIRST_TIME: {
    es: '¡Hola {userName}! {emoji} Soy {toAgent}.\n\nTe ayudo con {context}. ¿Qué necesitas hoy?',
    en: 'Hi {userName}! {emoji} I\'m {toAgent}, {context}.\n\nHow can I help you?',
    fr: 'Bonjour {userName}! {emoji} Je suis {toAgent}, {context}.\n\nComment puis-je vous aider?',
    it: 'Ciao {userName}! {emoji} Sono {toAgent}, {context}.\n\nCome posso aiutarti?',
    pt: 'Olá {userName}! {emoji} Sou {toAgent}, {context}.\n\nComo posso ajudá-lo?',
    qu: 'Allinllachu {userName}! {emoji} Ñuqaqa {toAgent} kani, {context}.\n\nImaynatataq yanapasqayki?'
  },
  
  // Usuario regresa al agente (ya estuvo antes)
  RETURNING: {
    es: '¡Hola de nuevo {userName}! {emoji} Soy {toAgent}.\n\nRetomemos donde quedamos. ¿En qué te ayudo ahora con {context}?',
    en: 'Hello again {userName}! {emoji} I\'m {toAgent}, we meet again.\n\nI remember our last conversation. How else can I help you now?',
    fr: 'Rebonjour {userName}! {emoji} Je suis {toAgent}, nous nous retrouvons.\n\nJe me souviens de notre dernière conversation. Comment puis-je encore vous aider?',
    it: 'Ciao di nuovo {userName}! {emoji} Sono {toAgent}, ci ritroviamo.\n\nRicordo la nostra ultima conversazione. Come posso aiutarti adesso?',
    pt: 'Olá novamente {userName}! {emoji} Sou {toAgent}, nos encontramos novamente.\n\nLembro da nossa última conversa. Como posso ajudá-lo agora?',
    qu: 'Allinllachu wakmanta {userName}! {emoji} Ñuqaqa {toAgent} kani, wakmanta tupanakunchis.\n\nYuyarini ñawpaq rimanakuyninchista. Kunantaq imaynatataq yanapasqayki?'
  },
  
  // Handoff desde otro agente (transición activa)
  HANDOFF: {
    es: '¡Hola {userName}! {emoji} Soy {toAgent}, tomo el relevo desde aquí.\n\nTe ayudo con {context}. ¿Qué necesitas ahora?\n\nCuando termines, escribe @aurora para volver con Aurora. 😊',
    en: 'Hi {userName}! {emoji} I\'m {toAgent}, taking over from here.\n\nI\'m available right where you left off when you call me with @{toAgentHandle}.\n\nHow can I help you today with {context}?',
    fr: 'Bonjour {userName}! {emoji} Je suis {toAgent}, je prends le relais maintenant.\n\nJe suis disponible là où vous vous êtes arrêté quand vous m\'appelez avec @{toAgentHandle}.\n\nComment puis-je vous aider aujourd\'hui avec {context}?',
    it: 'Ciao {userName}! {emoji} Sono {toAgent}, prendo il controllo da qui.\n\nSono disponibile da dove sei rimasto quando mi chiami con @{toAgentHandle}.\n\nCome posso aiutarti oggi con {context}?',
    pt: 'Olá {userName}! {emoji} Sou {toAgent}, assumo daqui.\n\nEstou disponível de onde você parou quando me chama com @{toAgentHandle}.\n\nComo posso ajudá-lo hoje com {context}?',
    qu: 'Allinllachu {userName}! {emoji} Ñuqaqa {toAgent} kani, kaypi qallarikuni.\n\nKaypi kani maypi qhiparqanki, @{toAgentHandle}wan waqyamuptiki.\n\nImaynata yanapayki kunan {context}manta?'
  }
};

/**
 * Genera mensaje de entrada del nuevo agente
 * @param {string} toAgent - Agente que toma el control
 * @param {string} fromAgent - Agente anterior (null si es primera vez)
 * @param {string} userName - Nombre del usuario
 * @param {string} userLanguage - Idioma ('es', 'en', 'fr', 'it', 'pt', 'qu')
 * @param {boolean} isReturning - Si el usuario ya habló con este agente antes
 * @returns {string} Mensaje de entrada
 */
export function getEntryMessage(toAgent, fromAgent, userName = 'amigo', userLanguage = 'es', isReturning = false) {
  const info = AGENT_INFO[toAgent] || AGENT_INFO.AURORA;
  const lang = userLanguage || 'es';
  
  // Decidir plantilla según contexto
  let template;
  if (!fromAgent || fromAgent === toAgent) {
    // Primera vez o mismo agente (mantiene)
    template = isReturning ? ENTRY_TEMPLATES.RETURNING : ENTRY_TEMPLATES.FIRST_TIME;
  } else {
    // Handoff desde otro agente
    template = ENTRY_TEMPLATES.HANDOFF;
  }
  
  const text = template[lang] || template.es;
  
  // Variables para reemplazar
  const fromInfo = fromAgent ? AGENT_INFO[fromAgent] : null;
  const replacements = {
    '{userName}': userName,
    '{emoji}': info.emoji,
    '{toAgent}': info.name,
    '{toAgentHandle}': toAgent?.toLowerCase() || '',
    '{context}': info.context,
    '{fromAgentName}': fromInfo?.name || fromAgent,
    '{fromAgentHandle}': fromAgent?.toLowerCase() || ''
  };
  
  // Aplicar reemplazos
  let message = text;
  for (const [key, value] of Object.entries(replacements)) {
    message = message.replace(new RegExp(key, 'g'), value);
  }
  
  return message;
}

/**
 * Aurora: Mensajes especiales cuando regresa desde otro agente
 * Aurora es el hub central, tiene contexto de todos los especialistas
 */
export function getAuroraReturnMessage(fromAgent, userName, userLanguage = 'es') {
  const fromInfo = AGENT_INFO[fromAgent];
  const templates = {
    es: `¡Hola de nuevo ${userName}! ✨ Soy Aurora, tomo el relevo desde aquí.\n\n${fromInfo?.name || fromAgent} está disponible con @${fromAgent.toLowerCase()} si lo necesitas, recordará tu última conversación.\n\n¿En qué te puedo asistir ahora?`,
    en: `Hello again ${userName}! ✨ I'm Aurora, taking over from here.\n\n${fromInfo?.name || fromAgent} is available with @${fromAgent.toLowerCase()} if you need them, they'll remember your last conversation.\n\nHow can I assist you now?`,
    fr: `Rebonjour ${userName}! ✨ Je suis Aurora, je prends le relais maintenant.\n\n${fromInfo?.name || fromAgent} est disponible avec @${fromAgent.toLowerCase()} si vous en avez besoin, il se souviendra de votre dernière conversation.\n\nComment puis-je vous aider maintenant?`,
    it: `Ciao di nuovo ${userName}! ✨ Sono Aurora, prendo il controllo da qui.\n\n${fromInfo?.name || fromAgent} è disponibile con @${fromAgent.toLowerCase()} se ne hai bisogno, ricorderà la tua ultima conversazione.\n\nCome posso aiutarti ora?`,
    pt: `Olá novamente ${userName}! ✨ Sou Aurora, assumo daqui.\n\n${fromInfo?.name || fromAgent} está disponível com @${fromAgent.toLowerCase()} se precisar, lembrará da sua última conversa.\n\nComo posso ajudá-lo agora?`
  };
  
  return templates[userLanguage] || templates.es;
}

// getExitMessage() eliminada — V2 usa silent handoff, el agente saliente no habla

/**
 * API unificada para handoffs
 * @param {string} fromAgent - Agente que entrega
 * @param {string} toAgent - Agente que recibe
 * @param {string} userName - Nombre del usuario
 * @param {string} userLanguage - Idioma
 * @param {boolean} isReturning - Si usuario ya estuvo con toAgent antes
 * @returns {{ despedida: null, entrada: string }} Mensajes de handoff
 */
export function getHandoffMessages(fromAgent, toAgent, userName = 'amigo', userLanguage = 'es', isReturning = false) {
  let entryMessage;
  
  // Caso especial: Aurora regreso desde otro agente
  if (toAgent === 'AURORA' && fromAgent !== 'AURORA') {
    entryMessage = getAuroraReturnMessage(fromAgent, userName, userLanguage);
  } else {
    entryMessage = getEntryMessage(toAgent, fromAgent, userName, userLanguage, isReturning);
  }
  
  return {
    despedida: null, // V2: Silent handoff
    entrada: entryMessage
  };
}
