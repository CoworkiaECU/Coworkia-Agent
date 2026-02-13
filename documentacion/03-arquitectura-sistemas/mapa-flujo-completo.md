# 🗺️ MAPA END-TO-END DEL FLUJO COMPLETO - Coworkia Agent

**Fecha:** 2026-01-13  
**Versión:** v413  
**Autor:** Análisis exhaustivo del sistema

---

## 📊 DIAGRAMA DE FLUJO COMPLETO

```
┌─────────────────────────────────────────────────────────────────────────┐
│  1️⃣ ENTRADA: WEBHOOK WASSENGER                                          │
└─────────────────────────────────────────────────────────────────────────┘
                              ↓
      POST /webhooks/wassenger (wassenger.js:217)
      ├─ validateWebhookSignature ← middleware HMAC
      ├─ rateLimitByPhone ← limite 20 msg/min
      └─ try { ... } catch (err) { timeout 30s }
                              ↓
┌─────────────────────────────────────────────────────────────────────────┐
│  2️⃣ VALIDACIÓN Y EXTRACCIÓN                                             │
└─────────────────────────────────────────────────────────────────────────┘
                              ↓
      ¿WASSENGER_ENABLED !== 'false'? ← Variable de entorno
      ├─ NO → return {ok, ignored, reason: 'wassenger_disabled'}
      └─ SÍ → continuar
                              ↓
      Extraer datos del body:
      ├─ userId = data.fromNumber || data.from
      ├─ text = data.body || data.message
      ├─ name = data.chat?.name || data.contact?.name
      ├─ messageType = data.type || 'text'
      └─ mediaUrl = construir URL con token si hay imagen
                              ↓
      ¿evt.includes('message:in')? ← Solo mensajes entrantes
      ├─ NO → return {ok, ignored, reason: 'not_incoming_message'}
      └─ SÍ → continuar
                              ↓
┌─────────────────────────────────────────────────────────────────────────┐
│  3️⃣ RAMIFICACIÓN POR TIPO DE MENSAJE                                    │
└─────────────────────────────────────────────────────────────────────────┘
                              ↓
      ¿messageType === 'image' | 'document' | 'pdf'?
      ├─────────── SÍ (IMÁGENES) ──────────────┐
      │                                         │
      │  [WASSENGER DEBUG] 🔄 loadProfile      │
      │  ↓                                      │
      │  const userProfile = await loadProfile(userId) ← PostgreSQL
      │  ↓                                      │
      │  [WASSENGER DEBUG] ✅ loadProfile OK   │
      │  ↓                                      │
      │  ¿activeAgent === 'AXEL'?              │
      │  ├─ SÍ + isPDF → rechazar PDF          │
      │  ├─ SÍ + !mediaUrl → procesar texto    │
      │  └─ SÍ + imagen → procesar con Vision  │
      │                                         │
      │  ¿activeAgent === 'AURORA' + isReceipt? │
      │  └─ SÍ → processPaymentReceipt()       │
      │                                         │
      └─ return res.json({ok, processed})      │
                              │
      └─────────── NO (TEXTO) ─────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────────┐
│  4️⃣ CARGA DE PERFIL Y CONTEXTO (wassenger.js:1238-1260)                │
└─────────────────────────────────────────────────────────────────────────┘
                              ↓
      [WASSENGER DEBUG] 🔄 loadProfile para texto
      ↓
      const current = await loadProfile(userId) ← 🔴 PUNTO CRÍTICO
      ├─ memoria-sqlite.js:89
      ├─ userRepository.findByPhone(userId) ← PostgreSQL
      ├─ getReservationHistory(userId) ← Query 1
      ├─ getUpcomingReservations(userId) ← Query 2
      ├─ dbGetPendingConfirmation(userId) ← Query 3
      └─ getJustConfirmedState(userId) ← Query 4
                              ↓
      ⏱️ TIEMPO TÍPICO: 50-100ms
      ⚠️ SI SE BLOQUEA: Timeout 30s → Aurora no responde
                              ↓
      [WASSENGER DEBUG] ✅ loadProfile completado
      ↓
      const conversationHistory = await loadConversationHistory(userId, 10)
      ├─ Carga últimos 10 mensajes
      └─ TIEMPO: 10-30ms
                              ↓
      Detectar nombre:
      ├─ cleanWhatsAppName(name) → Limpiar emojis/business
      └─ extractNameFromMessage(text) → Buscar "soy X", "me llamo X"
                              ↓
      Detectar email:
      └─ emailRegex.test(text) → buscar email@domain.com
                              ↓
      Calcular conversacionEnCurso:
      └─ (ahora - lastMessageAt) < 10 minutos
                              ↓
      profile = {
        ...current,
        userId,
        name: detectedName,
        email: detectedEmail,
        lastMessageAt: now(),
        conversationCount: count + 1,
        conversacionEnCurso
      }
                              ↓
      await saveProfile(userId, profile) ← PostgreSQL UPDATE
                              ↓
      await saveConversationMessage(userId, {role: 'user', content: text})
                              ↓
┌─────────────────────────────────────────────────────────────────────────┐
│  5️⃣ DETECCIÓN DE CONTEXTO ESPECIAL                                      │
└─────────────────────────────────────────────────────────────────────────┘
                              ↓
      ¿Comando cambio idioma? (/english, /español)
      ├─ SÍ → saveProfile({preferredLanguage}) + confirmar + return
      └─ NO → continuar
                              ↓
      ¿Auto-detectar idioma? (confidence > 0.7)
      ├─ SÍ → saveProfile({preferredLanguage})
      └─ NO → mantener idioma actual
                              ↓
      buildReplyContext(text, body, conversationHistory)
      ├─ ¿Mensaje es respuesta a otro mensaje citado?
      └─ enrichedMessage = agregar contexto del mensaje citado
                              ↓
      processedText = replyContext.hasReply ? enriched : text
                              ↓
      ¿Solicitud de reenvío? ("reenvía confirmación")
      ├─ SÍ → resendLastReservationConfirmation() + return
      └─ NO → continuar
                              ↓
┌─────────────────────────────────────────────────────────────────────────┐
│  6️⃣ ORQUESTADOR - NÚCLEO DE DECISIÓN (orquestador.js:56)               │
└─────────────────────────────────────────────────────────────────────────┘
                              ↓
      resultado = procesarMensaje(processedText, profile, conversationHistory, formData)
                              ↓
      ┌──────────────────────────────────────┐
      │  PASO 1: Obtener agente activo       │
      │  activeAgent = profile.activeAgent   │
      │  └─ Default: 'AURORA'                │
      └──────────────────────────────────────┘
                              ↓
      ┌───────────────────────────────────────────────────────────┐
      │  PASO 2: detectarIntencion(mensaje, activeAgent)          │
      │  (detectar-intencion.js:177)                              │
      │                                                            │
      │  Orden de prioridad:                                      │
      │  1. @mentions explícitas (@aurora, @enzo, @paula, etc)     │
      │  2. Contextos especiales:                                 │
      │     - Post-email support → requiere AURORA                │
      │     - Modificación reserva → requiere AURORA              │
      │     - Solicitud de link de pago → requiere AURORA         │
      │  3. Keywords por agente:                                  │
      │     - ALUNA_KEYWORDS: membresía, plan mensual, etc        │
      │     - PAULA_KEYWORDS: bienes raíces, casa, propiedad, etc │
      │     - AURORA_KEYWORDS: reserva, hot desk, sala            │
      │  4. Saludos casuales → mantener agente activo             │
      │  5. Por defecto → mantener agente activo                  │
      │                                                            │
      │  Return: {                                                │
      │    agent: 'AURORA' | 'ALUNA' | 'ENZO' | ...,             │
      │    reason: 'trigger @agente' | 'keywords' | ...,          │
      │    flags: {                                               │
      │      agentHandoff: boolean,                               │
      │      returningToAurora: boolean,                          │
      │      requiresAurora: boolean,                             │
      │      isKeywordMatch: boolean,                             │
      │      maintainingActive: boolean                           │
      │    }                                                       │
      │  }                                                         │
      └───────────────────────────────────────────────────────────┘
                              ↓
      ┌────────────────────────────────────────────────┐
      │  PASO 3: LÓGICA DE SELECCIÓN FINAL             │
      │  (orquestador.js:69-95)                        │
      │                                                 │
      │  IF agentHandoff || returningToAurora:         │
      │    → Usar agente detectado (cambio explícito)  │
      │  ELSE IF requiresAurora && activeAgent != AURORA: │
      │    → Forzar AURORA (contexto especial)         │
      │  ELSE IF isKeywordMatch && activeAgent != AURORA: │
      │    → MANTENER activeAgent (no cambiar)         │
      │  ELSE:                                          │
      │    → Usar agente detectado                     │
      │                                                 │
      │  agenteKey = decisión final                    │
      │  agente = AGENTES[agenteKey]                   │
      └────────────────────────────────────────────────┘
                              ↓
      ┌─────────────────────────────────────────────────┐
      │  PASO 4: Construir prompt del agente            │
      │  (orquestador.js:97-300)                        │
      │                                                  │
      │  systemPrompt = agente.getSystemPrompt(         │
      │    userLanguage,                                │
      │    perfilContexto                               │
      │  )                                               │
      │                                                  │
      │  prompt = construir con:                        │
      │    - Nombre de usuario                          │
      │    - Historial de conversación                  │
      │    - Datos de formulario parcial                │
      │    - Reservas pendientes/pasadas                │
      │    - Contexto específico del agente             │
      │                                                  │
      │  metadata = {                                   │
      │    agentKey,                                    │
      │    agentName,                                   │
      │    agentHandoff: bool,                          │
      │    targetAgent: string,                         │
      │    cancelacion: bool,                           │
      │    ... flags específicos                        │
      │  }                                               │
      └─────────────────────────────────────────────────┘
                              ↓
      return {
        agente: agenteKey,
        systemPrompt,
        prompt,
        metadata
      }
                              ↓
┌─────────────────────────────────────────────────────────────────────────┐
│  7️⃣ EJECUCIÓN Y MANEJO DE CASOS ESPECIALES                             │
└─────────────────────────────────────────────────────────────────────────┘
                              ↓
      ¿resultado.metadata.cancelacion?
      ├─ SÍ → clearPendingConfirmation() + clearJustConfirmed() + return
      └─ NO → continuar
                              ↓
      ¿resultado.metadata.agentHandoff? 🤝
      ├───── SÍ (HANDOFF) ──────────────────┐
      │                                      │
      │  SECUENCIA DE 3 MENSAJES:           │
      │  ┌──────────────────────────────┐   │
      │  │ 1. Transición (Agente actual)│   │
      │  │    "Te conecto con X..."     │   │
      │  │    ↓                          │   │
      │  │    enviarWhatsApp()          │   │
      │  │    esperar 2 segundos        │   │
      │  └──────────────────────────────┘   │
      │                                      │
      │  ┌──────────────────────────────┐   │
      │  │ 2. Llamado (Agente actual)   │   │
      │  │    "¡Nombre! te presento..."│   │
      │  │    ↓                          │   │
      │  │    enviarWhatsApp()          │   │
      │  │    esperar 10 segundos       │   │
      │  └──────────────────────────────┘   │
      │                                      │
      │  saveProfile(userId, {              │
      │    activeAgent: targetAgent         │
      │  }) ← CAMBIO DE ESTADO CRÍTICO      │
      │  ↓                                   │
      │  Recargar perfil actualizado:       │
      │  profile = await loadProfile(userId)│
      │  conversationHistory = await load...│
      │  ↓                                   │
      │  ┌──────────────────────────────┐   │
      │  │ 3. Entrada (Nuevo agente)    │   │
      │  │    "Hola, soy X. ¿En qué..." │   │
      │  │    ↓                          │   │
      │  │    enviarWhatsApp()          │   │
      │  └──────────────────────────────┘   │
      │                                      │
      │  Registrar handoff:                 │
      │  saveConversationMessage(...) x3    │
      │  ↓                                   │
      │  return res.json({ok, handoff: true})│
      │                                      │
      └───────── FIN HANDOFF ───────────────┘
                              │
      └─────── NO HANDOFF ─────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────────┐
│  8️⃣ GENERACIÓN DE RESPUESTA CON OPENAI                                 │
└─────────────────────────────────────────────────────────────────────────┘
                              ↓
      reply = await complete(resultado.prompt, {
        model: 'gpt-4o',
        system: resultado.systemPrompt,
        temperature: 0.7,
        max_tokens: 800
      })
      ↓
      ⏱️ TIEMPO TÍPICO: 2-5 segundos
      ⚠️ SI SE BLOQUEA: Circuit Breaker 30s → timeout
                              ↓
      ¿Necesita mejora de Aurora? (confirmaciones, pagos)
      ├─ SÍ → enhanceAuroraResponse(reply, profile)
      │       ├─ Agregar instrucciones de pago
      │       ├─ Agregar detalles de confirmación
      │       └─ Personalizar con nombre/email
      └─ NO → usar reply original
                              ↓
      finalReply = reply mejorada
                              ↓
┌─────────────────────────────────────────────────────────────────────────┐
│  9️⃣ ENVÍO A USUARIO Y PERSISTENCIA                                     │
└─────────────────────────────────────────────────────────────────────────┘
                              ↓
      envio = await enviarWhatsApp(userId, finalReply)
      ├─ dispatchHttpRequest('POST', 'https://api.wassenger.com/...')
      ├─ Headers: Authorization: Bearer WASSENGER_TOKEN
      └─ Body: { phone: userId, message: finalReply }
                              ↓
      ⏱️ TIEMPO TÍPICO: 100-500ms
      ⚠️ SI FALLA: Retry 3 veces con backoff exponencial
                              ↓
      ¿envio.ok?
      ├─ NO → Loggear error pero responder 200 OK a Wassenger
      └─ SÍ → continuar
                              ↓
      await saveInteraction(userId, {
        agent: resultado.agente,
        agentName: resultado.metadata.agentName,
        input: text,
        output: finalReply,
        intentReason: resultado.reason,
        meta: { route: '/webhooks/wassenger', via: 'whatsapp' }
      })
      ↓
      await saveConversationMessage(userId, {
        role: 'assistant',
        content: finalReply,
        agent: resultado.agente.toUpperCase()
      })
                              ↓
┌─────────────────────────────────────────────────────────────────────────┐
│  🔟 SISTEMAS POST-PROCESAMIENTO                                         │
└─────────────────────────────────────────────────────────────────────────┘
                              ↓
      ¿activeAgent === 'AXEL' && resultado contiene datos de cita?
      ├─ SÍ → Sistema AXEL de agendamiento
      │       ├─ Detectar fecha/hora confirmada
      │       ├─ Guardar cita en DB (axel_appointments)
      │       ├─ Limpiar estado de cotización
      │       └─ saveProfile(userId, {axelData: {...limpio}})
      └─ NO → skip
                              ↓
      ¿activeAgent === 'GABI' && contador >= 3?
      ├─ SÍ → Sistema GABI de reuniones
      │       ├─ shouldOfferMeeting(userId)
      │       ├─ generateMeetingOffer(userId, count)
      │       ├─ enviarWhatsApp(userId, meetingMessage)
      │       └─ markMeetingOffered(userId, conversationId)
      └─ NO → skip
                              ↓
┌─────────────────────────────────────────────────────────────────────────┐
│  1️⃣1️⃣ RESPUESTA AL WEBHOOK (ACK)                                       │
└─────────────────────────────────────────────────────────────────────────┘
                              ↓
      return res.json({
        ok: true,
        agent: resultado.agente,
        messageSent: envio.ok,
        reply: finalReply,
        confirmationActivated: confirmationActivated
      })
      ↓
      ⏱️ TIEMPO TOTAL TÍPICO: 3-8 segundos
      ⚠️ TIMEOUT HEROKU: 30 segundos (si se excede → H12 error)
                              ↓
      [FIN DEL FLUJO EXITOSO]
```

---

## 🔴 PUNTOS CRÍTICOS DE BLOQUEO

### 1. **loadProfile() - CRÍTICO** (línea 1238)
```javascript
const current = await loadProfile(userId)
```
**Queries ejecutadas:**
- `userRepository.findByPhone(userId)` → SELECT * FROM users WHERE phone_number = ?
- `getReservationHistory(userId)` → SELECT * FROM reservations WHERE user_phone = ? ORDER BY created_at DESC
- `getUpcomingReservations(userId)` → SELECT * FROM reservations WHERE user_phone = ? AND date >= CURRENT_DATE
- `dbGetPendingConfirmation(userId)` → SELECT * FROM pending_confirmations WHERE user_phone = ?
- `getJustConfirmedState(userId)` → SELECT * FROM reservation_state WHERE user_phone = ?

**Tiempo normal:** 50-100ms  
**Si se bloquea:** 30 segundos → TIMEOUT  
**Síntoma:** Aurora no responde, logs solo muestran "Webhook recibido"

### 2. **complete() - OpenAI** (línea ~1800)
```javascript
reply = await complete(resultado.prompt, {...})
```
**Servicio externo:** api.openai.com  
**Tiempo normal:** 2-5 segundos  
**Si se bloquea:** Circuit Breaker 30s → timeout  
**Síntoma:** Aurora demora extremadamente (1 hora)

### 3. **enviarWhatsApp() - Wassenger API**
```javascript
await enviarWhatsApp(userId, finalReply)
```
**Servicio externo:** api.wassenger.com  
**Tiempo normal:** 100-500ms  
**Si se bloquea:** Retry 3x con backoff → máx 5s  
**Síntoma:** Mensaje no se envía pero webhook responde OK

---

## 🗺️ MAPA DE ESTADOS DEL SISTEMA

### Estados en PostgreSQL (tabla: users)

| Campo | Tipo | Descripción | Modificado por |
|-------|------|-------------|----------------|
| `phone_number` | VARCHAR(20) PK | ID del usuario | N/A |
| `name` | VARCHAR(255) | Nombre detectado | wassenger.js:1264 |
| `email` | VARCHAR(255) | Email detectado | wassenger.js:1280 |
| `whatsapp_display_name` | VARCHAR(255) | Nombre de WhatsApp | wassenger.js:1303 |
| `first_visit` | BOOLEAN | Primera vez | confirmation-flow.js |
| `free_trial_used` | BOOLEAN | Trial usado | confirmation-flow.js |
| `conversation_count` | INTEGER | Contador mensajes | wassenger.js:1306 |
| `last_message_at` | TIMESTAMP | Última interacción | wassenger.js:1305 |
| `active_agent` | VARCHAR(50) | **ESTADO CRÍTICO** | wassenger.js:1840 (handoff) |
| `preferred_language` | VARCHAR(10) | Idioma preferido | wassenger.js:1703 |

### Flujo de `activeAgent`

```
[INICIO] → activeAgent = 'AURORA' (default)
                    ↓
         [Usuario envía mensaje]
                    ↓
    detectarIntencion(mensaje, activeAgent)
                    ↓
         ¿Hay handoff explícito?
         ├─ NO → MANTENER activeAgent actual
         └─ SÍ → ┌─────────────────────────────┐
                 │ CAMBIO DE ESTADO:           │
                 │ saveProfile(userId, {       │
                 │   activeAgent: nuevoAgente  │
                 │ })                          │
                 └─────────────────────────────┘
                              ↓
         [Siguiente mensaje usa nuevo activeAgent]
```

**Cambios de estado documentados:**
1. `@aurora` → activeAgent = 'AURORA'
2. `@aluna` o keywords membresía → activeAgent = 'ALUNA'
3. `@enzo` → activeAgent = 'ENZO'
4. `@adriana` → activeAgent = 'ADRIANA'
5. `@angela` → activeAgent = 'ANGELA'
6. `@axel` o colisión → activeAgent = 'AXEL'
7. `@gabi` o finanzas → activeAgent = 'GABI'
8. `@paula` o keywords inmobiliaria → activeAgent = 'PAULA'

---

## 🔍 ANÁLISIS DE DEPENDENCIAS

### Dependencias Críticas en Orden

```
wassenger.js
  ├─ memoria-sqlite.js (loadProfile, saveProfile)
  │   ├─ userRepository.js (findByPhone, createOrUpdate)
  │   │   └─ database.js (get, all, run)
  │   │       └─ postgres-adapter.js (pool.query)
  │   │           └─ PostgreSQL DATABASE_URL
  │   └─ reservationRepository.js (getReservations)
  │       └─ database.js → PostgreSQL
  │
  ├─ orquestador.js (procesarMensaje)
  │   ├─ detectar-intencion.js (detectarIntencion)
  │   │   └─ KEYWORDS y PATTERNS (estáticos)
  │   ├─ aurora.js, aluna.js, enzo.js, ... (AGENTES)
  │   │   └─ getSystemPrompt() (funciones puras)
  │   └─ aurora-coordinator.js (shouldHandover, detectTopic)
  │       └─ conversationAdapter.js → PostgreSQL
  │
  ├─ openai.js (complete)
  │   └─ https://api.openai.com/v1/chat/completions
  │
  └─ external-dispatcher.js (enviarWhatsApp)
      └─ https://api.wassenger.com/v1/messages
```

### Servicios Externos

| Servicio | URL | Timeout | Retry | Circuit Breaker |
|----------|-----|---------|-------|-----------------|
| PostgreSQL | DATABASE_URL | 10s | No | No ⚠️ |
| OpenAI | api.openai.com | 30s | 3x | Sí ✅ |
| Wassenger | api.wassenger.com | 5s | 3x | Sí ✅ |

---

## ⚠️ PROBLEMAS IDENTIFICADOS

### 1. **PostgreSQL Sin Circuit Breaker**
- ❌ Si PostgreSQL no responde, `loadProfile()` se bloquea indefinidamente
- ❌ No hay timeout configurado en las queries
- ❌ No hay retry logic
- 🔧 **Solución:** Agregar timeout de 10s con Promise.race()

### 2. **Dyno Heroku Dormido (Plan Eco)**
- ❌ Dyno se duerme después de 30 min inactividad
- ❌ Webhook llega mientras dyno despierta → delay 6-10s
- ❌ Si suma bloqueos, excede 30s → TIMEOUT
- 🔧 **Solución:** Healthcheck cada 25 minutos

### 3. **Logs de Debug Inconsistentes**
- ❌ `[WASSENGER DEBUG]` logs agregados NO aparecen en Heroku
- ❌ Significa que el código ni siquiera llega a ejecutarse
- 🔧 **Solución:** Logs faltaron en despliegue o crash antes de llegar ahí

### 4. **Múltiples Queries Secuenciales**
- ❌ `loadProfile()` hace 5 queries en serie: 50+50+50+50+50 = 250ms
- 🔧 **Solución:** Ejecutar queries en paralelo con Promise.all()

### 5. **Sin Correlation ID**
- ❌ Imposible trazar un mensaje a través del sistema
- ❌ No se puede correlacionar webhook → query → OpenAI → respuesta
- 🔧 **Solución:** Agregar `requestId` en todos los logs

---

## 📊 MÉTRICAS NORMALES vs CRÍTICAS

| Etapa | Tiempo Normal | Tiempo Crítico | Síntoma |
|-------|---------------|----------------|---------|
| Validación webhook | < 10ms | N/A | - |
| loadProfile() | 50-100ms | **30s (timeout)** | Aurora no responde |
| loadConversationHistory() | 10-30ms | 30s | Aurora no responde |
| detectarIntencion() | < 5ms | N/A | Lógica local |
| procesarMensaje() | < 10ms | N/A | Lógica local |
| complete() OpenAI | 2-5s | **30s (circuit breaker)** | Aurora demora extrema |
| enviarWhatsApp() | 100-500ms | 5s (retry) | Mensaje no enviado |
| **TOTAL NORMAL** | **3-8s** | **30s+** | **TIMEOUT H12** |

---

## 🎯 CONCLUSIONES

### Flujo Normal (3-8 segundos)
1. ✅ Webhook llega y se valida
2. ✅ loadProfile() responde en 50-100ms
3. ✅ Orquestador decide agente en < 10ms
4. ✅ OpenAI responde en 2-5s
5. ✅ Wassenger envía en 100-500ms
6. ✅ Usuario recibe respuesta

### Flujo con Bloqueo (30+ segundos → TIMEOUT)
1. ✅ Webhook llega
2. ❌ loadProfile() se bloquea (PostgreSQL lento/dormido)
3. ⏸️ Todo se detiene esperando queries
4. ⏱️ 30 segundos después: TIMEOUT H12
5. ❌ Usuario no recibe respuesta
6. ❌ Aurora parece "muerta"

### Punto de Fallo Principal
**`loadProfile()` en línea 1238 es el cuello de botella crítico**
- Sin timeout
- Sin circuit breaker
- Sin fallback
- 5 queries secuenciales
- Si PostgreSQL falla → todo falla

---

## 🚀 PRÓXIMOS PASOS (Ver T2-T8)

1. **T2:** Analizar latencia extrema en detalle
2. **T3:** Auditar Wassenger (HMAC, rate limit, timeouts)
3. **T4:** Optimizar queries PostgreSQL (índices, paralelo)
4. **T5:** Auditar cada agente individualmente
5. **T6:** Agregar circuit breakers y timeouts
6. **T7:** Implementar observabilidad completa
7. **T8:** Crear suite de tests E2E

---

**Documentación generada:** 2026-01-13  
**Próxima tarea:** T2 - Análisis de latencia extrema
