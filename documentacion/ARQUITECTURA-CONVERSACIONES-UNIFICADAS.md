# 🏗️ Arquitectura Unificada de Conversaciones Multi-Agente

**Versión:** 1.0.0  
**Fecha:** 2026-01-11  
**Estado:** ✅ Implementado - En fase de migración

---

## 📋 Tabla de Contenidos

1. [Visión General](#visión-general)
2. [Arquitectura de Base de Datos](#arquitectura-de-base-de-datos)
3. [Componentes del Sistema](#componentes-del-sistema)
4. [Guía de Migración](#guía-de-migración)
5. [API de Uso](#api-de-uso)
6. [Casos de Uso](#casos-de-uso)
7. [Performance y Escalabilidad](#performance-y-escalabilidad)

---

## 🎯 Visión General

### Problema Identificado

El sistema anterior tenía limitaciones significativas:

- ❌ **Mezcla de contextos**: Todos los mensajes guardados sin estructura por tema
- ❌ **Sin soporte de archivos**: Imágenes y PDFs no se almacenaban adecuadamente
- ❌ **Historial confuso**: Aurora recibía mensajes de todos los agentes mezclados
- ❌ **Sin tracking de sesiones**: Imposible seguir hilos de conversación específicos
- ❌ **Metadata limitada**: Información adicional difícil de extender

### Solución Implementada

Nueva arquitectura que proporciona:

- ✅ **Separación por tema**: Cada conversación tiene contexto y tema específico
- ✅ **Almacenamiento de archivos**: Sistema robusto para imágenes, PDFs y más
- ✅ **Tracking de sesiones**: Seguimiento preciso de hilos conversacionales
- ✅ **Metadata extensible**: JSONB permite agregar información dinámica
- ✅ **Multi-agente nativo**: Diseñado desde cero para 7+ agentes

---

## 🗄️ Arquitectura de Base de Datos

### Nuevas Tablas

#### 1. `agent_conversations`

Tabla principal de conversaciones estructuradas:

```sql
CREATE TABLE agent_conversations (
  id SERIAL PRIMARY KEY,
  user_phone TEXT NOT NULL,
  agent TEXT NOT NULL,                    -- axel, aurora, gaby, etc.
  conversation_topic TEXT,                -- collision_quote, reservation, etc.
  session_id TEXT NOT NULL,               -- UUID para agrupar sesiones
  role TEXT NOT NULL,                     -- user, assistant, system
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,     -- Extensible
  parent_message_id INTEGER,              -- Para hilos
  timestamp TIMESTAMP DEFAULT NOW(),
  
  FOREIGN KEY (user_phone) REFERENCES users(phone_number) ON DELETE CASCADE,
  FOREIGN KEY (parent_message_id) REFERENCES agent_conversations(id) ON DELETE SET NULL
);
```

**Índices optimizados:**
- `idx_agent_conversations_user_agent` - Búsqueda por usuario y agente
- `idx_agent_conversations_topic` - Filtrado por tema
- `idx_agent_conversations_session` - Agrupación por sesión
- `idx_agent_conversations_timestamp` - Ordenamiento temporal
- `idx_agent_conversations_user_agent_topic` - Búsqueda combinada

#### 2. `conversation_files`

Almacenamiento de archivos adjuntos:

```sql
CREATE TABLE conversation_files (
  id SERIAL PRIMARY KEY,
  message_id INTEGER NOT NULL,
  user_phone TEXT NOT NULL,
  agent TEXT NOT NULL,
  file_type TEXT NOT NULL,               -- image, pdf, audio
  file_url TEXT,                         -- URL externa (Wassenger)
  file_data TEXT,                        -- Base64 (opcional)
  processed BOOLEAN DEFAULT FALSE,
  analysis_result JSONB,                 -- Resultado de GPT-4 Vision
  uploaded_at TIMESTAMP DEFAULT NOW(),
  
  FOREIGN KEY (message_id) REFERENCES agent_conversations(id) ON DELETE CASCADE,
  FOREIGN KEY (user_phone) REFERENCES users(phone_number) ON DELETE CASCADE
);
```

**Índices optimizados:**
- `idx_conversation_files_message` - Archivos por mensaje
- `idx_conversation_files_agent` - Archivos por agente
- `idx_conversation_files_processed` - Pendientes de procesar

#### 3. `active_topics`

Tracking de temas activos por usuario:

```sql
CREATE TABLE active_topics (
  user_phone TEXT NOT NULL,
  agent TEXT NOT NULL,
  topic TEXT NOT NULL,
  session_id TEXT NOT NULL,
  status TEXT DEFAULT 'active',          -- active, paused, completed
  last_interaction TIMESTAMP DEFAULT NOW(),
  context_summary TEXT,                  -- Resumen IA del estado
  
  PRIMARY KEY (user_phone, agent, topic),
  FOREIGN KEY (user_phone) REFERENCES users(phone_number) ON DELETE CASCADE
);
```

**Índices optimizados:**
- `idx_active_topics_user` - Temas por usuario
- `idx_active_topics_status` - Filtrado por estado
- `idx_active_topics_last_interaction` - Ordenamiento por actividad

#### 4. Actualización de `users`

Nuevas columnas agregadas:

```sql
ALTER TABLE users 
  ADD COLUMN active_agents JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN context_preferences JSONB DEFAULT '{}'::jsonb;
```

**Ejemplos de datos:**

```json
{
  "active_agents": ["AURORA", "AXEL", "GABY"],
  "context_preferences": {
    "axel": {
      "notifications": true,
      "preferred_workshop": "downtown"
    },
    "gaby": {
      "meeting_reminder": "24h",
      "preferred_contact": "whatsapp"
    }
  }
}
```

---

## 🔧 Componentes del Sistema

### 1. ConversationRepository

**Ubicación:** `src/database/conversationRepository.js`

Repositorio principal con métodos CRUD completos:

```javascript
import conversationRepository from './database/conversationRepository.js';

// Guardar mensaje
await conversationRepository.saveMessage({
  userPhone: '+593987770788',
  agent: 'axel',
  topic: 'collision_quote',
  role: 'user',
  content: 'Necesito cotización',
  metadata: { images: 3 }
});

// Obtener conversación por tema
const messages = await conversationRepository.getConversationByTopic(
  '+593987770788',
  'axel',
  'collision_quote',
  50
);

// Obtener temas activos
const topics = await conversationRepository.getActiveTopics('+593987770788');
```

### 2. ConversationAdapter

**Ubicación:** `src/database/conversationAdapter.js`

Capa de compatibilidad para migración gradual:

```javascript
import conversationAdapter from './database/conversationAdapter.js';

// Funciona exactamente como antes, pero guarda en ambos sistemas
await conversationAdapter.saveConversationMessage(userId, {
  role: 'assistant',
  content: 'Respuesta del agente',
  agent: 'Axel'
});

// Lee del nuevo sistema primero, fallback al legacy
const history = await conversationAdapter.loadConversationHistory(userId, 10);
```

### 3. Script de Migración

**Ubicación:** `scripts/migrations/001-unified-conversations.js`

Migra datos existentes y crea nuevas tablas:

```bash
node scripts/migrations/001-unified-conversations.js
```

**Características:**
- ✅ Crea las 3 nuevas tablas
- ✅ Migra datos de `interactions` a `agent_conversations`
- ✅ Actualiza tabla `users` con nuevas columnas
- ✅ Crea todos los índices optimizados
- ✅ Transaccional - rollback automático en caso de error
- ✅ No elimina tablas legacy (se mantienen como respaldo)

---

## 🚀 Guía de Migración

### Fase 1: Preparación (✅ COMPLETADO)

- [x] Crear `conversationRepository.js`
- [x] Crear script de migración
- [x] Actualizar `postgres-adapter.js`
- [x] Crear `conversationAdapter.js` para compatibilidad
- [x] Documentación técnica

### Fase 2: Despliegue de Base de Datos (⏳ SIGUIENTE)

1. **Backup completo:**
   ```bash
   heroku pg:backups:capture --app coworkia-agent
   ```

2. **Ejecutar migración:**
   ```bash
   # Opción 1: Localmente (conectado a Heroku)
   node scripts/migrations/001-unified-conversations.js
   
   # Opción 2: En Heroku directamente
   heroku run node scripts/migrations/001-unified-conversations.js --app coworkia-agent
   ```

3. **Verificar migración:**
   ```bash
   heroku pg:psql --app coworkia-agent
   
   # En psql:
   \dt                              # Ver todas las tablas
   SELECT COUNT(*) FROM agent_conversations;
   SELECT COUNT(*) FROM conversation_files;
   SELECT COUNT(*) FROM active_topics;
   ```

### Fase 3: Migración por Agente (⏳ PENDIENTE)

#### Prioridad 1: Axel (más urgente)

**Razón:** Necesita procesamiento de imágenes batch inmediatamente.

**Archivos a modificar:**
1. `src/servicios/collision-analysis.js` - Usar nuevo sistema de archivos
2. `src/deteccion-intenciones/axel.js` - Integrar con conversationAdapter
3. `src/express-servidor/endpoints-api/wassenger.js` - Manejo de imágenes

**Código ejemplo:**

```javascript
// Antes (en collision-analysis.js)
const images = extractImagesFromMessage(message);

// Después
import conversationAdapter from '../database/conversationAdapter.js';

// Guardar imágenes en DB
for (const image of images) {
  await conversationAdapter.saveFile({
    messageId: savedMessage.id,
    userPhone: userId,
    agent: 'axel',
    fileType: 'image',
    fileUrl: image.url
  });
}

// Obtener todas las imágenes del tema
const images = await conversationAdapter.getFilesForTopic(
  userId,
  'axel',
  'collision_quote',
  'image'
);

// Procesar todas juntas
const analysis = await analyzeMultipleImages(images);
```

#### Prioridad 2: Gaby (necesita contador de interacciones)

**Archivos a modificar:**
1. `src/deteccion-intenciones/gabi.js` - Implementar contador
2. Crear `src/servicios/gaby-meeting-scheduler.js` - Nueva funcionalidad

**Código ejemplo:**

```javascript
import conversationAdapter from '../database/conversationAdapter.js';

// Obtener temas activos de Gaby
const topics = await conversationAdapter.getActiveTopics(userId, 'gaby');

// Contar interacciones
const history = await conversationAdapter.loadConversationHistory(userId, 100, {
  agent: 'gaby',
  newOnly: true
});

const interactionCount = history.filter(msg => msg.role === 'user').length;

if (interactionCount >= 5) {
  // Ofrecer reunión presencial
  await offerInPersonMeeting(userId);
}
```

#### Prioridad 3: Aurora (coordinadora - necesita ver resúmenes)

**Archivos a modificar:**
1. `src/deteccion-intenciones/aurora.js` - Integrar resúmenes
2. `src/deteccion-intenciones/orquestador.js` - Proporcionar contexto limpio

**Código ejemplo:**

```javascript
import conversationAdapter from '../database/conversationAdapter.js';

// Cuando Aurora necesita contexto de otros agentes
const summary = await conversationAdapter.getConversationSummary(userId);

// summary = {
//   axel: [
//     { topic: 'collision_quote', messageCount: 15, lastMessage: '2026-01-11...' }
//   ],
//   gaby: [
//     { topic: 'consulting', messageCount: 8, lastMessage: '2026-01-10...' }
//   ]
// }

// Aurora puede responder: "Veo que has estado conversando con Axel sobre
// una cotización de colisión y con Gaby sobre consultoría..."
```

#### Prioridad 4: Resto de agentes (Enzo, Adriana, Aluna, Ángela)

Migración más simple, usar `conversationAdapter` directamente.

### Fase 4: Limpieza (🔮 FUTURO)

Una vez confirmado que todo funciona (después de 2-4 semanas):

1. **Deprecar funciones legacy:**
   ```javascript
   // En memoria-sqlite.js, marcar como deprecated
   /**
    * @deprecated Use conversationAdapter instead
    */
   export async function saveConversationMessage() {
     console.warn('DEPRECATED: Use conversationAdapter.saveConversationMessage');
     // ...
   }
   ```

2. **Opcional: Eliminar tablas antiguas:**
   ```sql
   -- SOLO después de confirmar que NO se usan
   DROP TABLE IF EXISTS conversation_history;
   DROP TABLE IF EXISTS interactions;
   ```

---

## 📚 API de Uso

### Guardar Mensaje

```javascript
const result = await conversationRepository.saveMessage({
  userPhone: '+593987770788',
  agent: 'axel',
  topic: 'collision_quote',
  role: 'user',
  content: 'Tengo un rayón en la puerta',
  metadata: {
    vehicle: { brand: 'Toyota', model: 'Corolla', year: 2020 },
    damage_severity: 'minor'
  }
});
// result = { id: 123, sessionId: 'uuid-...', success: true }
```

### Obtener Conversación

```javascript
const messages = await conversationRepository.getConversationByTopic(
  '+593987770788',
  'axel',
  'collision_quote',
  50 // límite
);

// messages = [
//   { id: 120, role: 'user', content: '...', timestamp: '...' },
//   { id: 121, role: 'assistant', content: '...', timestamp: '...' },
//   ...
// ]
```

### Guardar Archivo

```javascript
const file = await conversationRepository.saveFile({
  messageId: 123,
  userPhone: '+593987770788',
  agent: 'axel',
  fileType: 'image',
  fileUrl: 'https://wassenger.com/files/...',
  analysisResult: {
    damage_type: 'scratch',
    severity: 'minor',
    estimated_cost: 150
  }
});
```

### Obtener Archivos de un Tema

```javascript
const images = await conversationRepository.getFilesForTopic(
  '+593987770788',
  'axel',
  'collision_quote',
  'image' // tipo opcional
);

// images = [
//   {
//     id: 1,
//     file_url: 'https://...',
//     analysis_result: { damage_type: 'scratch', ... },
//     uploaded_at: '2026-01-11...'
//   },
//   ...
// ]
```

### Obtener Temas Activos

```javascript
const topics = await conversationRepository.getActiveTopics('+593987770788');

// topics = [
//   {
//     agent: 'axel',
//     topic: 'collision_quote',
//     status: 'active',
//     last_interaction: '2026-01-11...',
//     context_summary: 'Usuario enviando fotos de rayón...'
//   },
//   {
//     agent: 'gaby',
//     topic: 'consulting',
//     status: 'paused',
//     last_interaction: '2026-01-10...'
//   }
// ]
```

### Completar Tema

```javascript
await conversationRepository.completeTopicconversation(
  '+593987770788',
  'axel',
  'collision_quote'
);
```

### Resumen para Aurora

```javascript
const summary = await conversationRepository.getConversationSummaryForAurora(
  '+593987770788'
);

// summary = {
//   axel: [
//     {
//       topic: 'collision_quote',
//       messageCount: 15,
//       lastMessage: '2026-01-11T10:30:00Z',
//       lastAgentMessage: 'Perfecto, necesito que me envíes 3 fotos más...'
//     }
//   ],
//   gaby: [...]
// }
```

---

## 💡 Casos de Uso

### Caso 1: Axel - Procesamiento Batch de Imágenes

**Problema:** Axel responde una vez por cada imagen enviada, confundiendo al usuario.

**Solución:**

```javascript
// En wassenger.js - cuando llegan imágenes
if (message.hasMedia && message.media.type === 'image') {
  // Guardar imagen en DB
  await conversationAdapter.saveFile({
    messageId: savedMessage.id,
    userPhone: userId,
    agent: 'axel',
    fileType: 'image',
    fileUrl: message.media.url
  });
  
  // NO responder aún, esperar más imágenes
  // Implementar timeout de 10 segundos
  
  setTimeout(async () => {
    // Después de 10s, procesar todas las imágenes juntas
    const images = await conversationAdapter.getFilesForTopic(
      userId,
      'axel',
      'collision_quote',
      'image'
    );
    
    const unprocessed = images.filter(img => !img.processed);
    
    if (unprocessed.length > 0) {
      // Analizar todas juntas
      const analysis = await analyzeCollision(unprocessed);
      
      // Responder UNA SOLA VEZ
      await sendMessage(userId, analysis.response);
      
      // Marcar como procesadas
      for (const img of unprocessed) {
        await conversationRepository.updateFileAnalysis(img.id, analysis);
      }
    }
  }, 10000);
}
```

### Caso 2: Gaby - Contador de Interacciones

**Problema:** Necesita ofrecer cita presencial después de 5 interacciones.

**Solución:**

```javascript
// En gabi.js - cada vez que responde
const history = await conversationAdapter.loadConversationHistory(userId, 100, {
  agent: 'gaby',
  newOnly: true
});

const userMessages = history.filter(msg => msg.role === 'user');

if (userMessages.length === 5) {
  // Exactamente en la 5ta interacción, ofrecer cita
  await offerInPersonMeeting(userId);
}
```

### Caso 3: Aurora - Resumen de Otros Agentes

**Problema:** Aurora necesita saber qué ha hablado el usuario con otros agentes sin mezclar contextos.

**Solución:**

```javascript
// En aurora.js - cuando usuario pide resumen
if (userAsksForSummary) {
  const summary = await conversationAdapter.getConversationSummary(userId);
  
  let response = 'Claro, te hago un resumen:\n\n';
  
  for (const [agent, topics] of Object.entries(summary)) {
    response += `📌 Con ${agentNames[agent]}:\n`;
    for (const topic of topics) {
      response += `   - ${topicTranslations[topic.topic]}: ${topic.messageCount} mensajes\n`;
      response += `   - Último mensaje: "${topic.lastAgentMessage}"\n\n`;
    }
  }
  
  return response;
}
```

---

## ⚡ Performance y Escalabilidad

### Índices Optimizados

Todos los índices críticos están creados:

- **Búsqueda por usuario + agente:** `O(log n)` con índice compuesto
- **Filtrado por tema:** `O(log n)` con índice en `conversation_topic`
- **Ordenamiento temporal:** `O(1)` con índice DESC en timestamp
- **Archivos por mensaje:** `O(1)` con índice en `message_id`

### Estimaciones de Capacidad

Con la infraestructura actual de Heroku Postgres:

- **Conversaciones:** ~10M mensajes sin degradación
- **Archivos:** ~1M archivos (URLs, no almacenamiento directo)
- **Consultas típicas:** < 50ms con índices
- **Escrituras:** < 100ms

### Recomendaciones de Escalabilidad

1. **Archivos grandes:** Usar storage externo (S3, Cloudinary)
2. **Búsquedas complejas:** Implementar caché Redis para resúmenes frecuentes
3. **Limpieza automática:** Ejecutar `cleanOldConversations()` mensualmente
4. **Monitoreo:** Trackear tamaño de tablas y performance de queries

---

## 📞 Soporte

**Documentación creada por:** Coworkia Engineering Team  
**Fecha:** 2026-01-11  
**Versión del sistema:** 1.0.0

Para preguntas o issues, revisar:
- Este documento
- Código fuente con comentarios detallados
- Tests en `src/__tests__/`

---

**🎯 Estado de Implementación:**

- ✅ Base de datos diseñada
- ✅ Repositorio implementado
- ✅ Adapter de compatibilidad creado
- ✅ Script de migración listo
- ✅ Documentación completa
- ⏳ Migración de agentes (en progreso)
- 🔮 Tests end-to-end (pendiente)
