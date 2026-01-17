# 🔍 Auditoría Completa wassenger.js (v516)

**Fecha:** 2026-01-17  
**Archivo:** src/express-servidor/endpoints-api/wassenger.js  
**Líneas:** 1060  
**Estado:** ✅ Funcional (webhook verde)

---

## 📊 MÉTRICAS

| Métrica | Valor | Estado |
|---------|-------|--------|
| Líneas totales | 1060 | 🔴 Muy alto |
| Funciones | 19 | 🟡 Alto |
| Imports | 31 | 🟡 Alto |
| Complejidad ciclomática | ~150 | 🔴 Crítica |
| Niveles anidación | 6 | 🔴 Alto |
| Duplicación código | ~15% | 🟡 Media |

---

## 🟢 FORTALEZAS

### 1. Funcionalidad Completa
✅ Maneja todos los casos de uso:
- Mensajes entrantes (texto, audio, imagen)
- Handoffs entre agentes
- Confirmaciones SI/NO
- Formularios parciales
- Fotos Axel (colector multi-foto)
- Recibos de pago
- Cambio de idioma automático
- Rate limiting básico

### 2. Logging Estructurado
✅ Buenos logs con loggers especializados:
```javascript
loggers.webhook.userMessage()
loggers.axel.info()
loggers.orquestador.handoff()
```

### 3. Validaciones de Seguridad
✅ Implementadas:
- Signature validation (webhook-security.js)
- Rate limiting por teléfono
- Detección de bots básica
- Mensajes viejos bloqueados
- Auto-mensajeo bloqueado

---

## 🔴 PROBLEMAS CRÍTICOS

### 1. Complejidad Monolítica (PRIORIDAD 1)
❌ **Problema:** 1060 líneas en un solo archivo
- Difícil mantenimiento
- Alto riesgo de regresiones
- Onboarding lento para nuevos devs
- Tests difíciles

**Impacto:** 🔴 Alto - Dificulta evolución del sistema

### 2. Responsabilidades Mezcladas (PRIORIDAD 1)
❌ **Problema:** El webhook hace TODO:
- Normalización de datos (líneas 58-189)
- Detección de nombres (líneas 106-167)
- Procesamiento Axel (líneas 265-359)
- Manejo de confirmaciones (líneas 660-710)
- Handoffs (líneas 820-900)
- Envío de mensajes
- Persistencia de datos

**Violación:** Principio de Responsabilidad Única (SRP)

### 3. Error Handling Inconsistente (PRIORIDAD 2)
❌ **Problema:** Try-catch parcial
```javascript
// Línea 890 - Import dinámico SIN try-catch
const { AGENTES } = await import('../../deteccion-intenciones/orquestador.js');

// Línea 665 - Async sin catch
const confirmResult = await processConfirmationResponse(...);
```

**Riesgo:** Crashes silenciosos, estado inconsistente

### 4. Race Conditions (PRIORIDAD 2)
❌ **Problema:** Sin locks para operaciones concurrentes
```javascript
// Usuario envía 2 mensajes simultáneos:
// Mensaje 1: loadProfile → saveProfile (activeAgent = ENZO)
// Mensaje 2: loadProfile → saveProfile (activeAgent = ALUNA)
// Resultado: Estado inconsistente (último que escribe gana)
```

**Riesgo:** Datos corruptos, flujos rotos

### 5. Duplicación de Lógica (PRIORIDAD 3)
❌ **Problema:** Código repetido
- Detección de cancelación (líneas 241-263) vs orquestador.js
- Validación de perfil (líneas 540-590) duplicada
- Logs de handoff (múltiples lugares)

---

## 🟡 PROBLEMAS MEDIOS

### 6. Helpers Sin Modularizar
🟡 19 funciones helper en el mismo archivo:
```javascript
safeStr(), nowUnix(), normalizeUserId(), normalizeName(),
cleanWhatsAppName(), extractNameFromMessage(), buildMessageEnvelope(),
detectBotLight(), detectFormContinuation(), isOldMessage(),
isCasualGreetingOnly(), isReservationIntent()...
```

**Solución:** Mover a módulos separados

### 7. Lógica de Negocio en Endpoint
🟡 **Problema:** Webhook contiene reglas de negocio:
```javascript
// Línea 500 - Detección de cambio de idioma
if (detectedLanguage?.language !== currentLanguage) {
  // 15 líneas de lógica...
}

// Línea 690 - Lógica de fotos Axel
if (mediaUrl && type === 'image' && profile.activeAgent === 'AXEL') {
  // 80 líneas de lógica...
}
```

**Impacto:** Tests difíciles, acoplamiento alto

### 8. Falta Timeout Global
🟡 **Problema:** Sin timeout máximo de ejecución
- Un webhook puede correr indefinidamente
- Bloquea dyno de Heroku
- No hay circuit breaker

### 9. Estado Temporal en Memoria
🟡 **Problema:** `userLocks` propuesto usa Map en memoria
- Se pierde en restart de dyno
- No funciona con múltiples instancias
- Redis sería mejor opción

---

## 🟢 PROBLEMAS MENORES

### 10. Magic Numbers
```javascript
minutos < 10  // Línea 542 - ¿Por qué 10?
temperature: 0.7  // Línea 913 - ¿Por qué 0.7?
max_tokens: 350  // Línea 914 - ¿Por qué 350?
delayMs: 400  // Línea 862 - ¿Por qué 400?
```

**Solución:** Constantes con nombres descriptivos

### 11. Comentarios en Español/Inglés Mezclados
```javascript
// 🔍 Detecta nombre desde mensaje de presentación
function extractNameFromMessage(message) {
  // Patrones comunes de presentación
```

**Solución:** Unificar idioma (preferir español para este proyecto)

### 12. Logs Debug Temporales
```javascript
// Línea 556
console.log(`[NAME DEBUG] userId: ${userId}`);
console.log(`[NAME DEBUG] current.name (BD): "${current.name || 'NULL'}"`);
```

**Solución:** Usar loggers.webhook.debug() o eliminar

---

## 📈 OPORTUNIDADES DE MEJORA

### 13. Métricas y Observabilidad
💡 Agregar:
- Tiempo de respuesta por tipo de mensaje
- Tasa de error por agente
- Conteo de handoffs
- Latencia OpenAI

### 14. Feature Flags
💡 Implementar toggles para:
- Confirmaciones automáticas
- Colector de fotos Axel
- Cambio de idioma
- Detección de nombres

### 15. Webhook Replay
💡 Guardar eventos raw para:
- Debugging producción
- Tests de regresión
- Auditoría de conversaciones

---

## 🎯 PLAN DE REFACTORIZACIÓN

### Fase 1: Extracción de Helpers (BAJO RIESGO)
```
src/servicios/wassenger/
├── helpers.js              ← Normalización y utilidades
├── name-detection.js       ← Lógica de nombres
├── validation.js           ← Bots, mensajes viejos
└── message-builders.js     ← Construcción de envelopes
```

### Fase 2: Handlers Especializados (MEDIO RIESGO)
```
src/servicios/wassenger/handlers/
├── axel-photo-handler.js   ← Colector de fotos
├── confirmation-handler.js ← SI/NO responses
├── language-handler.js     ← Cambio idioma
├── payment-handler.js      ← Recibos de pago
└── handoff-handler.js      ← Transiciones agentes
```

### Fase 3: Webhook Core Simplificado (ALTO RIESGO)
```javascript
// Estructura ideal del webhook:
router.post('/webhooks/wassenger', async (req, res) => {
  try {
    // 1. Validar y normalizar
    const message = await validateAndNormalize(req.body);
    
    // 2. Verificar duplicados/bots
    if (await shouldIgnore(message)) return res.json({ ok: true });
    
    // 3. Adquirir lock de usuario
    return await withUserLock(message.userId, async () => {
      
      // 4. Cargar contexto
      const context = await loadContext(message);
      
      // 5. Determinar handler
      const handler = selectHandler(message, context);
      
      // 6. Procesar con timeout
      const result = await executeWithTimeout(
        () => handler.process(message, context),
        30000
      );
      
      // 7. Persistir y responder
      await persistResult(result);
      return res.json({ ok: true });
    });
    
  } catch (error) {
    loggers.webhook.error('Critical error', {}, error);
    return res.status(500).json({ ok: false });
  }
});
```

### Fase 4: Error Handling Robusto
```javascript
// Envolver operaciones críticas
async function safeProcessMessage(message, context) {
  try {
    return await procesarMensaje(message, context);
  } catch (error) {
    // Log detallado
    loggers.webhook.error('Message processing failed', {
      userId: message.userId,
      messageType: message.type,
      activeAgent: context.activeAgent
    }, error);
    
    // Fallback amigable
    return {
      agente: 'Aurora Core',
      prompt: 'Disculpa, tuve un error técnico. ¿Puedes repetir tu mensaje?',
      systemPrompt: 'Eres Aurora, asistente de Coworkia.'
    };
  }
}
```

### Fase 5: Race Condition Prevention
```javascript
// Lock distribuido con Redis (ideal)
import Redis from 'ioredis';
const redis = new Redis(process.env.REDIS_URL);

async function withUserLock(userId, fn, timeoutMs = 30000) {
  const lockKey = `lock:user:${userId}`;
  const lockValue = `${Date.now()}-${Math.random()}`;
  
  // Intentar adquirir lock con TTL
  const acquired = await redis.set(
    lockKey, 
    lockValue, 
    'PX', timeoutMs, 
    'NX'
  );
  
  if (!acquired) {
    throw new Error('USER_LOCKED');
  }
  
  try {
    return await fn();
  } finally {
    // Liberar solo si aún tenemos el lock
    const luaScript = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
      else
        return 0
      end
    `;
    await redis.eval(luaScript, 1, lockKey, lockValue);
  }
}
```

---

## ✅ VALIDACIONES REQUERIDAS

Antes de deployment de versión PRO:

### Tests Obligatorios
- [ ] Unit tests para todos los helpers
- [ ] Integration tests para handlers
- [ ] E2E test del webhook completo
- [ ] Load testing (100 msgs/min)
- [ ] Race condition tests

### Checklist de Seguridad
- [ ] Signature validation funcionando
- [ ] Rate limiting por usuario
- [ ] Timeout máximo de 30s
- [ ] Error handling en todos los paths
- [ ] Logs sin información sensible

### Checklist de Performance
- [ ] Tiempo respuesta < 3s (p95)
- [ ] Sin memory leaks (test 1000 msgs)
- [ ] Conexiones DB cerradas correctamente
- [ ] Circuit breaker para OpenAI

---

## 📊 RESUMEN EJECUTIVO

### Estado Actual: 🟡 FUNCIONAL PERO TÉCNICAMENTE DEUDA ALTA

**Fortalezas:**
- ✅ Funcionalidad completa
- ✅ Logging bueno
- ✅ Validaciones básicas

**Debilidades Críticas:**
- 🔴 Monolítico (1060 líneas)
- 🔴 SRP violado (múltiples responsabilidades)
- 🔴 Error handling inconsistente
- 🔴 Race conditions sin prevenir

**Riesgo de Mantener Status Quo:**
- Alta probabilidad de bugs en nuevas features
- Onboarding lento para desarrolladores
- Tests difíciles de escribir
- Escalabilidad limitada

**Recomendación:**
✅ **PROCEDER CON REFACTORIZACIÓN PROFUNDA**

**Tiempo Estimado:** 2-3 horas  
**Riesgo:** Medio (con backup y tests)  
**Beneficio:** Alto (código mantenible, escalable, testeable)

---

## 🚀 PRÓXIMOS PASOS

1. ✅ Crear backup de wassenger.js funcional
2. ✅ Implementar estructura modular (Fase 1-2)
3. ✅ Escribir tests para módulos extraídos
4. ✅ Refactorizar webhook core (Fase 3)
5. ✅ Agregar error handling robusto (Fase 4)
6. ✅ Implementar locks (Fase 5 - opcional para v1)
7. ✅ Deploy incremental con monitoring
8. ✅ Validar en producción
9. ✅ Documentar cambios

**¿Listo para empezar?** 🚀
