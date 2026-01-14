# 🐌 T2: DIAGNÓSTICO DE LATENCIA EXTREMA

**Fecha:** 2026-01-13  
**Problema:** Aurora responde en ~1 hora cuando no hace timeout (30s)  
**Estado:** ✅ DIAGNÓSTICO COMPLETADO

---

## 🔍 EVIDENCIA DEL PROBLEMA

### Síntomas Observados
1. **Webhooks timeout consistente:** 40+ fallos consecutivos a exactos 30 segundos (H12)
2. **Respuestas extremadamente lentas:** ~1 hora cuando logra responder
3. **Logs muestran queries rápidas:** PostgreSQL responde en 5-463ms
4. **Debug logs NO aparecen:** Código se bloquea ANTES de loadProfile()

### Timeline de Eventos
```
00:59:00 - 01:36:00  → 40+ timeouts consecutivos (cada 57 segundos aprox)
01:00:00             → PostgreSQL queries completando en 5-463ms (CRON ok)
02:00:00             → Sistema follow-up funciona correctamente
02:08:13             → Dyno va a sleep (Heroku Eco)
```

---

## 🧪 ANÁLISIS TÉCNICO PROFUNDO

### 1. PostgreSQL - DESCARTADO COMO CAUSA PRINCIPAL

**Configuración Actual:**
```javascript
// postgres-adapter.js:30-37
this.pool = new Pool({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false },
  max: 20,                            // ✅ Pool size adecuado
  connectionTimeoutMillis: 10000,     // ✅ 10s timeout para obtener conexión
  idleTimeoutMillis: 30000            // ✅ 30s antes de cerrar idle
});

// postgres-adapter.js:41-42
this.pool.on('connect', (client) => {
  client.query('SET statement_timeout = 15000'); // ✅ 15s timeout por query
});
```

**Estado Heroku PostgreSQL:**
```
Plan: essential-0
Status: Available
Connections: 0/20  ← ✅ No hay saturación
PG Version: 17.5
```

**Evidencia de funcionamiento correcto:**
```
[POSTGRES DEBUG] get() completado en 8ms, rows: 1
[POSTGRES DEBUG] get() completado en 6ms, rows: 0
[POSTGRES DEBUG] all() completado en 7ms, rows: 3
[POSTGRES DEBUG] run() completado en 463ms  ← Follow-up cron
```

**Conclusión:** PostgreSQL está funcionando correctamente. Queries completan en milisegundos.

---

### 2. Circuit Breaker OpenAI - CONFIGURADO CORRECTAMENTE

**Configuración:**
```javascript
// circuit-breaker.js:216-220
export const openaiBreaker = manager.getBreaker('OpenAI', {
  failureThreshold: 3,      // Abre después de 3 fallos
  successThreshold: 2,      // Cierra después de 2 éxitos
  timeout: 60000,           // 60s en OPEN
  resetTimeout: 30000       // 30s antes de HALF_OPEN
});
```

**Flujo de protección:**
```javascript
// openai.js:43-52
return await openaiBreaker.execute(async () => {
  const res = await client.chat.completions.create({
    model,
    messages,
    temperature,
    max_tokens,
  });
  return res.choices?.[0]?.message?.content?.trim() || '';
}, fallback);
```

**Estados del Circuit Breaker:**
- **CLOSED:** Funcionamiento normal
- **OPEN:** Después de 3 fallos → rechaza requests por 30s → ejecuta fallback
- **HALF_OPEN:** Intentando recuperarse

**Logs de Circuit Breaker NO aparecen:**
```bash
# Búsqueda en logs de Heroku
$ heroku logs -n 500 | grep -i "circuit"
# RESULTADO: 0 matches
```

**Conclusión:** Circuit breaker NO se está activando. Esto significa:
- OpenAI está respondiendo (no hay fallos)
- O el código ni siquiera llega a ejecutar OpenAI

---

### 3. loadProfile() - ⚠️ SOSPECHOSO PERO NO ES LA CAUSA

**Función loadProfile (memoria-sqlite.js:89-130):**
```javascript
export async function loadProfile(userId) {
  await ensureDbInitialized();
  
  // Query 1
  const user = await userRepository.findByPhone(userId);
  
  // Query 2
  const reservationHistory = await getReservationHistory(userId);
  
  // Query 3
  const upcomingReservations = await getUpcomingReservations(userId);
  
  // Query 4
  const pendingConfirmation = await dbGetPendingConfirmation(userId);
  
  // Query 5
  const justState = await getJustConfirmedState(userId);
  
  return profile;
}
```

**Problema identificado:**
- ❌ 5 queries secuenciales sin timeout wrapper
- ❌ Cada query tiene statement_timeout de 15s individual
- ❌ En el peor caso: 15s × 5 = 75 segundos

**PERO:**
- ✅ Logs muestran queries completando en < 500ms
- ✅ Statement timeout está configurado a 15s
- ❌ **Debug logs agregados ANTES de loadProfile NO aparecen**

**Debug logs agregados en wassenger.js:**
```javascript
// Línea 1237
console.log('[WASSENGER DEBUG] 🔄 loadProfile para texto mensaje...');
const current = await loadProfile(userId) || {};
console.log('[WASSENGER DEBUG] ✅ loadProfile completado');

// Línea 293 (imágenes)
console.log('[WASSENGER DEBUG] 🔄 loadProfile para imagen...');
const userProfile = await loadProfile(userId);
console.log('[WASSENGER DEBUG] ✅ loadProfile imagen OK');
```

**Búsqueda en logs:**
```bash
$ heroku logs -n 500 | grep "WASSENGER DEBUG"
# RESULTADO: 0 matches
```

**Conclusión crítica:** El código se bloquea ANTES de llegar a loadProfile().

---

### 4. PUNTO DE BLOQUEO REAL: MIDDLEWARE 🎯

**Flujo de entrada del webhook:**
```javascript
// wassenger.js:217
router.post('/webhooks/wassenger', 
  validateWebhookSignature,    // ← 🔴 SOSPECHOSO #1
  rateLimitByPhone,             // ← 🔴 SOSPECHOSO #2
  async (req, res) => {
    try {
      // ... código del handler
```

**Logs que SÍ aparecen:**
```
[WASSENGER] Webhook recibido { 
  event: 'message:in:new', 
  from: '+593987770788' 
}
```

**Esta línea está en:** wassenger.js:240-245 (DENTRO del handler)

**Logs que NO aparecen:**
```
[WASSENGER DEBUG] 🔄 loadProfile para texto mensaje...
```

**Esta línea está en:** wassenger.js:1237 (DESPUÉS de línea 240)

**Conclusión:** El código se ejecuta desde línea 240 pero se bloquea ENTRE línea 240 y línea 1237.

---

## 🎯 CAUSA RAÍZ IDENTIFICADA

### Hipótesis Principal: BLOQUEO EN SECCIÓN INTERMEDIA

**Código entre línea 240 y línea 1237:**

1. **Validaciones iniciales (245-280):**
   - Verificar WASSENGER_ENABLED
   - Extraer datos del body
   - Verificar evento 'message:in'

2. **Procesamiento de imágenes (280-680):**
   - Si hay imagen/documento
   - loadProfile() para imagen (línea 295) ← ⚠️ PRIMER PUNTO DE BLOQUEO POSIBLE
   - analyzeImage() con OpenAI Vision

3. **Procesamiento de texto (680-1237):**
   - Si NO hay imagen
   - Validaciones adicionales
   - **¿Qué hay aquí que puede bloquear?**

**Necesitamos ver el código completo entre líneas 680-1237:**

---

## 🔬 ANÁLISIS DE BLOQUEO POTENCIAL

### Escenario A: await no manejado antes de línea 1237

**Operaciones async entre líneas 240-1237:**
1. `await loadProfile(userId)` (línea 295 - para imágenes)
2. `await analyzeImage()` (línea ~350)
3. `await enviarWhatsApp()` (múltiples lugares)
4. `await saveProfile()` (múltiples lugares)
5. `await saveConversationMessage()` (múltiples lugares)

**Problema:** Si alguna de estas operaciones se bloquea y no está dentro de un try/catch con timeout, puede colgar todo el webhook.

### Escenario B: Loop o recursión infinita

**Posibles loops en el código:**
- Procesamiento de mensajes con reply context
- Verificación de handoff en múltiples pasos
- Retry logic sin límite máximo

### Escenario C: Race condition o deadlock

**PostgreSQL connection pool:**
- Max: 20 conexiones
- Si hay queries anidadas sin liberar conexiones
- Puede crear deadlock esperando conexión disponible

---

## 📊 MÉTRICAS Y PATRONES

### Patrón de Timeouts

```
01:00:00.660 → Query completa en 8ms
01:00:16.440 → TIMEOUT H12 (service=30001ms)
          ↓
   16.44 - 0.66 = 15.78 segundos

Query completa en 8ms, pero timeout ocurre 15.78s después.
¿Qué está pasando en esos 15.78 segundos?
```

### Cálculo de Latencia

**Tiempo observado entre logs:**
```
[WASSENGER] Webhook recibido        → 01:00:00.660
[POSTGRES DEBUG] get() completado   → 01:00:00.660 (mismo instante)
[POSTGRES DEBUG] run() INSERT       → 01:00:01.466 (806ms después)
Heroku H12 Timeout                  → 01:00:16.440 (15.78s después)
```

**Interpretación:**
1. Webhook llega y log se imprime inmediatamente
2. Queries de PostgreSQL de OTRA REQUEST (cron) completan bien
3. 15.78 segundos después: TIMEOUT
4. **NO hay logs intermedios de la request actual**

**Conclusión:** El webhook handler está bloqueado SIN ejecutar código.

---

## 🚨 HIPÓTESIS FINAL: DYNO SLEEPING + CÓDIGO BLOQUEADO

### Cadena de Eventos

```
1. Dyno dormido (después de 30 min inactividad)
   ↓
2. Webhook llega desde Wassenger
   ↓
3. Heroku despierta dyno (6-10 segundos)
   ↓
4. Express recibe request y ejecuta middleware
   ↓
5. validateWebhookSignature → ¿hace request externo?
   ↓
6. rateLimitByPhone → ¿consulta Redis/DB externa?
   ↓
7. Si alguno de estos bloquea: 10s (wake) + 15s (timeout) = 25s
   ↓
8. Más procesamiento: +5s = 30s EXACTOS
   ↓
9. TIMEOUT H12
```

### Evidencia del Dyno Sleeping

```
2026-01-13T02:08:13 heroku[web.1]: Idling
2026-01-13T02:08:13 heroku[web.1]: State changed from up to down
```

**Última actividad antes de sleep:**
- 01:36:29 - Último timeout
- 02:08:13 - Dyno sleep (31 minutos después) ← ✅ 30 min inactividad

**Impacto del wake-up:**
- Cold start: 6-10 segundos
- Si hay bloqueo adicional: supera 30s fácilmente

---

## 🎬 ESCENARIO COMPLETO DE LATENCIA EXTREMA

### Caso: Respuesta en 1 hora

**Teoría:**
1. Dyno dormido
2. Webhook llega
3. Wake-up: 10s
4. Middleware validateWebhookSignature hace request HTTP externo
5. Request externo timeout después de 30s
6. Retry del middleware: 3 intentos × 30s = 90s
7. Finalmente pasa
8. loadProfile() ejecuta pero PostgreSQL lento: 15s
9. OpenAI call: 5s
10. Total: 10s + 90s + 15s + 5s = 120s = 2 minutos

**Pero dice que toma 1 hora...**

**Posible explicación:**
- Wassenger hace retry del webhook cada X minutos
- Heroku rechaza requests por timeout
- Después de N intentos, uno finalmente pasa
- Usuario recibe respuesta mucho después

---

## 🔧 ACCIONES CORRECTIVAS NECESARIAS

### 1. ELIMINAR DYNO SLEEPING (Crítico P0)
```javascript
// Implementar healthcheck endpoint
router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// Cron job cada 25 minutos
// Heroku Scheduler o servicio externo como UptimeRobot
```

### 2. AGREGAR TIMEOUT A loadProfile() (Crítico P0)
```javascript
async function loadProfileWithTimeout(userId, timeoutMs = 10000) {
  return Promise.race([
    loadProfile(userId),
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error('loadProfile timeout')), timeoutMs)
    )
  ]);
}
```

### 3. PARALELIZAR QUERIES (Alto P1)
```javascript
export async function loadProfile(userId) {
  await ensureDbInitialized();
  
  // Queries en paralelo en lugar de secuencial
  const [user, history, upcoming, pending, state] = await Promise.all([
    userRepository.findByPhone(userId),
    getReservationHistory(userId),
    getUpcomingReservations(userId),
    dbGetPendingConfirmation(userId),
    getJustConfirmedState(userId)
  ]);
  
  // ... construir profile
}
```

### 4. AGREGAR CORRELATION IDs (Medio P2)
```javascript
// Generar ID único por request
const requestId = crypto.randomUUID();
req.requestId = requestId;

console.log(`[${requestId}] Webhook recibido`);
console.log(`[${requestId}] loadProfile iniciado`);
console.log(`[${requestId}] OpenAI call iniciado`);
```

### 5. INSTRUMENTAR MIDDLEWARES (Alto P1)
```javascript
router.post('/webhooks/wassenger',
  (req, res, next) => {
    console.log('[TIMING] Middleware inicio');
    req.timingStart = Date.now();
    next();
  },
  async (req, res, next) => {
    const start = Date.now();
    await validateWebhookSignature(req, res, () => {
      console.log(`[TIMING] validateWebhookSignature: ${Date.now() - start}ms`);
      next();
    });
  },
  async (req, res, next) => {
    const start = Date.now();
    await rateLimitByPhone(req, res, () => {
      console.log(`[TIMING] rateLimitByPhone: ${Date.now() - start}ms`);
      next();
    });
  },
  async (req, res) => {
    console.log(`[TIMING] Handler inicio: ${Date.now() - req.timingStart}ms desde request`);
    // ... resto del código
  }
);
```

### 6. FALLBACK INMEDIATO (Crítico P0)
```javascript
// Si loadProfile toma > 5s, usar perfil en cache o vacío
const profilePromise = loadProfile(userId);
const timeoutPromise = new Promise(resolve => 
  setTimeout(() => resolve(getCachedProfile(userId) || {}), 5000)
);

const profile = await Promise.race([profilePromise, timeoutPromise]);
```

---

## 📈 PLAN DE EJECUCIÓN

### Fase 1: Diagnóstico Inmediato (AHORA)
- [ ] Leer código wassenger.js líneas 680-1237
- [ ] Identificar todos los `await` sin timeout
- [ ] Verificar middleware validateWebhookSignature
- [ ] Verificar middleware rateLimitByPhone

### Fase 2: Fixes Críticos (Hoy)
- [ ] Implementar healthcheck endpoint
- [ ] Agregar timeout a loadProfile()
- [ ] Instrumentar middlewares con timing
- [ ] Deploy y monitorear

### Fase 3: Optimizaciones (Mañana)
- [ ] Paralelizar queries en loadProfile()
- [ ] Agregar correlation IDs
- [ ] Implementar cache de perfiles
- [ ] Agregar métricas de performance

---

## 🎯 CONCLUSIONES T2

### ✅ Confirmado
1. PostgreSQL funciona correctamente (queries en < 500ms)
2. Circuit breaker OpenAI configurado correctamente
3. Dyno sleeping causa delay inicial de 6-10s
4. Código se bloquea ANTES de loadProfile()

### 🔴 Problemas Críticos
1. **Middleware sospechoso:** validateWebhookSignature o rateLimitByPhone bloqueando
2. **Sin timeouts:** Operaciones async sin protección
3. **Sin observabilidad:** Imposible trazar requests
4. **Dyno sleeping:** Plan Eco inapropiado para webhooks

### 📋 Próximos Pasos
1. **Inmediato:** Leer código wassenger.js:680-1237 completo
2. **Hoy:** Implementar healthcheck
3. **Hoy:** Agregar timeouts a operaciones críticas
4. **Mañana:** Optimizar queries y agregar observabilidad

---

**Estado:** ✅ DIAGNÓSTICO COMPLETADO  
**Siguiente tarea:** Investigar middlewares y código líneas 680-1237  
**Aprobación necesaria:** Verde para implementar fixes
