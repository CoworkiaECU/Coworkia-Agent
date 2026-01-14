# 🏗️ Diagramas de Arquitectura - Sistema Unificado de Conversaciones

## 📊 Diagrama de Tablas y Relaciones

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        SISTEMA UNIFICADO DE CONVERSACIONES                   │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────┐
│        USERS            │
│─────────────────────────│
│ phone_number (PK)       │
│ name                    │
│ email                   │
│ active_agent (legacy)   │
│ active_agents (JSONB)   │◄────────┐
│ context_preferences     │         │
│ ...                     │         │
└─────────────────────────┘         │
            │                        │
            │ 1:N                    │
            │                        │
            ▼                        │
┌─────────────────────────┐         │
│  AGENT_CONVERSATIONS    │         │
│─────────────────────────│         │
│ id (PK)                 │         │
│ user_phone (FK)         │─────────┘
│ agent                   │
│ conversation_topic      │
│ session_id              │
│ role                    │
│ content                 │
│ metadata (JSONB)        │
│ parent_message_id (FK)  │─┐
│ timestamp               │ │
└─────────────────────────┘ │
            │               │
            │ self-reference│
            └───────────────┘
            │
            │ 1:N
            ▼
┌─────────────────────────┐
│  CONVERSATION_FILES     │
│─────────────────────────│
│ id (PK)                 │
│ message_id (FK)         │
│ user_phone (FK)         │
│ agent                   │
│ file_type               │
│ file_url                │
│ file_data               │
│ processed               │
│ analysis_result (JSONB) │
│ uploaded_at             │
└─────────────────────────┘

┌─────────────────────────┐
│     ACTIVE_TOPICS       │
│─────────────────────────│
│ user_phone (PK)         │─────────┐
│ agent (PK)              │         │
│ topic (PK)              │         │
│ session_id              │         │
│ status                  │         │ 1:1
│ last_interaction        │         │
│ context_summary         │         │
└─────────────────────────┘         │
                                     │
            ┌────────────────────────┘
            │
            ▼
┌─────────────────────────┐
│   LEGACY TABLES         │
│   (Se mantienen)        │
│─────────────────────────│
│ interactions            │
│ conversation_history    │
│ partial_forms           │
│ ...                     │
└─────────────────────────┘
```

## 🔄 Flujo de Datos: Guardar Mensaje

```
┌─────────────┐
│   Usuario   │
│   envía     │
│   mensaje   │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────┐
│   Wassenger Webhook         │
│   /api/messages/wassenger   │
└──────────┬──────────────────┘
           │
           ▼
┌──────────────────────────────┐
│  conversationAdapter         │
│  .saveConversationMessage()  │
└──────┬───────────────────────┘
       │
       ├────────────────────────┐
       │                        │
       ▼                        ▼
┌─────────────────┐    ┌──────────────────┐
│  NUEVO SISTEMA  │    │  LEGACY SYSTEM   │
│                 │    │                  │
│ ┌─────────────┐ │    │ saveInteraction()│
│ │ Repository  │ │    │ (interactions)   │
│ └─────────────┘ │    │                  │
│       │         │    └──────────────────┘
│       ▼         │
│ agent_          │
│ conversations   │
│                 │
│ - Detecta tema  │
│ - Crea session  │
│ - Guarda metadata│
│                 │
│ ┌─────────────┐ │
│ │Update active│ │
│ │   topics    │ │
│ └─────────────┘ │
└─────────────────┘

RESULTADO:
✅ Mensaje en ambos sistemas
✅ Tema activo actualizado
✅ Session ID asignado
✅ Metadata preservada
```

## 📸 Flujo de Datos: Procesamiento de Imágenes (Axel)

```
┌────────────────────────────────────────────────────────────────┐
│              AXEL: Procesamiento Batch de Imágenes              │
└────────────────────────────────────────────────────────────────┘

Usuario envía 3 imágenes consecutivas:
   Imagen 1 → Imagen 2 → Imagen 3

┌─────────┐   ┌─────────┐   ┌─────────┐
│ Imagen1 │   │ Imagen2 │   │ Imagen3 │
└────┬────┘   └────┬────┘   └────┬────┘
     │             │             │
     └─────────────┴─────────────┘
                   │
                   ▼
        ┌──────────────────────┐
        │  Wassenger Webhook   │
        └──────────┬───────────┘
                   │
                   ▼
        ┌──────────────────────┐
        │ conversationAdapter  │
        │    .saveFile()       │
        └──────────┬───────────┘
                   │
                   ▼
        ┌─────────────────────────────┐
        │  conversation_files         │
        │  - Guarda cada imagen       │
        │  - messageId vinculado      │
        │  - processed = false        │
        │  - topic = collision_quote  │
        └──────────┬──────────────────┘
                   │
                   │ Timer 10 segundos
                   │
                   ▼
        ┌─────────────────────────────┐
        │  .getFilesForTopic()        │
        │  Obtiene todas las imágenes │
        │  no procesadas del tema     │
        └──────────┬──────────────────┘
                   │
                   ▼
        ┌─────────────────────────────┐
        │  GPT-4 Vision API           │
        │  Analiza TODAS juntas       │
        │  Resultado consolidado      │
        └──────────┬──────────────────┘
                   │
                   ▼
        ┌─────────────────────────────┐
        │  Respuesta ÚNICA al usuario │
        │  "Analicé tus 3 fotos..."   │
        │                             │
        │  .updateFileAnalysis()      │
        │  Marca processed = true     │
        └─────────────────────────────┘

ANTES: 3 respuestas separadas ❌
DESPUÉS: 1 respuesta consolidada ✅
```

## 🧠 Aurora: Resumen de Conversaciones

```
┌────────────────────────────────────────────────────────────────┐
│         AURORA: Coordinadora con Visión Multi-Agente            │
└────────────────────────────────────────────────────────────────┘

Usuario: "¿Qué he hablado con los otros agentes?"
   │
   ▼
┌─────────────────────────────┐
│  Aurora detecta solicitud   │
│  de resumen                 │
└──────────┬──────────────────┘
           │
           ▼
┌───────────────────────────────────────┐
│  conversationRepository               │
│  .getConversationSummaryForAurora()   │
└──────────┬────────────────────────────┘
           │
           │ Query SQL inteligente
           │ Agrupa por agente y tema
           │ Excluye mensajes de Aurora
           │
           ▼
┌─────────────────────────────────────────────────────┐
│  RESULTADO:                                         │
│                                                     │
│  {                                                  │
│    axel: [                                         │
│      {                                             │
│        topic: 'collision_quote',                   │
│        messageCount: 15,                           │
│        lastMessage: '2026-01-11T10:30:00Z',       │
│        lastAgentMessage: 'Necesito 3 fotos más'   │
│      }                                             │
│    ],                                              │
│    gaby: [                                         │
│      {                                             │
│        topic: 'consulting',                        │
│        messageCount: 8,                            │
│        lastMessage: '2026-01-10T15:20:00Z',       │
│        lastAgentMessage: 'Te envío la propuesta'  │
│      }                                             │
│    ]                                               │
│  }                                                  │
└──────────┬──────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────┐
│  Aurora construye respuesta inteligente:            │
│                                                     │
│  "Claro, te hago un resumen:                       │
│                                                     │
│  📌 Con Axel de PaintBull:                         │
│     - Cotización de colisión: 15 mensajes          │
│     - Último: 'Necesito 3 fotos más...'            │
│                                                     │
│  📌 Con Gaby de GR Consulting:                     │
│     - Consultoría: 8 mensajes                      │
│     - Último: 'Te envío la propuesta...'           │
│                                                     │
│  ¿Quieres continuar con alguno de ellos?"          │
└─────────────────────────────────────────────────────┘

SIN MEZCLAR CONTEXTOS ✅
SIN CONFUNDIR TEMAS ✅
VISIÓN COMPLETA ✅
```

## 📊 Gaby: Contador de Interacciones

```
┌────────────────────────────────────────────────────────────────┐
│      GABY: Sistema de Oferta de Reunión Presencial             │
└────────────────────────────────────────────────────────────────┘

Conversación progresiva:

Mensaje 1: "Hola Gaby"
   │
   ├─► conversationAdapter.saveMessage()
   │   topic: 'consulting'
   │   role: 'user'
   │
   └─► Contador: 1 ❌ (< 5)

Mensaje 2: "Necesito ayuda con finanzas"
   │
   └─► Contador: 2 ❌ (< 5)

Mensaje 3: "¿Cómo están sus precios?"
   │
   └─► Contador: 3 ❌ (< 5)

Mensaje 4: "Necesito más detalles"
   │
   └─► Contador: 4 ❌ (< 5)

Mensaje 5: "Me interesa"
   │
   ▼
┌─────────────────────────────────────┐
│  loadConversationHistory()          │
│  filter(role === 'user').length     │
│  = 5 ✅ TRIGGER                     │
└──────────┬──────────────────────────┘
           │
           ▼
┌─────────────────────────────────────┐
│  Gaby activa flujo de cita:         │
│                                     │
│  "¡Perfecto! Veo que tienes         │
│   varias consultas importantes.     │
│                                     │
│   ¿Te gustaría que nos reunamos     │
│   en persona en nuestras oficinas   │
│   de Coworkia para profundizar?"    │
│                                     │
│  [Formulario de agendamiento]       │
└─────────────────────────────────────┘

CONTADOR PRECISO ✅
OFERTA EN MOMENTO JUSTO ✅
NO INVASIVO ✅
```

## 🔄 Estrategia de Migración por Fases

```
┌───────────────────────────────────────────────────────────────┐
│                    ROADMAP DE MIGRACIÓN                        │
└───────────────────────────────────────────────────────────────┘

FASE 1: PREPARACIÓN ✅ COMPLETADO
├─ conversationRepository.js creado
├─ conversationAdapter.js creado
├─ Script de migración listo
├─ postgres-adapter.js actualizado
└─ Documentación completa

FASE 2: DESPLIEGUE DB ⏳ SIGUIENTE
├─ 1. Backup de Heroku Postgres
├─ 2. Ejecutar migración
├─ 3. Verificar tablas creadas
└─ 4. Confirmar migración de datos

FASE 3: MIGRACIÓN DE AXEL 🎯 PRIORIDAD 1
├─ collision-analysis.js
│  └─ Usar saveFile() para imágenes
│  └─ Implementar procesamiento batch
├─ axel.js
│  └─ Integrar conversationAdapter
└─ wassenger.js
   └─ Timer de 10s para batch

FASE 4: MIGRACIÓN DE GABY 🎯 PRIORIDAD 2
├─ gabi.js
│  └─ Implementar contador
│  └─ Sistema de oferta de cita
└─ Nuevo: gaby-meeting-scheduler.js
   └─ Integración Google Calendar
   └─ Email con template HTML

FASE 5: MIGRACIÓN DE AURORA 🎯 PRIORIDAD 3
├─ aurora.js
│  └─ Integrar resúmenes
│  └─ Comando para ver historial
└─ orquestador.js
   └─ Proporcionar contexto limpio

FASE 6: RESTO DE AGENTES
├─ Enzo, Adriana, Aluna, Ángela
└─ Uso directo de conversationAdapter

FASE 7: LIMPIEZA (4 semanas después)
├─ Deprecar funciones legacy
├─ Opcional: Eliminar tablas antiguas
└─ Documentar lecciones aprendidas

┌───────────────────────────────────────┐
│  COMPATIBILIDAD DURANTE MIGRACIÓN:    │
│  ✅ Código antiguo sigue funcionando  │
│  ✅ Nuevo código guarda en ambos      │
│  ✅ Sin downtime                      │
│  ✅ Rollback fácil si es necesario    │
└───────────────────────────────────────┘
```

## 📈 Beneficios por Componente

```
┌────────────────────────────────────────────────────────────────┐
│                    IMPACTO POR AGENTE                           │
└────────────────────────────────────────────────────────────────┘

┌──────────┬──────────────────────────────────────────────────┐
│  AXEL    │  ✅ Procesamiento batch de imágenes              │
│          │  ✅ Respuesta consolidada en 1-2 mensajes        │
│          │  ✅ Análisis más preciso (todas juntas)          │
│          │  ✅ Mejor experiencia para usuario angustiado    │
└──────────┴──────────────────────────────────────────────────┘

┌──────────┬──────────────────────────────────────────────────┐
│  GABY    │  ✅ Contador preciso de interacciones            │
│          │  ✅ Oferta de cita en momento perfecto           │
│          │  ✅ No invasiva, timing inteligente              │
│          │  ✅ Conversión mejorada                          │
└──────────┴──────────────────────────────────────────────────┘

┌──────────┬──────────────────────────────────────────────────┐
│  AURORA  │  ✅ Visión completa de otros agentes             │
│          │  ✅ Sin mezclar contextos                        │
│          │  ✅ Resúmenes inteligentes                       │
│          │  ✅ Coordinación efectiva                        │
└──────────┴──────────────────────────────────────────────────┘

┌──────────┬──────────────────────────────────────────────────┐
│  TODOS   │  ✅ Historial estructurado por tema              │
│          │  ✅ Metadata extensible                          │
│          │  ✅ Soporte de archivos nativo                   │
│          │  ✅ Performance optimizado                       │
└──────────┴──────────────────────────────────────────────────┘
```

---

**Creado por:** Coworkia Engineering Team  
**Fecha:** 2026-01-11  
**Versión:** 1.0.0
