# 🔒 T3: Auditoría de Estabilidad Wassenger

**Fecha:** 2026-01-13  
**Versión:** v418 (v416-organized)  
**Estado:** 🚨 **CRÍTICO - SEGURIDAD COMPROMETIDA**

---

## 🎯 Objetivo

Auditar la seguridad y estabilidad del webhook de Wassenger para identificar vulnerabilidades y puntos de mejora.

---

## 🚨 HALLAZGOS CRÍTICOS

### 1. **SEGURIDAD COMPLETAMENTE DESHABILITADA** 🚨🚨🚨

**Problema:**
```bash
WEBHOOK_SECURITY_BYPASS=true
```

La variable de entorno está configurada para **bypass completo** de seguridad. Esto significa:

- ❌ **NO se valida firma HMAC**
- ❌ **NO se valida token compartido**
- ❌ **NO se valida IP de origen**
- ⚠️ **Cualquier persona puede enviar webhooks falsos**
- 💀 **Riesgo de spam masivo, ataques, y abuso de recursos**

**Impacto:**
- **CRÍTICO**: Endpoint completamente expuesto
- **ALTO**: Posible abuso de OpenAI API (costo $$$ ilimitado)
- **ALTO**: Posible spam a usuarios reales
- **MEDIO**: Posible denegación de servicio (DoS)

**Evidencia (logs):**
```
2026-01-13T01:35:59 [WEBHOOK-SECURITY] ⚠️ BYPASS ACTIVADO - Seguridad deshabilitada
2026-01-13T01:34:07 [WEBHOOK-SECURITY] ⚠️ BYPASS ACTIVADO - Seguridad deshabilitada
2026-01-13T01:33:08 [WEBHOOK-SECURITY] ⚠️ BYPASS ACTIVADO - Seguridad deshabilitada
... (100% de requests sin validación)
```

**Configuración disponible pero NO USADA:**
```bash
WASSENGER_WEBHOOK_SECRET=76eb8034a04a9bd5951683116520f7d41dce1862
WASSENGER_WEBHOOK_TOKEN=coworkia-secure-token-2024
```

---

### 2. **Rate Limiting NO Efectivo** ⚠️

**Problema:**
- Rate limit configurado: 10 requests/min por teléfono
- **PERO**: Si bypass está activo, cualquiera puede enviar sin `fromNumber`
- **PERO**: Rate limit solo aplica DESPUÉS de pasar validateWebhookSignature
- **PERO**: No hay rate limit global (solo por teléfono)

**Impacto:**
- **MEDIO**: Ataque puede saturar el servidor enviando requests sin teléfono
- **BAJO**: Si logran pasar validación, aún pueden hacer 10 req/min

**Código actual:**
```javascript
export function rateLimitByPhone(req, res, next) {
  const phoneNumber = req.body?.data?.fromNumber || ...;
  
  if (!phoneNumber) {
    return next(); // ⚠️ SIN TELÉFONO = SIN RATE LIMIT
  }
  
  // ... solo aplica si hay teléfono
}
```

---

### 3. **Endpoints sin Protección** ⚠️

**Rutas analizadas:**

| Ruta | Middlewares | Seguridad | Estado |
|------|-------------|-----------|--------|
| `POST /webhooks/wassenger` | ✅ validateWebhook, ✅ rateLimit | BYPASS activo 🚨 | VULNERABLE |
| `GET /webhooks/wassenger/status` | ❌ Ninguno | Expuesto | INFO NO SENSIBLE ✅ |
| `GET /webhooks/wassenger` | ❌ Ninguno | Expuesto | VERIFICACIÓN OK ✅ |
| `POST /webhooks/wassenger/control` | ❌ Ninguno | No implementado | INOFENSIVO ✅ |

**Análisis de endpoints:**

**`/webhooks/wassenger/control` - NO IMPLEMENTADO ✅**
```javascript
router.post('/webhooks/wassenger/control', (req, res) => {
  return res.json({ 
    ok: false, 
    error: 'NOT_IMPLEMENTED',
    message: 'Use Heroku CLI para cambiar WASSENGER_ENABLED'
  });
});
```

**Evaluación:** ✅ Endpoint seguro - solo retorna instrucciones de CLI, no ejecuta nada.

**`/webhooks/wassenger/status` - INFO SENSIBLE**
```javascript
router.get('/webhooks/wassenger/status', (req, res) => {
  // ⚠️ SIN AUTENTICACIÓN
  // Expone métricas internas, estado del sistema
});
```

---

## 🔍 ANÁLISIS DE CÓDIGO

### Validación HMAC (CORRECTO pero DESHABILITADO)

```javascript
// ✅ Implementación correcta de HMAC SHA-256
const hmac = crypto.createHmac('sha256', webhookSecret);
hmac.update(body);
const expectedSignature = 'sha256=' + hmac.digest('hex');

// ✅ Timing-safe compare (previene timing attacks)
if (!timingSafeCompare(signatureHeader, expectedSignature)) {
  return res.status(401).json({ success: false, error: 'Unauthorized' });
}
```

**Evaluación:** ✅ Código correcto, pero **NO SE USA** por bypass.

---

### IP Whitelisting (CORRECTO pero DESHABILITADO)

```javascript
const WASSENGER_IPS = [
  '34.125.216.155',
  '34.16.197.77',
  '34.16.255.249',
  '35.223.0.0/16',
  '34.16.0.0/16'
];

function isWassengerIP(ip) {
  if (ip.startsWith('34.125.') || ip.startsWith('35.223.') || ip.startsWith('34.16.')) {
    return true;
  }
  return false;
}
```

**Evaluación:** ✅ Implementación correcta, pero **NO SE USA** por bypass.

**Problema detectado:** Validación de rangos CIDR simplificada. Debería usar librería como `ip-range-check` para validación precisa.

---

### Rate Limiting (PARCIAL)

```javascript
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minuto
const MAX_REQUESTS_PER_WINDOW = 10;

export function rateLimitByPhone(req, res, next) {
  const phoneNumber = req.body?.data?.fromNumber || ...;
  
  if (!phoneNumber) {
    return next(); // ⚠️ PROBLEMA: Sin phone = sin límite
  }
  
  if (recentRequests.length >= MAX_REQUESTS_PER_WINDOW) {
    return res.status(429).json({ error: 'Too many requests' });
  }
}
```

**Problemas:**
1. ❌ Sin teléfono = sin rate limit
2. ❌ No hay rate limit global (por IP o total)
3. ❌ Store en memoria (se pierde al reiniciar)
4. ⚠️ Cleanup aleatorio (1% chance) es impredecible

**Evaluación:** 🟡 Funciona para usuarios legítimos, pero fácil de evadir.

---

## 📊 MÉTRICAS DE ESTABILIDAD

### Timing Logs (Latencia Middlewares)

**Actual:**
- `validateWebhookSignature`: ~0-2ms (bypass activo)
- `rateLimitByPhone`: ~0-1ms

**Esperado (con validación activa):**
- HMAC validation: ~2-5ms
- IP check: ~0-1ms
- Rate limit: ~0-1ms

**Total esperado:** ~3-7ms de overhead (ACEPTABLE ✅)

---

### Circuit Breakers

**Wassenger dispatcher:**
```javascript
circuitId: 'wassenger:messages',
timeoutMs: 5000
```

**Estado:** ✅ Circuit breaker configurado correctamente en `dispatchHttpRequest`

---

### Retry Logic

**NO IMPLEMENTADO** ❌

No hay retry automático para:
- Fallos de red temporales
- Errores 5xx de Wassenger API
- Timeouts en requests salientes

**Impacto:** Mensajes pueden perderse si Wassenger API falla temporalmente.

---

## 🎯 RECOMENDACIONES CRÍTICAS

### P0: ACTIVAR SEGURIDAD (URGENTE) 🚨

**Acción inmediata:**
```bash
heroku config:unset WEBHOOK_SECURITY_BYPASS
```

**Verificar que Wassenger envíe el header:**
- `x-webhook-signature` con firma HMAC SHA-256
- O `x-wassenger-token` con token compartido

**Si Wassenger NO envía headers:**
1. Configurar en panel de Wassenger
2. Usar IP whitelisting como fallback
3. Considerar implementar token personalizado en query param

---



### P1: RATE LIMIT GLOBAL

**Implementar rate limit por IP además de por teléfono:**

```javascript
// Rate limit global por IP
const ipRateLimitStore = new Map();
const MAX_REQUESTS_PER_IP = 30; // 30 req/min por IP

export function rateLimitByIP(req, res, next) {
  const clientIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() 
    || req.connection.remoteAddress;
  
  // Similar a rateLimitByPhone pero por IP
}
```

**Aplicar en cascada:**
```javascript
router.post('/webhooks/wassenger', 
  validateWebhookSignature,
  rateLimitByIP,        // ⬅️ NUEVO: Rate limit global
  rateLimitByPhone,     // ⬅️ EXISTENTE: Rate limit por usuario
  async (req, res) => { ... }
);
```

---

### P1: CORRELATION IDs

**Implementar request tracking:**

```javascript
import { randomUUID } from 'crypto';

export function addCorrelationId(req, res, next) {
  req.correlationId = req.headers['x-correlation-id'] || randomUUID();
  res.setHeader('x-correlation-id', req.correlationId);
  next();
}

// Usar en logs:
console.log(`[${req.correlationId}] Procesando mensaje de ${phoneNumber}`);
```

**Beneficios:**
- Trazabilidad completa de requests
- Debugging más fácil
- Correlación con logs de Wassenger

---

### P2: RETRY LOGIC PARA OUTBOUND

**Implementar retry con backoff exponencial:**

```javascript
import { withRetry } from '../../utils/timeout-helpers.js';

// Al enviar mensajes:
await withRetry(
  () => dispatchHttpRequest({...}),
  maxRetries: 3,
  timeoutMs: 5000
);
```

**Ya existe `withRetry` en timeout-helpers.js**, solo falta usarlo.

---

### P2: ALMACENAMIENTO PERSISTENTE DE RATE LIMITS

**Migrar de Map in-memory a Redis o PostgreSQL:**

```javascript
// Opción 1: PostgreSQL (ya disponible)
await pool.query(`
  INSERT INTO rate_limits (phone, timestamp)
  VALUES ($1, $2)
  ON CONFLICT DO NOTHING
`, [phone, now]);

// Opción 2: Redis (si se agrega)
await redis.incr(`rate_limit:${phone}:${minute}`);
await redis.expire(`rate_limit:${phone}:${minute}`, 60);
```

**Beneficio:** Rate limits sobreviven a reinicios del dyno.

---

### P3: VALIDACIÓN DE CIDR MEJORADA

**Usar librería para validar rangos IP:**

```bash
npm install ip-range-check
```

```javascript
import ipRangeCheck from 'ip-range-check';

function isWassengerIP(ip) {
  return ipRangeCheck(ip, WASSENGER_IPS);
}
```

---

## 📋 CHECKLIST DE SEGURIDAD

### Immediate Actions (HOY)

- [ ] **Desactivar `WEBHOOK_SECURITY_BYPASS`** 🚨
- [ ] Verificar que Wassenger envíe headers de seguridad
- [ ] Testear que validación HMAC funcione
- [ ] Agregar autenticación a `/webhooks/wassenger/control` 🚨
- [ ] Implementar rate limit por IP

### Short-term (Esta Semana)

- [ ] Implementar correlation IDs
- [ ] Agregar retry logic a outbound requests
- [ ] Monitorear logs para rate limit violations
- [ ] Documentar proceso de rotación de secrets

### Medium-term (Próximo Mes)

- [ ] Migrar rate limits a PostgreSQL
- [ ] Implementar monitoring de seguridad (alertas)
- [ ] Agregar validación CIDR mejorada
- [ ] Implementar webhook signature verification tests

---

## 🧪 PLAN DE TESTING

### Test de Seguridad

```bash
# Test 1: Webhook sin firma (debe fallar)
curl -X POST https://coworkia-agent.herokuapp.com/webhooks/wassenger \
  -H "Content-Type: application/json" \
  -d '{"data": {"fromNumber": "test"}}'
# Esperado: 401 Unauthorized

# Test 2: Webhook con firma inválida (debe fallar)
curl -X POST https://coworkia-agent.herokuapp.com/webhooks/wassenger \
  -H "Content-Type: application/json" \
  -H "x-webhook-signature: sha256=invalid" \
  -d '{"data": {"fromNumber": "test"}}'
# Esperado: 401 Unauthorized

# Test 3: Webhook con firma válida (debe pasar)
# Generar firma HMAC correcta y enviar
# Esperado: 200 OK

# Test 4: Rate limit (10+ requests en 1 min)
for i in {1..15}; do
  curl -X POST https://coworkia-agent.herokuapp.com/webhooks/wassenger \
    -H "x-webhook-signature: sha256=..." \
    -d '{"data": {"fromNumber": "+593999999999"}}'
done
# Esperado: Requests 1-10 → 200 OK, 11-15 → 429 Too Many Requests
```

---

## 📊 RESUMEN EJECUTIVO

### Estado Actual: 🔴 CRÍTICO

**Vulnerabilidades P0:**
1. 🚨 Seguridad completamente deshabilitada (bypass activo)
2. ⚠️ Rate limit fácil de evadir (sin teléfono = sin límite)
3. ⚠️ No hay rate limit global por IP

**Riesgo Actual:**
- **Costo potencial ilimitado** (abuso OpenAI API)
- **Spam a usuarios reales**
- **Denegación de servicio**
- **Exposición de información sensible**

### Implementaciones Correctas ✅

1. ✅ Validación HMAC (código correcto, solo deshabilitado)
2. ✅ IP whitelisting (código correcto, solo deshabilitado)
3. ✅ Timing-safe comparison (previene timing attacks)
4. ✅ Circuit breakers configurados
5. ✅ Timeout protection implementada

### Siguiente Paso: ACTIVAR SEGURIDAD

**Comando:**
```bash
heroku config:unset WEBHOOK_SECURITY_BYPASS
heroku restart
```

**Validar:**
```bash
heroku logs --tail | grep "WEBHOOK-SECURITY"
```

**Esperado:**
```
[WEBHOOK-SECURITY] ✅ Firma HMAC válida
[WEBHOOK-SECURITY] ✅ IP Wassenger whitelisteada
```

---

**Auditoría completada:** 2026-01-13  
**Próxima revisión:** Después de activar seguridad  
**Responsable:** Aurora 🤖
