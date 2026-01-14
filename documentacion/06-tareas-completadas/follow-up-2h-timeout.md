# ⏱️ T14: Follow-Up Una Vez 2H Post-Transacción

**Status:** ✅ COMPLETADO
**Versión:** v455
**Fecha:** Diciembre 2024

---

## 📋 Problema Original

**Síntoma:** Diego reportó múltiples follow-ups a la misma hora:
```
11:00 am - "Hola Diego, noté que iniciaste una reserva..."
12:00 pm - "Hola Diego, noté que iniciaste una reserva..."
01:00 pm - "Hola Diego, noté que iniciaste una reserva..."
02:00 pm - "Hola Diego, noté que iniciaste una reserva..."
```

**Causa Raíz:** Sistema antiguo enviaba follow-ups cada hora basado en `last_message_at` (conversaciones abandonadas 3h+) sin límite de intentos.

**Impacto:** 
- Spam a usuarios
- Mala experiencia UX
- Costos innecesarios de mensajería

---

## 🎯 Solución Implementada

### **Concepto Clave:** Follow-up como Despedida Inteligente

El sistema ahora:
1. **Detecta inicio de transacción** (reserva, cotización, consulta especializada)
2. **Espera exactamente 2 horas** desde inicio
3. **Envía UNA despedida personalizada** por agente
4. **Marca como enviado** para nunca repetir
5. **Respeta horarios** Ecuador 6am-10pm

---

## 🔧 Cambios Técnicos

### **1. Base de Datos (memoria-sqlite.js)**
```sql
-- Nuevos campos en tabla users:
transaction_started_at BIGINT    -- Timestamp inicio transacción
transaction_agent TEXT            -- Agente que inició (AURORA, AXEL, etc)
follow_up_sent_at BIGINT         -- Timestamp envío follow-up (NULL = no enviado)
```

**Auto-migración:** Schema se actualiza automáticamente al guardar perfiles.

---

### **2. Follow-Up Service (src/servicios/follow-up-service.js)**

#### **Antes (context-aware multi-attempt):**
```javascript
// Buscaba conversaciones abandonadas 3-24h
findAbandonedConversations() {
  WHERE last_message_at BETWEEN $1 AND $2
    AND pending_confirmation IS NULL
    AND NOT EXISTS (SELECT 1 FROM reservations...)
}

// Generaba mensajes contextuales según estado
getUserConversationContext(userId) {
  // Fetch partial forms, pending confirmations, last messages
  // 112 líneas de lógica compleja
}

generateFollowUpMessage(user, context) {
  // Mensajes según contexto:
  // - ALUNA: Plan 10, Plan 20, Oficina Ejecutiva
  // - AURORA: Formulario parcial, confirmación pendiente
  // 83 líneas de templates condicionales
}
```

#### **Después (one-time 2h timeout):**
```javascript
// Busca transacciones que cumplan 2h exactas
findUsersNeedingFollowUp() {
  WHERE transaction_started_at IS NOT NULL
    AND transaction_started_at <= $1  -- Hace 2h o más
    AND follow_up_sent_at IS NULL     -- No enviado
  ORDER BY transaction_started_at ASC
}

// Mensajes simples de despedida por agente
generateFollowUpMessage(user) {
  const messages = {
    AURORA: `Hola ${name} 👋\n\nHan pasado 2 horas desde que iniciaste tu reserva...`,
    AXEL: `Hola ${name} 🚗\n\nHan pasado 2 horas desde tu consulta de cotización...`,
    ALUNA: `Hola ${name} ☕\n\nHan pasado 2 horas desde tu consulta sobre nuestro coworking...`,
    // ... 8 agentes total
  };
}

// Marca como enviado inmediatamente
sendFollowUpMessage(user, message) {
  await wassenger.sendMessage(phoneNumber, message);
  await db.run(
    `UPDATE users SET follow_up_sent_at = $1 WHERE phone_number = $2`,
    [Date.now(), phoneNumber]
  );
}
```

**Reducción:** ~150 líneas de lógica compleja → ~60 líneas simples

---

### **3. Cron Scheduler (src/servicios/cron-scheduler.js)**

```javascript
// ANTES: Cada 60 minutos
const followUpJob = new CronJob(
  '0 * * * *', // Top of hour
  ...
);

// DESPUÉS: Cada 30 minutos
const followUpJob = new CronJob(
  '*/30 * * * *', // Every 30 minutes
  async () => {
    console.log('[CRON] 🔔 Verificando transacciones pendientes para follow-up...');
    const result = await processFollowUps();
    console.log(`[CRON] ✅ Follow-up completado: ${result.sent} enviados, ${result.skipped} saltados`);
  },
  ...
);
```

**Mejora:** Mejor precisión temporal (30min vs 60min checks)

---

### **4. Transaction Tracking (wassenger.js)**

#### **Punto de Inicio #1: Aurora Reserva**
```javascript
// Cuando Aurora pide más info de formulario
if (formResult.needsMoreInfo && !profile.transactionStartedAt) {
  profile.transactionStartedAt = Date.now();
  profile.transactionAgent = 'AURORA';
  profile.followUpSentAt = null;
  await saveProfile(userId, profile);
  console.log('[T14] ⏱️ Transacción AURORA iniciada:', { userId, timestamp });
}
```

#### **Punto de Inicio #2: Axel Primera Foto**
```javascript
// Cuando Axel recibe primera foto para cotización
if (photoStatus.currentCount === 1 && !profile.transactionStartedAt) {
  profile.transactionStartedAt = Date.now();
  profile.transactionAgent = 'AXEL';
  profile.followUpSentAt = null;
  await saveProfile(userId, profile);
  console.log('[T14] ⏱️ Transacción AXEL iniciada:', { userId, timestamp });
}
```

#### **Punto de Inicio #3: Handoff a Especialista**
```javascript
// Cuando orquestador hace handoff AURORA → Agente
if (fromAgent === 'AURORA' && targetAgent !== 'AURORA' && !profile.transactionStartedAt) {
  profile.transactionStartedAt = Date.now();
  profile.transactionAgent = targetAgent;
  profile.followUpSentAt = null;
  console.log('[T14] ⏱️ Transacción iniciada en handoff:', { from: 'AURORA', to: targetAgent });
}
```

#### **Punto de Finalización #1: Confirmación Exitosa**
```javascript
// Aurora confirma reserva exitosamente
if (confirmationResult.success && isPos) {
  profile.transactionStartedAt = null;
  profile.transactionAgent = null;
  profile.followUpSentAt = null;
  await saveProfile(userId, profile);
  console.log('[T14] ✅ Transacción completada (confirmación exitosa):', { userId });
}
```

#### **Punto de Finalización #2: Cotización Enviada**
```javascript
// Axel envía cotización exitosamente
profile.transactionStartedAt = null;
profile.transactionAgent = null;
profile.followUpSentAt = null;
await saveProfile(userId, profile);
console.log('[T14] ✅ Transacción completada (cotización enviada):', { userId, quoteCode });
```

---

## 📨 Mensajes por Agente

### **AURORA (Reservaciones)**
```
Hola {nombre} 👋

Han pasado 2 horas desde que iniciaste tu reserva con Coworkia. 
No hay problema si necesitas más tiempo para pensar! ⏰

El tiempo de espera se terminó, pero cuando estés listo para una 
nueva reserva, solo escribe y te ayudaré de inmediato.

Un abrazo,
Aurora ✨
```

### **AXEL (Cotizaciones Auto)**
```
Hola {nombre} 🚗

Han pasado 2 horas desde tu consulta de cotización en The PaintBull.
No hay problema si decidiste buscar otras opciones. 💪

Si más adelante necesitas una cotización, puedes retomar cuando 
lo necesites.

¡Que tengas un excelente día!
Axel - The PaintBull 🎨
```

### **ALUNA (Coworking)**
```
Hola {nombre} ☕

Han pasado 2 horas desde tu consulta sobre nuestro coworking.
No te preocupes si necesitas más tiempo para decidir. 🤗

Cuando estés listo para retomar la conversación sobre espacios, 
escríbeme!

Saludos,
Aluna - Coworkia ☕
```

### **ADRIANA (Seguros)**
```
Hola {nombre} 🛡️

Han pasado 2 horas desde tu consulta sobre seguros.
No hay problema si necesitas comparar otras opciones. 📋

Si más adelante quieres retomar el análisis de documentos o 
cotizaciones, aquí estaré!

Saludos cordiales,
Adriana - Insurance IA 🛡️
```

### **ENZO (Marketing Visual)**
```
Hola {nombre} 🎨

Han pasado 2 horas desde tu consulta sobre marketing visual.
No te preocupes si necesitas más tiempo para tu proyecto. 💡

Cuando quieras retomar ideas de diseño o análisis de imágenes, 
solo escribe!

Saludos creativos,
Enzo - Marketing Lab IA 🚀
```

### **ANGELA, GABI, TOMI**
Similares con especialidad respectiva (OneMind IA, asistencia legal, inversiones).

---

## 🧪 Testing

### **Script de Reset (scripts/testing/reset-diego-follow-up.sql)**
```sql
-- Limpia estado de Diego para testing
UPDATE users 
SET 
  transaction_started_at = NULL,
  transaction_agent = NULL,
  follow_up_sent_at = NULL,
  pending_confirmation = NULL
WHERE phone_number = '+593987770788';
```

### **Escenarios de Prueba**

#### **Test 1: Aurora Reserva Abandonada**
```
1. Usuario: "Quiero reservar para mañana"
2. Aurora: "¿A qué hora?" → transaction_started_at = NOW
3. [Esperar 2h 5min]
4. Sistema: Envía follow-up Aurora
5. Verificar: follow_up_sent_at != NULL
6. [Esperar 1h más]
7. Verificar: NO envía segundo follow-up
```

#### **Test 2: Axel Cotización Abandonada**
```
1. Usuario: @axel
2. Usuario: [Envía foto daño] → transaction_started_at = NOW
3. [Esperar 2h 5min]
4. Sistema: Envía follow-up Axel
5. Verificar: follow_up_sent_at != NULL
6. [Esperar 30min más]
7. Verificar: NO envía segundo follow-up
```

#### **Test 3: Transacción Completada (No Follow-up)**
```
1. Usuario: "Quiero reservar"
2. Aurora: Completa formulario → transaction_started_at = NOW
3. Usuario: "Sí confirmo"
4. Aurora: Reserva confirmada → transaction_started_at = NULL
5. [Esperar 2h 5min]
6. Verificar: NO envía follow-up (transacción completada)
```

#### **Test 4: Fuera de Horario**
```
1. Transaction_started_at = 8pm (Ecuador)
2. [Esperar hasta 10:05pm]
3. Verificar: NO envía follow-up (fuera de horario 6am-10pm)
4. [Esperar hasta 6:05am siguiente día]
5. Verificar: SÍ envía follow-up (dentro de horario)
```

---

## 📊 Métricas de Éxito

**Antes:**
- Follow-ups múltiples por usuario
- Diego recibió 4+ mensajes en 4 horas
- Sin límite de intentos
- Sin tracking de envíos

**Después:**
- 1 follow-up máximo por transacción
- 2h exactas desde inicio
- Marcador `follow_up_sent_at` previene duplicados
- Horario respetado 6am-10pm Ecuador

**Logs Esperados:**
```
[T14] ⏱️ Transacción AURORA iniciada: {userId: "+593...", timestamp: 1734567890123}
[CRON] 🔔 Verificando transacciones pendientes para follow-up...
[FOLLOW-UP] 📤 Enviando follow-up a Diego (+593...) - Agente: AURORA
[CRON] ✅ Follow-up completado: 1 enviados, 0 saltados
```

---

## 🔐 Seguridad y Edge Cases

### **Protecciones Implementadas:**

1. **Duplicate Prevention:**
   ```javascript
   WHERE follow_up_sent_at IS NULL  // Solo usuarios sin follow-up previo
   ```

2. **Transaction State Validation:**
   ```javascript
   if (!profile.transactionStartedAt) return; // Skip si no hay transacción activa
   ```

3. **Hour Window Respect:**
   ```javascript
   isWithinAllowedHours() {
     const ecuadorHour = moment.tz('America/Guayaquil').hour();
     return ecuadorHour >= 6 && ecuadorHour < 22;
   }
   ```

4. **Graceful Cleanup on Completion:**
   ```javascript
   // Limpia flags inmediatamente cuando transacción completa
   profile.transactionStartedAt = null;
   profile.followUpSentAt = null;
   ```

### **Edge Cases Cubiertos:**

- **Usuario vuelve después de 2h:** Follow-up ya enviado, no se repite
- **Usuario completa antes de 2h:** Transaction_started_at = NULL, no envía follow-up
- **Múltiples transacciones mismo día:** Cada una tiene su propio ciclo 2h
- **Handoff entre agentes durante transacción:** Mantiene transaction_agent original
- **Cron ejecuta mientras usuario activo:** Verifica horario antes de enviar

---

## 🚀 Deployment

```bash
# Commit cambios
git add src/servicios/follow-up-service.js
git add src/servicios/cron-scheduler.js
git add src/express-servidor/endpoints-api/wassenger.js
git add scripts/testing/reset-diego-follow-up.sql

git commit -m "feat(T14): Implementar follow-up UNA vez 2h post-transacción

- Reescribir follow-up-service.js: context-aware → one-time timeout
- Agregar tracking: transactionStartedAt, transactionAgent, followUpSentAt
- Mensajes personalizados por 8 agentes con despedidas
- Cron cada 30min para mejor precisión temporal
- Limpiar transacciones al completar reserva/cotización
- Script SQL testing para reset estado Diego
- Auto-migración schema con nuevos campos

Ref: T14 Follow-ups spam (múltiples mensajes hourly)
Fix: Sistema ahora envía UNA despedida 2h post-inicio"

# Deploy a Heroku
git push heroku main

# Verificar deployment
heroku logs --tail --app coworkia-agent
```

**Monitoreo Post-Deploy:**
```bash
# Ver logs de cron
heroku logs --tail --app coworkia-agent | grep CRON

# Ver logs de T14
heroku logs --tail --app coworkia-agent | grep T14

# Verificar próxima ejecución
# Cada 30 minutos: XX:00, XX:30
```

---

## 🔗 Relación con Otras Tareas

### **T14 vs T15**
- **T14 (Este):** Follow-up automático 2h timeout (sistema ejecuta solo)
- **T15 (Futuro):** Reset manual desde VSC/DB (developer ejecuta)

**Diferencias clave:**
| Aspecto | T14 | T15 |
|---------|-----|-----|
| Trigger | Automático (cron 2h) | Manual (developer command) |
| Mensajes | 1 despedida | 3 mensajes (despedida + handoff + saludo) |
| Usuario | Usuario abandonó | Developer decide reset |
| Timing | 2h exactas | Inmediato on-demand |

### **Integración con T10 (Rate Limiting)**
Follow-ups NO cuentan para rate limit (son mensajes salientes del sistema, no respuestas a usuario).

### **Integración con T8 (Logging)**
```javascript
loggers.followUp.info('Follow-up sent', {
  userId,
  agent: transactionAgent,
  hoursSinceStart: (Date.now() - transactionStartedAt) / (1000 * 60 * 60),
  message: followUpMessage
});
```

---

## 📚 Referencias

**Archivos Modificados:**
- [follow-up-service.js](../src/servicios/follow-up-service.js) - Lógica principal reescrita
- [cron-scheduler.js](../src/servicios/cron-scheduler.js) - Frecuencia 60min → 30min
- [wassenger.js](../src/express-servidor/endpoints-api/wassenger.js) - Transaction tracking
- [reset-diego-follow-up.sql](../scripts/testing/reset-diego-follow-up.sql) - Script testing

**Database Schema:**
```sql
-- Tabla users (nuevos campos)
transaction_started_at BIGINT    -- NULL o timestamp inicio transacción
transaction_agent TEXT            -- NULL o agente (AURORA, AXEL, etc)
follow_up_sent_at BIGINT         -- NULL o timestamp envío follow-up
```

**Commits Relacionados:**
- v443: ❌ REVERTIDO - Auto-handoff Axel → Aurora (concepto erróneo)
- v452: ✅ Revert T9 - Agentes persisten hasta @comando
- v453: ✅ T10 Rate limiting implementado
- v455: ✅ T14 Follow-up one-time 2h timeout

---

## ✅ Checklist Implementación

- [x] Reescribir `findAbandonedConversations()` → `findUsersNeedingFollowUp()`
- [x] Agregar constante `TWO_HOURS_MS = 120 * 60 * 1000`
- [x] Eliminar `getUserConversationContext()` (context-aware logic)
- [x] Crear mensajes simples por 8 agentes
- [x] Actualizar `sendFollowUpMessage()` con `followUpSentAt` tracking
- [x] Actualizar `processFollowUps()` con nueva lógica
- [x] Cambiar cron frequency 60min → 30min
- [x] Agregar tracking `transactionStartedAt` en Aurora formulario
- [x] Agregar tracking `transactionStartedAt` en Axel primera foto
- [x] Agregar tracking `transactionStartedAt` en handoffs a especialistas
- [x] Limpiar transacción en confirmación exitosa Aurora
- [x] Limpiar transacción en cotización enviada Axel
- [x] Crear script SQL testing `reset-diego-follow-up.sql`
- [x] Verificar sin errores ESLint/TypeScript
- [x] Crear documentación completa T14

---

## 🎉 Resultado Final

**Sistema Follow-Up v2:**
- ✅ UNA despedida inteligente por agente
- ✅ 2 horas exactas desde inicio transacción
- ✅ Tracking completo con 3 campos nuevos DB
- ✅ Respeta horarios Ecuador 6am-10pm
- ✅ Sin spam - Marcador `followUpSentAt` previene duplicados
- ✅ Auto-limpieza cuando transacción completa
- ✅ Cron optimizado 30min para mejor precisión
- ✅ 8 mensajes personalizados por especialidad

**Diego dejará de recibir follow-ups hourly spam! 🎊**
