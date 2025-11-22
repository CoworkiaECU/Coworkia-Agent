// src/servicios/reply-context-handler.js
// 🔄 Manejo de contexto para mensajes de reply/respuesta en WhatsApp

/**
 * 🔍 Detecta si un mensaje es una respuesta corta que necesita contexto
 * @param {string} message - Mensaje del usuario
 * @returns {boolean}
 */
export function isShortReply(message) {
  if (!message) return false;
  
  const trimmed = message.trim().toLowerCase();
  const wordCount = trimmed.split(/\s+/).length;
  
  // Mensajes cortos típicos de respuesta (1-3 palabras)
  const shortReplies = [
    'si', 'sí', 'no', 'ok', 'okay', 'vale', 'bueno', 'perfecto',
    'claro', 'confirmo', 'cancelar', 'dale', 'ya', 'ahora',
    'hoy', 'mañana', 'tarde', 'gracias', 'entiendo', 'aja',
    'ajá', 'ese', 'esa', 'este', 'esta', 'el primero', 'el segundo',
    'la primera', 'la segunda', 'opcion 1', 'opción 1', 'opcion 2', 'opción 2'
  ];
  
  // Si es 1-3 palabras Y es una respuesta común
  if (wordCount <= 3 && shortReplies.includes(trimmed)) {
    return true;
  }
  
  // O si es muy corto (menos de 10 caracteres) sin contexto evidente
  if (trimmed.length < 10 && wordCount <= 2) {
    return true;
  }
  
  return false;
}

/**
 * 📝 Extrae contexto del mensaje citado si existe en el webhook
 * @param {object} webhookData - Datos del webhook de Wassenger
 * @returns {object|null} - { quotedText, quotedAgent } o null
 */
export function extractQuotedContext(webhookData) {
  try {
    // Intentar diferentes estructuras que Wassenger podría enviar
    
    // Estructura 1: data.quotedMsg (WhatsApp Web)
    if (webhookData.data?.quotedMsg) {
      return {
        quotedText: webhookData.data.quotedMsg.body || webhookData.data.quotedMsg.caption || null,
        quotedId: webhookData.data.quotedMsg.id || null,
        quotedTimestamp: webhookData.data.quotedMsg.timestamp || null
      };
    }
    
    // Estructura 2: data.contextInfo (WhatsApp API)
    if (webhookData.data?.contextInfo?.quotedMessage) {
      const quoted = webhookData.data.contextInfo.quotedMessage;
      const text = quoted.conversation || 
                   quoted.extendedTextMessage?.text || 
                   quoted.caption || null;
      
      return {
        quotedText: text,
        quotedId: webhookData.data.contextInfo.stanzaId || null,
        quotedTimestamp: null
      };
    }
    
    // Estructura 3: data.message.quotedMessage (formato alternativo)
    if (webhookData.data?.message?.quotedMessage) {
      return {
        quotedText: webhookData.data.message.quotedMessage.body || null,
        quotedId: webhookData.data.message.quotedMessage.id || null,
        quotedTimestamp: null
      };
    }
    
    // Estructura 4: data._data.quotedMsg (WhatsApp-web.js)
    if (webhookData.data?._data?.quotedMsg) {
      return {
        quotedText: webhookData.data._data.quotedMsg.body || null,
        quotedId: webhookData.data._data.quotedMsg.id?._serialized || null,
        quotedTimestamp: webhookData.data._data.quotedMsg.t || null
      };
    }
    
    return null;
  } catch (error) {
    console.error('[REPLY-CONTEXT] Error extrayendo quoted message:', error);
    return null;
  }
}

/**
 * 🔍 Busca el mensaje más relevante en el historial reciente
 * @param {string} userMessage - Mensaje actual del usuario
 * @param {array} conversationHistory - Historial de conversación
 * @returns {object|null} - { relevantMessage, agent } o null
 */
export function findRelevantContextFromHistory(userMessage, conversationHistory) {
  if (!conversationHistory || conversationHistory.length === 0) {
    return null;
  }
  
  const trimmedMsg = userMessage.trim().toLowerCase();
  
  // Filtrar solo mensajes del asistente (agentes)
  const assistantMessages = conversationHistory.filter(msg => msg.role === 'assistant');
  
  if (assistantMessages.length === 0) {
    return null;
  }
  
  // ESTRATEGIA 1: Si es respuesta afirmativa/negativa, buscar última pregunta
  const confirmationWords = ['si', 'sí', 'no', 'ok', 'confirmo', 'cancelar', 'correcto', 'exacto'];
  if (confirmationWords.some(word => trimmedMsg === word || trimmedMsg.startsWith(word + ' '))) {
    // Buscar el último mensaje del asistente que contenga "?"
    for (let i = assistantMessages.length - 1; i >= 0; i--) {
      if (assistantMessages[i].content.includes('?')) {
        return {
          relevantMessage: assistantMessages[i].content,
          agent: assistantMessages[i].agent || 'unknown',
          type: 'question_response',
          confidence: 'high'
        };
      }
    }
  }
  
  // ESTRATEGIA 2: Si menciona opciones (1, 2, primero, segundo), buscar lista
  const optionPatterns = /\b(opci[oó]n\s*[12]|[12]|primer[oa]|segund[oa]|tercer[oa])\b/i;
  if (optionPatterns.test(trimmedMsg)) {
    // Buscar último mensaje con múltiples opciones o números
    for (let i = assistantMessages.length - 1; i >= 0; i--) {
      const msg = assistantMessages[i].content;
      if ((msg.match(/1\.|2\.|3\./g) || []).length >= 2 || 
          (msg.match(/\n/g) || []).length >= 2) {
        return {
          relevantMessage: msg,
          agent: assistantMessages[i].agent || 'unknown',
          type: 'option_selection',
          confidence: 'high'
        };
      }
    }
  }
  
  // ESTRATEGIA 3: Si es muy corto, tomar el último mensaje del asistente
  if (trimmedMsg.length < 15 && assistantMessages.length > 0) {
    const lastMsg = assistantMessages[assistantMessages.length - 1];
    return {
      relevantMessage: lastMsg.content,
      agent: lastMsg.agent || 'unknown',
      type: 'short_reply',
      confidence: 'medium'
    };
  }
  
  // ESTRATEGIA 4: Buscar palabras clave en común
  const keywords = trimmedMsg.split(/\s+/).filter(w => w.length > 4);
  if (keywords.length > 0) {
    for (let i = assistantMessages.length - 1; i >= 0; i--) {
      const msgLower = assistantMessages[i].content.toLowerCase();
      const matchingKeywords = keywords.filter(k => msgLower.includes(k));
      
      if (matchingKeywords.length > 0) {
        return {
          relevantMessage: assistantMessages[i].content,
          agent: assistantMessages[i].agent || 'unknown',
          type: 'keyword_match',
          confidence: 'medium',
          matchedKeywords: matchingKeywords
        };
      }
    }
  }
  
  return null;
}

/**
 * 🎯 Construye contexto enriquecido para mensajes de reply
 * @param {string} userMessage - Mensaje del usuario
 * @param {object} webhookData - Datos del webhook
 * @param {array} conversationHistory - Historial de conversación
 * @returns {object} - { hasReplyContext, quotedMessage, contextType, enrichedMessage }
 */
export function buildReplyContext(userMessage, webhookData, conversationHistory) {
  // Intentar extraer mensaje citado del webhook
  const quotedContext = extractQuotedContext(webhookData);
  
  if (quotedContext && quotedContext.quotedText) {
    // Caso ideal: Wassenger envió el mensaje citado
    return {
      hasReplyContext: true,
      quotedMessage: quotedContext.quotedText,
      contextType: 'webhook_quoted',
      enrichedMessage: `[Respondiendo a: "${quotedContext.quotedText.substring(0, 100)}..."]\n\n${userMessage}`,
      confidence: 'high',
      source: 'wassenger_api'
    };
  }
  
  // Si no hay quoted message pero es reply corto, buscar en historial
  if (isShortReply(userMessage)) {
    const historyContext = findRelevantContextFromHistory(userMessage, conversationHistory);
    
    if (historyContext) {
      return {
        hasReplyContext: true,
        quotedMessage: historyContext.relevantMessage,
        contextType: historyContext.type,
        enrichedMessage: `[Contexto inferido - Respondiendo a: "${historyContext.relevantMessage.substring(0, 150)}..."]\n\nUsuario responde: ${userMessage}`,
        confidence: historyContext.confidence,
        source: 'conversation_history',
        agent: historyContext.agent
      };
    }
  }
  
  // No hay contexto de reply detectado
  return {
    hasReplyContext: false,
    quotedMessage: null,
    contextType: 'none',
    enrichedMessage: userMessage,
    confidence: 'none',
    source: 'direct_message'
  };
}

/**
 * 📊 Genera metadata para logging
 * @param {object} replyContext - Resultado de buildReplyContext
 * @returns {object}
 */
export function getReplyContextMetadata(replyContext) {
  return {
    hasReplyContext: replyContext.hasReplyContext,
    contextType: replyContext.contextType,
    contextSource: replyContext.source,
    confidence: replyContext.confidence,
    quotedLength: replyContext.quotedMessage ? replyContext.quotedMessage.length : 0,
    wasEnriched: replyContext.enrichedMessage !== replyContext.quotedMessage
  };
}
