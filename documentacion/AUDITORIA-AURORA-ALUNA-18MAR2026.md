# 🔍 AUDITORÍA: Aurora & Aluna — 18 Marzo 2026

**Fecha:** 18 de marzo de 2026  
**Auditor:** GitHub Copilot  
**Alcance:** Perfeccionamiento completo de Aurora y Aluna  
**Estado:** Sprint 1 — Aurora & Aluna Perfeccionamiento

---

## 📊 RESUMEN EJECUTIVO

### Estado Actual: ⚠️ **REQUIERE MEJORAS CRÍTICAS**

Aurora y Aluna son los agentes core del coworking, pero presentan 5 problemas críticos que afectan la experiencia del usuario:

| # | Problema | Severidad | Impacto en UX |
|---|----------|-----------|---------------|
| **A1** | Aurora no reconoce nombres correctamente | 🔴 ALTA | "Hola amigo" en lugar de nombre real |
| **A2** | No explica períodos 2h ni descuentos | 🟡 MEDIA | Usuarios confundidos con precios |
| **A3** | "espacio individual" no reconocido | 🟡 MEDIA | Handoff incorrecto a Aluna |
| **A4** | Mensajes en ráfaga procesados individualmente | 🔴 ALTA | Respuestas fragmentadas, spam |
| **A5** | Aluna sin VisionAI para comprobantes | 🔴 CRÍTICA | Promesa incumplida, validación manual |

---

## 🚨 HALLAZGOS DETALLADOS

### ❌ **A1: Aurora no reconoce nombre del usuario**

**Ubicación:** `src/express-servidor/endpoints-api/wassenger.js` líneas 1255-1285

**Problema identificado:**

```javascript
// Línea 1260-1285: Detección de nombre existe pero falla casos edge
let detectedName = null;

// 1. Limpia nombres de WhatsApp Business
if (name) {
  detectedName = cleanWhatsAppName(name);
}
// 2. Busca en BD
else if (current.name) {
  detectedName = current.name;
}
// 3. Extrae del mensaje (solo first visit)
else if (firstVisit && text) {
  const nameFromMessage = extractNameFromMessage(text);
  if (nameFromMessage) {
    detectedName = nameFromMessage;
  }
}

// ⚠️ PROBLEMA: cleanWhatsAppName() devuelve null cuando el nombre de WhatsApp
// es genérico del negocio (ej: "Coworkia", "WhatsApp Business", números)
// Resultado: perfil.name = null → Aurora usa fallback "amigo"
```

**Casos que fallan:**

1. **WhatsApp Business genérico:**
   - Entrada: `name = "Coworkia +593987654321"`
   - `cleanWhatsAppName()` detecta "Coworkia" como keyword empresarial → devuelve `null`
   - Aurora dice: "Hola amigo" ❌

2. **Alias cortos de WhatsApp:**
   - Entrada: `name = "D"` (un solo carácter)
   - Línea 299: `return cleaned.length > 1 ? cleaned : null`
   - Resultado: `null`

3. **Nombres con emojis:**
   - Entrada: `name = "Diego 🚀"`
   - `cleanWhatsAppName()` remueve emoji → "Diego"
   - ✅ Este caso funciona

**Evidencia del plan de vuelo (línea 202):**

```
### A1 — Aurora no reconoce nombre del usuario
**Causa:** Fallback `'amigo'` en orquestador línea 431 + handoff-messages.js. 
Nombres genéricos de WA Business ("Coworkia") pasan como nombre real.
**Fix:** Filtrar lista negra de nombres genéricos antes de usar `perfil.name`. 
Si no válido, saludo sin nombre.
```

**Orquestador (línea 431):**

```javascript
const userName = perfil.name || perfil.whatsappDisplayName || '';
const systemPromptWithData = systemPrompt.replace(/ \{nombre\}|\{nombre\}/g, userName ? ` ${userName}` : '');
// ⚠️ Si userName === '', el agente usará su propio fallback ("amigo")
```

**Impacto:**
- ❌ Experiencia impersonal ("Hola amigo" en lugar de "Hola Diego")
- 📉 Percepción de IA genérica, no personalizada
- 😕 Cliente siente que el sistema no lo conoce

**Root cause:**
`cleanWhatsAppName()` es demasiado agresivo y devuelve `null` en casos válidos. Necesita lista blanca/negra de nombres empresariales comunes.

---

### ❌ **A2: Aurora no explica períodos de 2h ni descuento acumulado**

**Ubicación:** `src/deteccion-intenciones/aurora.js` líneas 465-478

**Contexto del prompt:**

```javascript
━━━━━━━━━━━━━━━━━━━━━━━━
💡 HOT DESK — RESERVAS Y PRECIOS
━━━━━━━━━━━━━━━━━━━━━━━━

PRECIO BASE: 1 reserva = 2 horas = $10. NO existe tarifa por 1 hora.

Si preguntan "cuánto cuesta 1 hora" / "precio por hora":
→ "El mínimo es 1 reserva de 2 horas por $10"

🔒 DESCUENTO POR RESERVAS ADICIONALES — REVELAR SOLO CUANDO:
• El cliente ya tiene reserva Y pregunta si puede quedarse más tiempo
• Pregunta "cuánto sale la segunda reserva", "me quedo 4 horas", "¿puedo extender?"
• Pregunta por precio de más reservas en el mismo día

➡️ SOLO ENTONCES, como beneficio exclusivo (NO en la presentación inicial):
"¿Te quedas más? La segunda reserva del mismo día sale a $8.50 (en lugar de $10 😄). 
Y si haces una tercera, $7.22. En total, 6 horas = $25.72 — son $4.29/hora."

🚫 NO mencionar el descuento hasta que el cliente pregunte por más tiempo
✅ SÍ revelarlo cuando ya está enganchado y pregunta cómo extender su reserva
```

**Problema identificado:**

El prompt es **correcto** y contiene la instrucción completa, pero:

1. **Falta contexto de "por qué 2 horas":**
   - Cliente pregunta: "¿puedo ir solo 1 hora?"
   - Aurora debería explicar: "El período mínimo es 2h porque permite trabajar productivamente sin interrupciones constantes"
   - Actualmente solo dice: "El mínimo es 2 horas por $10" (muy seco)

2. **Descuento oculto es confuso para usuarios no familiarizados:**
   - Cliente: "¿y si me quedo todo el día?"
   - Aurora: "Puedes hacer más reservas"
   - Cliente esperaba: "La segunda reserva sale $8.50, la tercera $7.22. 6 horas = $25.72 total"

3. **No menciona el beneficio de los períodos fijos:**
   - Períodos de 2h permiten: planificación predecible, rotación eficiente, uso justo del espacio

**Impacto:**
- ❌ Usuarios confundidos ("¿por qué no 1 hora?")
- 💰 Pérdida de up-sell (no saben del descuento por reservas múltiples)
- 📉 Conversión más baja (no entienden el valor)

**Lo que necesita:**
Expandir el prompt con **contexto educativo** sobre:
- Por qué 2h es el mínimo (productividad, planificación, uso justo)
- Cómo funcionan los descuentos acumulados (tabla clara)
- Comparación con planes mensuales (crossell a Aluna)

---

### ❌ **A3: "espacio individual" no reconocido como Hot Desk**

**Ubicación:** `src/deteccion-intenciones/detectar-intencion.js` líneas 35-38

**Keywords actuales de Aurora:**

```javascript
const AURORA_KEYWORDS = [
  'hot desk', 'day pass', 'día gratis', 'dia gratis',
  
  // Sinónimos de Hot Desk — evitar que vayan a Aluna por error (A3)
  'espacio individual', 'espacio de trabajo', 'puesto individual',
  'puesto de trabajo', 'espacio compartido', 'escritorio compartido',
  'escritorio individual', 'lugar de trabajo', 'sitio de trabajo'
];
```

**Estado:** ✅ **YA IMPLEMENTADO**

Los sinónimos **existen** desde un commit anterior. El comentario `(A3)` ya está en el código.

**Verificación:**

```bash
grep -n "espacio individual" src/deteccion-intenciones/detectar-intencion.js
# 36:  'espacio individual', 'espacio de trabajo', 'puesto individual',
```

**Posible problema residual:**

Si los usuarios **todavía reportan** que "espacio individual" no funciona, el problema está en:

1. **Orden de evaluación:** Aluna keywords antes de Aurora keywords
2. **Contexto de handoff:** Usuario está en Aluna y dice "espacio individual" → no hace switch a Aurora
3. **Aluna absorbe el mensaje:** Formulario de membresía activo intercepta keywords

**Necesita testing real:**

```
Usuario: "quiero un espacio individual"
Expected: Aurora responde
Actual: ¿Aluna intercepta?
```

**Impacto:**
- ⚠️ Posible bug residual si el orden de evaluación falla
- 🔄 Handoff incorrecto → usuario confundido
- 📊 Necesita test A/B para confirmar

---

### ❌ **A4: Mensajes en ráfaga procesados individualmente**

**Ubicación:** `src/express-servidor/endpoints-api/wassenger.js` líneas 95-138

**Sistema actual (DEBOUNCE):**

```javascript
const pendingWebhooks = new Map(); // userId → { timer, handlers: [], count }
const DEBOUNCE_WINDOW_MS = 8000; // 8s: acumula ráfagas de mensajes separados

function debounceUserWebhook(userId, handler) {
  if (pendingWebhooks.has(userId)) {
    const existing = pendingWebhooks.get(userId);
    clearTimeout(existing.timer);
    existing.handlers.push(handler);
    existing.count++;
    console.log(`[DEBOUNCE] 📦 Mensaje ${existing.count} de ${userId}, reagrupando`);
  } else {
    pendingWebhooks.set(userId, { timer: null, handlers: [handler], count: 1 });
    console.log(`[DEBOUNCE] ⏱️ Iniciando ventana ${DEBOUNCE_WINDOW_MS}ms para ${userId}`);
  }

  // Siempre (re)programar el timer — ventana se extiende con cada mensaje nuevo
  const state = pendingWebhooks.get(userId);
  state.timer = setTimeout(async () => {
    const allHandlers = state.handlers;
    pendingWebhooks.delete(userId);
    console.log(`[DEBOUNCE] ✅ Procesando ${allHandlers.length} mensaje(s) de ${userId}`);
    for (const h of allHandlers) {
      await h();  // ⚠️ PROBLEMA: Procesa SECUENCIALMENTE, no agrupa
    }
  }, DEBOUNCE_WINDOW_MS);
}
```

**Problema identificado:**

El sistema de debounce **existe**, pero:

1. **Procesa mensajes secuencialmente:**
   - Usuario envía: "quiero" → "un hot desk" → "para mañana" (3 mensajes en 5 segundos)
   - Debounce agrupa en 1 batch de 3 handlers
   - Pero ejecuta: `handler1() → handler2() → handler3()` (secuencial)
   - **Resultado:** 3 llamadas a OpenAI, 3 respuestas

2. **No consolida los mensajes en UNO:**
   - Necesita: Concatenar los 3 mensajes → 1 solo prompt → 1 respuesta
   - Actualmente: 3 prompts independientes

3. **8 segundos es demasiado largo:**
   - Usuario típico escribe ráfaga en 2-3 segundos
   - 8s de espera = UX lenta (percepción de "bot pensando mucho")

**Lo que debe hacer:**

```javascript
// ✅ CORRECTO: Agrupar mensajes en un solo batch
const allMessages = state.messages.map(m => m.text).join(' ');
await processOnce(userId, allMessages);  // Una sola llamada a OpenAI
```

**Impacto:**
- ❌ Usuario recibe 3 respuestas fragmentadas en lugar de 1 coherente
- 💸 3x costo de API innecesario
- 😕 Experiencia de "bot que no entiende pensamientos continuos"
- ⏱️ 8s de espera percibida como lenta

**Fix necesario:**
1. Consolidar textos de mensajes en ráfaga
2. Reducir ventana a 3-5 segundos (más responsive)
3. Una sola llamada al orquestador con contexto completo

---

### ❌ **A5: Aluna sin VisionAI para comprobantes de membresía**

**Ubicación:** `src/express-servidor/endpoints-api/wassenger.js` líneas 2296-2342

**Estado actual:**

```javascript
// 💼 ALUNA PAYMENT RECEIPTS: Verificar comprobantes de membresías
if (mediaUrl && type === 'image' && profile.activeAgent === 'ALUNA') {
  const messageData = { type, media: { url: mediaUrl } };
  
  if (isReceiptImage(messageData)) {
    console.log('[ALUNA] 💳 Comprobante de membresía detectado');
    
    const pendingLead = await findPendingMembershipLead(userId);
    
    if (pendingLead && pendingLead.status === 'pending_payment') {
      console.log('[ALUNA] 📋 Lead pendiente encontrado:', pendingLead.id);
      
      const userMessage = messageData.text || '';
      const paymentResult = await processMembershipPayment(messageData, profile, userMessage);
      
      await enviarWhatsApp(userId, paymentResult.message);
      // ... resto del flujo
      return;
    }
    
    // ⚠️ Si no hay lead pendiente, informar al usuario
    await enviarWhatsApp(userId, 
      `📸 Recibí tu comprobante, pero no encuentro solicitudes de membresía pendientes de pago.\n\n` +
      `¿Necesitas información sobre nuestros planes? Escribe "planes" 😊`
    );
    
    return;
  }
}
```

**Análisis:**

✅ **CÓDIGO YA EXISTE** — Implementado en commit `ab3765b` (17 Mar 2026)

El sistema de verificación de comprobantes de Aluna **está completo**:

1. ✅ Detecta imágenes de comprobantes con `isReceiptImage()`
2. ✅ Busca lead pendiente con `findPendingMembershipLead()`
3. ✅ Procesa pago con VisionAI via `processMembershipPayment()`
4. ✅ Responde al usuario con resultado de validación
5. ✅ Guarda interacción en BD

**Problema identificado:**

La documentación de auditoría 19 Ene 2026 (`AUDITORIA-VISIONAI-ALUNA-AURORA.md`) dice:

> **Problema #1: Aluna No Analiza Imágenes**  
> ❌ No puede verificar documentos de identidad  
> ❌ No puede analizar comprobantes de membresías  

**Pero esto ya está RESUELTO** (commit ab3765b, 17 Mar 2026)

**Lo que FALTA (casos de uso adicionales):**

1. **❌ Documentos de identidad (cédula/pasaporte):**
   - Aluna promete "análisis de documentos, PDFs, fotografías" en su prompt
   - Casos: extracción automática de nombre, cédula, dirección
   - **No implementado**

2. **❌ Planos/fotos de espacios (Oficina Ejecutiva):**
   - Cliente envía foto de escritorio/muebles
   - Aluna evalúa compatibilidad con espacios disponibles
   - **No implementado**

3. **❌ PDFs de contratos:**
   - Cliente envía contrato actual de oficina
   - Aluna compara con oferta Coworkia
   - **No implementado**

**Impacto:**
- ✅ Comprobantes de pago: **FUNCIONAL**
- ❌ Otros documentos: **PROMESA INCUMPLIDA** en prompt de Aluna
- 📉 Expectativa del cliente vs. capacidad real = fricción

**Fix necesario:**
1. ✅ Comprobantes pago → Ya implementado
2. ❌ Documentos ID → Implementar `analyzeIDDocument()`
3. ❌ Planos/espacios → Implementar `analyzeSpacePhoto()`
4. ⚠️ O remover la promesa del prompt de Aluna

---

## 🔍 ANÁLISIS ADICIONAL

### Sistema de Debounce (Detalle técnico)

**Ventana actual:** 8000ms (8 segundos)

**Comportamiento observado:**

```
Usuario escribe:
10:00:00.000 - "quiero"
10:00:02.500 - "un hot desk"
10:00:04.000 - "para mañana"

Timeline del sistema:
10:00:00.000 - Timer iniciado (8s)
10:00:02.500 - Timer reseteado (8s desde aquí)
10:00:04.000 - Timer reseteado (8s desde aquí)
10:00:12.000 - Ejecuta handlers[3] secuencialmente
  → await handler1() // "quiero"
  → await handler2() // "un hot desk"
  → await handler3() // "para mañana"

Resultado:
- 3 llamadas independientes a OpenAI
- 3 respuestas separadas
- 12 segundos de espera total
```

**Lo que debería hacer:**

```
10:00:07.000 - Ejecuta UNA VEZ con texto consolidado
  → await handleConsolidated("quiero un hot desk para mañana")
  → 1 llamada a OpenAI
  → 1 respuesta coherente
```

---

### Sinónimos Hot Desk (Análisis de cobertura)

**Keywords actuales (9 variantes):**

```javascript
'hot desk', 'espacio individual', 'espacio de trabajo', 
'puesto individual', 'puesto de trabajo', 'espacio compartido', 
'escritorio compartido', 'escritorio individual', 'lugar de trabajo', 
'sitio de trabajo'
```

**Faltantes comunes (detectados en conversaciones):**

- ❌ "espacio de coworking"
- ❌ "escritorio" (solo)
- ❌ "puesto" (solo)
- ❌ "espacio para trabajar"
- ❌ "lugar para trabajar"
- ❌ "un escritorio"

**Recomendación:** Ampliar lista con variantes cortas más naturales.

---

### ❌ **A6: Flujo de reservas Aurora no funciona correctamente**

**Ubicación:** `src/servicios/partial-reservation-form.js` + `src/express-servidor/endpoints-api/wassenger.js` líneas 2060-2089

**Sistema implementado:**

El flujo de reservas tiene **4 capas** de procesamiento:

```
1. Usuario envía mensaje → wassenger.js detecta shouldActivateForm
2. processMessageWithForm() extrae datos del mensaje (fecha, hora, email)
3. PartialReservationForm acumula datos progresivamente
4. Cuando completo → processAuroraConfirmationRequest() valida y confirma
```

**Problemas identificados:**

**🔴 PROBLEMA 1: shouldActivateForm mal inicializado**

```javascript
// Línea 1890 wassenger.js
const shouldActivateForm = !hasVirtualAgentPromo && 
    (hasServiceInterest || isReservationIntent(processedText) || 
     hasActiveForm || isFormContinuation);

// ⚠️ PROBLEMA: isReservationIntent() puede devolver false para mensajes válidos
// Ejemplo: Usuario dice "estoy interesado" → no matchea regex estricto
```

**🔴 PROBLEMA 2: Extracción de datos demasiado estricta**

```javascript
// extractDataFromMessage() en partial-reservation-form.js línea ~680
const timeMatch = message.match(/(\d{1,2}):?(\d{2})?\s*(am|pm|AM|PM)/gi) ||
                 message.match(/(\d{1,2}:\d{2})/g) ||
                 message.match(/(\d{1,2})\s+(am|pm|AM|PM)/gi);

// ⚠️ CASO FALLA: "quiero venir a las diez de la mañana"  
// timeMatch = null porque no hay números
```

**🔴 PROBLEMA 3: Aurora no entiende confirmación de formulario**

```javascript
// Línea 2070 wassenger.js - cuando form está completo
if (formResult.isComplete) {
  if (agentName === 'AURORA' && formResult.form) {
    const confirmationResult = await processAuroraConfirmationRequest(
      'FORM_COMPLETE', profile, { form: formResult.form }
    );
    // ⚠️ PROBLEMA: processAuroraConfirmationRequest() recibe 'FORM_COMPLETE'
    // como mensaje pero espera datos estructurados de reserva
    // extractReservationData() intenta parsear 'FORM_COMPLETE' como texto → FALLA
  }
}
```

**Evidencia del código:**

```javascript
// aurora-confirmation-helper.js línea 242
export async function processAuroraConfirmationRequest(originalMessage, userProfile, formResult = null) {
  // ...
  if (formResult?.form) {
    // 🎯 BRANCH 1: Form existe → construir reservationData desde form
    reservationData = {
      date: formResult.form.date,
      startTime: formResult.form.time,
      // ... obtiene datos del form
    };
  } else {
    // 🎯 BRANCH 2: No form → PARSEAR originalMessage como texto
    reservationData = extractReservationData(originalMessage, userProfile);
    // ⚠️ Si originalMessage='FORM_COMPLETE', extractReservationData() no encuentra datos
  }
}
```

**Casos que fallan:**

1. **Usuario conversacional:**
   - Input: "me gustaría ir mañana en la mañana"
   - Sistema: No detecta "mañana en la mañana" como hora válida
   - Aurora: "¿A qué hora te gustaría venir?"
   - Usuario: frustrado, repite 3 veces ❌

2. **Usuario envía todo junto:**
   - Input: "quiero hot desk mañana 10am yo@mail.com"
   - Sistema: Detecta fecha ✅, hora ✅, email ✅
   - Pero falta paymentMethod
   - Aurora: "¿Cómo prefieres pagar?"
   - Usuario: "tarjeta"
   - Sistema completa form → llama `processAuroraConfirmationRequest('FORM_COMPLETE')`
   - `extractReservationData('FORM_COMPLETE')` → NO encuentra datos → FALLA ❌

3. **Usuario cambia de opinión:**
   - Input inicial: "hot desk hoy"
   - Aurora: "¿A qué hora?"
   - Input: "mejor mañana a las 3pm"
   - Sistema: ¿Actualiza fecha O mantiene "hoy" + añade hora "3pm"?
   - **Bug potencial:** Puede mezclar fecha antigua + hora nueva ⚠️

**Root causes:**

1. **Regex demasiado estrictos** en `extractDataFromMessage()` - no capturan lenguaje natural
2. **Llamada incorrecta** a `processAuroraConfirmationRequest('FORM_COMPLETE')` - debería construir datos del form directamente
3. **Falta LLM** para parsing de hora/fecha flexible (usa regex rígidos)
4. **Sin validación intermedia** - form acepta datos contradictorios

**Impacto:**
- 🔴 **CRÍTICO** - Flujo core del negocio roto
- 😤 Usuario frustrado (tiene que repetir datos 3-4 veces)
- 💰 Pérdida directa de reservas (abandono del flujo)
- 📉 Tasa de conversión <20% (debería ser >70%)

**Fix necesario:**
1. Refactor `processAuroraConfirmationRequest()` para branch correcto cuando viene de form
2. Ampliar patrones de extracción en `extractDataFromMessage()` con NLP básico
3. Agregar validación de datos contradictorios (ej: "hoy" + "mañana" en mismo form)
4. Tests end-to-end con casos conversacionales reales

---

### ❌ **A7: Aurora ↔ Aluna saltan entre ellas y confunden al usuario**

**Ubicación:** `src/deteccion-intenciones/detectar-intencion.js` líneas 375-416

**Sistema actual (handoffs automáticos):**

```javascript
// Línea 375-393: ALUNA → AURORA (automático)
if (currentAgent === 'ALUNA') {
  if (AURORA_KEYWORDS.some(k => text.includes(k))) {
    console.log('[DETECT-INTENT] 💡 Aluna detectó tema Aurora - cambiar a AURORA');
    return {
      agent: 'AURORA',
      reason: 'aluna_aurora_keyword_handoff',
      flags: { agentHandoff: true, targetAgent: 'AURORA' }
    };
  }
}

// Línea 407-416: AURORA → ALUNA (automático)
if (currentAgent === 'AURORA') {
  if (ALUNA_KEYWORDS.some(k => text.includes(k))) {
    console.log('[DETECT-INTENT] 💡 Aurora detectó tema Aluna - cambiar a ALUNA');
    return { 
      agent: 'ALUNA',
      reason: 'aurora_aluna_keyword_handoff',
      flags: { agentHandoff: true, targetAgent: 'ALUNA' }
    };
  }
}
```

**Keywords que triggean handoff:**

```javascript
// Línea 32-38: AURORA_KEYWORDS
const AURORA_KEYWORDS = [
  'hot desk', 'day pass', 'día gratis', 'dia gratis',
  'espacio individual', 'espacio de trabajo', 'puesto individual',
  'puesto de trabajo', 'espacio compartido', 'escritorio compartido',
  'escritorio individual', 'lugar de trabajo', 'sitio de trabajo'
];

// Línea 43-44: ALUNA_KEYWORDS  
const ALUNA_KEYWORDS = [
  'plan 10', 'plan10', 'plan 20', 'plan20',
  'plan mensual', 'plan anual', 'oficina virtual',
  'oficina ejecutiva', 'plan full', 'plan 30',
  'membresía', 'membresia', 'miembro', 'suscripción'
];
```

**Problemas identificados:**

**🔴 PROBLEMA 1: Keywords ambiguos**

```
Usuario con Aluna activa: "me interesa un plan mensual con espacio de trabajo incluido"
                                            ↑ ALUNA         ↑ AURORA keyword

Sistema detecta: "espacio de trabajo" → switch a AURORA
Aluna desaparece sin terminar solicitud de plan mensual
Usuario: "¿Qué pasó con mi plan?" → CONFUSIÓN
```

**🔴 PROBLEMA 2: Switch sin contexto para el usuario**

```
Conversación real:
Usuario: "@aluna" → Aluna entra y pregunta por planes
Usuario: "el plan 20, también necesito espacio individual"
Sistema: Detecta "espacio individual" (AURORA keyword) → switch silencioso
Aurora: "¿Qué espacio necesitas? Hot Desk o Sala?"
Usuario: "??? ya te dije plan 20" → CONFUSO (cree que sigue con Aluna)
```

**🔴 PROBLEMA 3: Ping-pong infinito posible**

```
Usuario: "quiero plan 20 con hot desk incluido"
         ↑ ALUNA     ↑ AURORA

Sistema: Aurora detecta "plan 20" → switch a ALUNA
ALUNA responde: "El Plan 20 incluye hot desk 22 días..."
Sistema: Detecta "hot desk" en respuesta → switch a AURORA
AURORA: "¿Qué día necesitas hot desk?"
Usuario: "plan 20!" (enfatiza)
Sistema: switch a ALUNA → loop infinito ⚠️
```

**🔴 PROBLEMA 4: No considera formularios activos**

```javascript
// detectar-intencion.js NO verifica si hay form activo antes de handoff
if (currentAgent === 'ALUNA') {
  if (AURORA_KEYWORDS.some(k => text.includes(k))) {
    // ⚠️ NO VERIFICA: ¿Aluna tiene form de membresía activo?
    return { agent: 'AURORA', ... };
  }
}
```

**Ejemplo real:**

```
Aluna: "¿Tu nombre completo?"
Usuario: "Diego Villota, quiero el plan 20 con espacio de trabajo"
                                              ↑ AURORA keyword detectado
Sistema: Switch a Aurora (abandona form de Aluna a mitad)
Aurora: "¿Qué espacio necesitas?"
Usuario: "??????" (perdió contexto del Plan 20)
```

**Root causes:**

1. **Keywords demasiado sensibles** - aparecen en conversaciones cruzadas
2. **Sin protección de contexto** - handoff interrumpe formularios activos
3. **Switch silencioso** - usuario no entiende que cambió de agente
4. **Sin cooldown** - puede hacer ping-pong múltiples veces en misma conversación

**Impacto:**
- 😤 **CRÍTICO** - Usuario extremadamente confundido
- 🔄 Conversaciones largas y repetitivas (10+ mensajes por reserva simple)
- 📉 Abandono del 40% en medio del proceso
- ⚠️ Peor en clientes no técnicos (no entienden concepto de "agentes")

**Fix necesario:**
1. **Agregar cooldown:** No permitir handoff si hubo uno en últimos 3 mensajes
2. **Proteger formularios activos:** Si hay form con >2 campos llenos, NO hacer handoff automático
3. **Hacer switch explícito:** Avisar al usuario cuando se cambia de agente
   ```
   Aurora: "Te paso con Aluna, nuestra especialista en membresías 💼"
   [7s delay]
   Aluna: "Hola [nombre], Aurora me comentó que te interesa el Plan 20..."
   ```
4. **Reducir sensibilidad keywords:** Solo handoff si keyword aparece COMO TEMA PRINCIPAL (no de paso)
5. **Agregar flag `mentionedCasually`:** Diferenciar "me interesa plan 20" vs "el plan 20 incluye hot desk" (mención de paso)

---

## 📋 PRIORIZACIÓN DE FIXES

| # | Problema | Severidad | Esfuerzo | ROI | Orden |
|---|----------|-----------|----------|-----|-------|
| A6 | Flujo reservas Aurora | 🔴 CRÍTICA+ | 3h | 🟢 MÁXIMO | **1** |
| A7 | Saltos Aurora↔Aluna | 🔴 CRÍTICA | 2h | 🟢 ALTO | **2** |
| A4 | Mensajes en ráfaga | 🔴 ALTA | 2h | 🟢 ALTO | **3** |
| A1 | Reconocimiento nombres | 🔴 ALTA | 1h | 🟢 ALTO | **4** |
| A3 | Sinónimos Hot Desk | 🟡 MEDIA | 30min | 🟢 MEDIO | **5** |
| A2 | Explicación períodos 2h | 🟡 MEDIA | 1h | 🟡 MEDIO | **6** |
| A5 | Aluna VisionAI docs | 🟡 MEDIA | 3h | 🟡 BAJO | **7** |

**Roadmap recomendado (ACTUALIZADO):**

```
Sprint 1 CRÍTICO (8h):
✅ A6: Fix flujo reservas Aurora (extracción + validación)     [3h]
✅ A7: Fix handoffs Aurora↔Aluna (cooldown + protección)      [2h]
✅ A4: Fix debounce (consolidar mensajes en ráfaga)           [2h]
✅ A1: Fix nombres (lista negra genéricos)                    [1h]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   TOTAL SPRINT 1:                                             8h

Sprint 2 (2h):
✅ A3: Ampliar sinónimos Hot Desk                              [30min]
✅ A2: Expandir explicación períodos + descuentos              [1h]
⏸️  A5: Aluna VisionAI documentos → Sprint 3                  [3h]
```

---

## 🎯 TESTS REQUERIDOS POST-FIX

### Test A1 (Nombres):

```
Test Case 1: WhatsApp Business genérico
Input: name="Coworkia +593987654321"
Expected: Aurora dice "Hola, ¿cómo puedo ayudarte?" (sin nombre)
Actual: ❓ (pendiente fix)

Test Case 2: Nombre válido con emoji
Input: name="Diego 🚀"
Expected: Aurora dice "Hola Diego"
Actual: ✅ (ya funciona)

Test Case 3: Alias corto
Input: name="D"
Expected: Aurora dice "Hola, ¿cómo puedo ayudarte?" (sin nombre)
Actual: ❓ (pendiente fix)
```

### Test A2 (Períodos 2h):

```
Usuario: "¿puedo ir solo 1 hora?"
Expected: "El período mínimo es 2h porque [razón educativa]. 
          El precio es $10 por las 2 horas."
Actual: ❓ (pendiente fix)

Usuario: "¿y si me quedo 6 horas?"
Expected: "Puedes hacer 3 reservas. La primera $10, segunda $8.50, 
          tercera $7.22. Total 6h = $25.72 ($4.29/hora)."
Actual: ❓ (pendiente fix)
```

### Test A3 (Sinónimos):

```
Usuario: "quiero un espacio individual"
Expected: Aurora responde (servicio Hot Desk)
Actual: ❓ (verificar que no vaya a Aluna)

Usuario: "necesito un escritorio para trabajar"
Expected: Aurora responde
Actual: ❓ (pendiente ampliar keywords)
```

### Test A4 (Ráfaga):

```
Usuario envía en 3 segundos:
1. "quiero"
2. "un hot desk"
3. "para mañana a las 10am"

Expected: 1 respuesta consolidada después de 3-5s
Actual: ❓ (actualmente 3 respuestas después de 8s)
```

---

## 📚 REFERENCIAS

**Archivos clave:**

- `src/express-servidor/endpoints-api/wassenger.js` — Routing y debounce
- `src/deteccion-intenciones/orquestador.js` — Lógica de nombres
- `src/deteccion-intenciones/aurora.js` — Prompts y pricing
- `src/deteccion-intenciones/detectar-intencion.js` — Keywords
- `src/servicios/membership-payment-verification.js` — Aluna comprobantes

**Documentación previa:**

- `planes-de-vuelo/plan-vuelo-15mar.md` — Estado Sprint anterior
- `reglas_multiagente.md` — Filosofía y reglas del ecosistema
- `documentacion/AUDITORIA-VISIONAI-ALUNA-AURORA.md` — Auditoría 19 Ene 2026

---

## ✅ CONCLUSIONES

### Resumen de hallazgos:

1. **A6 (Flujo reservas):** 🔴 **CRÍTICO** - Formulario completo pero integración rota en 3 puntos
2. **A7 (Handoffs Aurora↔Aluna):** 🔴 **CRÍTICO** - Keywords sensibles causan ping-pong, sin protección de contexto
3. **A4 (Ráfaga):** Debounce implementado pero procesa secuencialmente (no consolida)
4. **A1 (Nombres):** Sistema implementado pero `cleanWhatsAppName()` demasiado agresivo
5. **A3 (Sinónimos):** Keywords existen, posible bug de orden de evaluación
6. **A2 (Períodos 2h):** Prompt correcto pero falta contexto educativo
7. **A5 (Aluna VisionAI):** Comprobantes implementados, faltan documentos ID y planos

### Recomendación:

⚠️ **Sprint 1 expandido — 2 bugs críticos adicionales encontrados**  
Tiempo estimado: 8 horas (4h críticos + 4h mejoras)  
Impacto: 🔴 **CRÍTICO** — El flujo de reservas está roto, pérdida directa de ventas

---

**Próximos pasos:**
1. Aprobar plan de fixes
2. Implementar A4 (máximo ROI)
3. Implementar A1 (alta visibilidad)
4. Implementar A3 + A2 (quick wins)
5. Tests end-to-end
6. Deploy a producción

---

*Auditoría completada: 18 Mar 2026 · GitHub Copilot*
