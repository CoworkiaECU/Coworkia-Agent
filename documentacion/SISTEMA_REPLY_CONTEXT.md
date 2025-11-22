# 🔄 Sistema de Contexto de Reply Messages

## 📋 Visión General

Sistema inteligente para detectar y procesar mensajes de WhatsApp que son **respuestas a mensajes anteriores** (reply/quote), proporcionando contexto automático cuando el usuario responde con mensajes cortos como "sí", "ok", "ese", etc.

## 🎯 Problema que Resuelve

**Escenario típico:**
```
Aurora: "¿Prefieres hot desk o sala de reuniones?"
Usuario: [hace reply] "hot desk"
```

Sin contexto de reply, Aurora recibe solo "hot desk" y puede perder el contexto de la pregunta original.

**Con este sistema:**
- Detecta que el mensaje es un reply
- Extrae el mensaje citado (si Wassenger lo envía)
- O infiere el contexto del historial de conversación
- Enriquece el mensaje con contexto para el agente

## 🏗️ Arquitectura

### Componentes

```
┌─────────────────────────────────────────────────┐
│  Wassenger Webhook                              │
│  Recibe mensaje del usuario                     │
└──────────────────┬──────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────┐
│  buildReplyContext()                            │
│  - Extrae quoted message del webhook            │
│  - O infiere contexto del historial             │
│  - Genera mensaje enriquecido                   │
└──────────────────┬──────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────┐
│  processedText                                  │
│  Mensaje original O enriquecido con contexto    │
└──────────────────┬──────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────┐
│  procesarMensaje() → Agente                     │
│  Agente recibe contexto completo                │
└─────────────────────────────────────────────────┘
```

### Archivos

- **`/src/servicios/reply-context-handler.js`** - Lógica principal
- **`/src/express-servidor/endpoints-api/wassenger.js`** - Integración

## 🔧 Funcionalidades

### 1. Detección de Reply Cortos

Identifica mensajes que probablemente sean respuestas:

```javascript
isShortReply("sí")           // true
isShortReply("ok")           // true
isShortReply("el primero")   // true
isShortReply("Quiero reservar un espacio para mañana") // false
```

**Criterios:**
- 1-3 palabras
- Respuestas comunes (sí, no, ok, ese, etc.)
- Menos de 10 caracteres sin contexto evidente

### 2. Extracción de Quoted Message

Intenta extraer el mensaje citado del webhook de Wassenger:

**Estructuras soportadas:**
```javascript
// Estructura 1: WhatsApp Web
data.quotedMsg.body

// Estructura 2: WhatsApp API
data.contextInfo.quotedMessage.conversation

// Estructura 3: Formato alternativo
data.message.quotedMessage.body

// Estructura 4: WhatsApp-web.js
data._data.quotedMsg.body
```

### 3. Inferencia desde Historial

Si no hay quoted message en el webhook, infiere contexto del historial:

#### Estrategia 1: Respuesta a Pregunta
```
Historial:
  Aurora: "¿Prefieres hot desk o sala de reuniones?"
  
Usuario: "hot desk"

Detecta: Última pregunta con "?"
Resultado: HIGH confidence
```

#### Estrategia 2: Selección de Opción
```
Historial:
  Aurora: "Tenemos:
           1. Hot Desk - $5/hora
           2. Sala Reuniones - $15/hora"
  
Usuario: "la primera"

Detecta: Mensaje con opciones numeradas
Resultado: HIGH confidence
```

#### Estrategia 3: Reply Corto
```
Historial:
  Aurora: "Tu reserva está lista para confirmar"
  
Usuario: "ok"

Detecta: Mensaje muy corto
Resultado: MEDIUM confidence
```

#### Estrategia 4: Palabras Clave
```
Historial:
  Aurora: "Parking disponible por $25/mes"
  
Usuario: "me interesa el parking"

Detecta: Coincidencia de keywords
Resultado: MEDIUM confidence
```

### 4. Enriquecimiento de Mensaje

Genera mensaje enriquecido con contexto:

**Ejemplo 1: Con quoted message del webhook**
```javascript
// Input original
"sí"

// Output enriquecido
"[Respondiendo a: '¿Prefieres hot desk o sala de reuniones?']

sí"
```

**Ejemplo 2: Inferido del historial**
```javascript
// Input original
"el primero"

// Output enriquecido
"[Contexto inferido - Respondiendo a: 'Tenemos: 1. Hot Desk - $5/hora 2. Sala...']

Usuario responde: el primero"
```

## 📊 Metadata Generada

Cada interacción registra metadata de reply context:

```javascript
{
  hasReplyContext: true,
  contextType: 'question_response', // o 'option_selection', 'short_reply', 'keyword_match'
  contextSource: 'conversation_history', // o 'wassenger_api'
  confidence: 'high', // o 'medium', 'none'
  quotedLength: 45,
  wasEnriched: true
}
```

## 🎮 Uso en Código

### Integración Básica

```javascript
import { buildReplyContext, getReplyContextMetadata } from './reply-context-handler.js';

// En webhook handler
const replyContext = buildReplyContext(userMessage, webhookBody, conversationHistory);

if (replyContext.hasReplyContext) {
  console.log('✅ Contexto detectado:', replyContext.contextType);
  
  // Usar mensaje enriquecido
  const processedText = replyContext.enrichedMessage;
  
  // Enviar al agente
  const result = procesarMensaje(processedText, profile, history);
  
  // Registrar metadata
  saveInteraction({
    input: userMessage,
    output: result.reply,
    meta: {
      replyContext: getReplyContextMetadata(replyContext)
    }
  });
}
```

## 🧪 Ejemplos de Uso

### Caso 1: Confirmación Simple

```
📱 WhatsApp:
  Aurora: "¿Confirmas tu reserva para mañana 10am?"
  Usuario: [reply] "sí"

🤖 Sistema:
  - Detecta: isShortReply("sí") = true
  - Busca: Última pregunta con "?"
  - Genera: "[Respondiendo a: '¿Confirmas tu reserva...'] sí"
  - Confidence: HIGH
```

### Caso 2: Selección de Opción

```
📱 WhatsApp:
  Aurora: "Elige tu espacio:
           1️⃣ Hot Desk
           2️⃣ Sala Reuniones"
  Usuario: [reply] "2"

🤖 Sistema:
  - Detecta: Pattern /opción\s*[12]/
  - Busca: Mensaje con opciones numeradas
  - Genera: "[Contexto inferido...] Usuario responde: 2"
  - Confidence: HIGH
```

### Caso 3: Continuación Natural

```
📱 WhatsApp:
  Aurora: "¿Para cuántas personas?"
  Usuario: [reply] "4 personas"

🤖 Sistema:
  - Detecta: isShortReply("4 personas") = false (>3 palabras)
  - No enriquece: El mensaje tiene contexto suficiente
  - Procesa: Mensaje original sin cambios
```

## 🔍 Logging y Debug

### Logs de Detección

```bash
[DEBUG-FLOW] 7️⃣ Analizando contexto de reply...
[REPLY-CONTEXT] ✅ Contexto de reply detectado: {
  type: 'question_response',
  source: 'conversation_history',
  confidence: 'high',
  quotedPreview: '¿Prefieres hot desk o sala de reuniones?'
}
```

### Verificar en Interactions

```bash
tail -f data/interactions.jsonl | grep replyContext
```

Output:
```json
{
  "meta": {
    "replyContext": {
      "hasReplyContext": true,
      "contextType": "question_response",
      "contextSource": "conversation_history",
      "confidence": "high",
      "quotedLength": 45,
      "wasEnriched": true
    }
  }
}
```

## ⚙️ Configuración

No requiere configuración adicional. Sistema activo por defecto.

### Ajustar Sensibilidad

Para modificar qué se considera "reply corto":

```javascript
// En reply-context-handler.js
export function isShortReply(message) {
  // Ajustar threshold de palabras
  const wordCount = message.trim().split(/\s+/).length;
  if (wordCount <= 2) { // Cambiar de 3 a 2
    // ...
  }
}
```

## 🚨 Limitaciones

### 1. Dependencia de Wassenger

Si Wassenger **no** envía el mensaje citado en el webhook:
- Sistema recurre a inferencia desde historial
- Confidence: MEDIUM en lugar de HIGH
- Puede fallar con conversaciones muy largas

### 2. Mensajes Ambiguos

```
Aurora: "¿Prefieres hot desk o sala?"
Aurora: "¿Para cuántas personas?"
Usuario: "2"
```

El "2" podría referirse a:
- Opción 2 (sala)
- 2 personas

**Solución:** Sistema toma último mensaje del asistente. Si hay ambigüedad, confía en el agente para pedir clarificación.

### 3. Historial Limitado

Solo carga últimos 10 mensajes:
- Conversaciones muy largas pueden perder contexto antiguo
- Ajustable en `loadConversationHistory(userId, 20)` si necesario

## 📈 Métricas de Éxito

### Indicadores Clave

1. **% de replies detectados**
   ```sql
   SELECT 
     COUNT(*) FILTER (WHERE meta->>'hasReplyContext' = 'true') * 100.0 / COUNT(*) as detection_rate
   FROM interactions
   WHERE created_at > NOW() - INTERVAL '7 days';
   ```

2. **Distribución de confidence**
   ```bash
   cat data/interactions.jsonl | \
   jq -r '.meta.replyContext.confidence' | \
   sort | uniq -c
   ```

3. **Fuente de contexto**
   ```bash
   cat data/interactions.jsonl | \
   jq -r '.meta.replyContext.contextSource' | \
   sort | uniq -c
   ```

### Objetivos

- Detection rate: >70% de replies cortos
- High confidence: >60% de detecciones
- Wassenger API source: >40% (ideal)

## 🔄 Flujo Completo

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Usuario envía "sí" como reply en WhatsApp               │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. Wassenger webhook → wassenger.js                         │
│    body = { event: 'message:in', data: { ... } }           │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. buildReplyContext(text, body, history)                   │
│    ├─ Intenta extractQuotedContext(body)                    │
│    ├─ Si falla: findRelevantContextFromHistory()           │
│    └─ Genera enrichedMessage con contexto                   │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. processedText = replyContext.enrichedMessage             │
│    "[Respondiendo a: '¿Confirmas...?'] sí"                 │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. procesarMensaje(processedText, profile, history)         │
│    Agente recibe contexto completo                          │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ 6. Respuesta del agente con contexto correcto               │
│    "Perfecto, confirmada tu reserva para mañana 10am"       │
└─────────────────────────────────────────────────────────────┘
```

## 🆘 Troubleshooting

### Problema: Replies no se detectan

**Diagnóstico:**
```bash
# Verificar logs
heroku logs --tail | grep REPLY-CONTEXT
```

**Posibles causas:**
1. Wassenger no envía quoted data → Normal, sistema usa historial
2. Historial vacío → Verificar `loadConversationHistory()`
3. Mensaje no es "corto" según criterios → Ajustar `isShortReply()`

### Problema: Falsos positivos

**Síntoma:** Mensajes normales se detectan como replies

**Solución:**
```javascript
// Aumentar threshold en isShortReply()
if (wordCount <= 2) { // Era 3
  // ...
}
```

### Problema: Contexto incorrecto

**Síntoma:** Detecta el mensaje equivocado del historial

**Solución:**
- Revisar estrategias en `findRelevantContextFromHistory()`
- Priorizar preguntas recientes sobre keywords
- Aumentar historial: `loadConversationHistory(userId, 15)`

## 🚀 Futuras Mejoras

### Fase 2: ML-based Context

- Usar embeddings para encontrar mensaje más relevante
- Clasificador de tipos de reply (confirmación vs selección vs pregunta)

### Fase 3: Multi-turn Context

- Mantener contexto de conversación multi-mensaje
- "¿Y el precio?" → Referencia a mensaje 3 replies atrás

### Fase 4: Wassenger Webhooks Premium

- Investigar API premium de Wassenger
- Acceso a metadata completo de WhatsApp

---

**✅ Sistema activo desde:** 2025-11-21  
**🔧 Mantenido por:** Coworkia Development Team  
**📚 Versión:** 1.0
