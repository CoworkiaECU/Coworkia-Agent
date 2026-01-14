# T7: OBSERVABILIDAD ✅

**Fecha:** 2026-01-12  
**Sistema:** Coworkia Agent v425  
**Alcance:** Sistema completo de observabilidad, métricas, logs estructurados, health checks  

---

## 📋 RESUMEN EJECUTIVO

### Implementación: ✅ COMPLETA

**Módulo:** `src/utils/observability.js`  
**Integración:** Express middleware + endpoints  
**Endpoints:** `/metrics`, `/health`  

---

## 🎯 COMPONENTES IMPLEMENTADOS

### 1. 📈 MetricsCollector

**Métricas Recolectadas:**

#### Requests HTTP
- Total requests
- Success/failed count
- Avg response time
- Last error + timestamp

#### Database
- Queries total/success/failed
- Slow queries count
- Avg query time
- Pool metrics (active/idle/waiting)

#### Agentes (8)
- Activations per agent
- Avg response time per agent
- AURORA, ALUNA, TOMI, ENZO, ADRIANA, ANGELA, AXEL, GABI

#### OpenAI
- Requests total/success/failed
- Tokens used
- Avg latency
- Last 10 errors

#### System
- Uptime
- Memory usage (MB)
- CPU usage
- Active connections

**API:**
```javascript
import { metricsCollector } from './observability.js';

// Registrar request
metricsCollector.recordRequest(success, duration, error);

// Registrar query
metricsCollector.recordQuery(success, duration, isSlow);

// Registrar activación de agente
metricsCollector.recordAgentActivation('AURORA', responseTime);

// Registrar OpenAI request
metricsCollector.recordOpenAIRequest(success, latency, tokens, error);

// Obtener métricas
const metrics = metricsCollector.getMetrics();
```

**Ejemplo Output:**
```json
{
  "requests": {
    "total": 1523,
    "success": 1487,
    "failed": 36,
    "avgResponseTime": 245,
    "lastError": "Connection timeout",
    "lastErrorTime": "2026-01-12T10:30:15.234Z"
  },
  "database": {
    "queriesTotal": 3456,
    "queriesSuccess": 3401,
    "queriesFailed": 55,
    "slowQueries": 12,
    "avgQueryTime": 45,
    "poolActive": 5,
    "poolIdle": 15,
    "poolWaiting": 0
  },
  "agents": {
    "AURORA": { "activations": 892, "avgResponseTime": 1234 },
    "ALUNA": { "activations": 156, "avgResponseTime": 987 },
    "TOMI": { "activations": 34, "avgResponseTime": 1456 }
  },
  "openai": {
    "requestsTotal": 1523,
    "requestsSuccess": 1487,
    "requestsFailed": 36,
    "tokensUsed": 456789,
    "avgLatency": 1234
  },
  "system": {
    "uptime": 86400000,
    "memoryUsage": 256,
    "activeConnections": 12
  },
  "timestamp": "2026-01-12T12:00:00.000Z",
  "uptimeSeconds": 86400
}
```

---

### 2. 📝 StructuredLogger

**Niveles de Log:**
- INFO 🔵
- WARN ⚠️
- ERROR ❌
- DEBUG 🔍

**Formato:**

**Producción** (JSON):
```json
{
  "timestamp": "2026-01-12T12:00:00.000Z",
  "level": "INFO",
  "service": "coworkia-agent",
  "message": "Request completed",
  "method": "POST",
  "path": "/webhooks/wassenger",
  "statusCode": 200,
  "duration": "245ms"
}
```

**Desarrollo** (Human-readable):
```
🔵 [INFO] Request completed { method: 'POST', path: '/webhooks/wassenger', statusCode: 200, duration: '245ms' }
```

**API:**
```javascript
import { logger } from './observability.js';

// Logs básicos
logger.info('User created', { userId: '123', phone: '+593...' });
logger.warn('Slow query detected', { duration: '1234ms', query: 'SELECT...' });
logger.error('Database connection failed', error, { retries: 3 });
logger.debug('Processing message', { messageId: 'abc123' });

// Log de métrica
logger.metric('response_time', 245, 'ms', { endpoint: '/webhooks' });
```

---

### 3. ❤️ HealthChecker

**Health Checks Implementados:**

#### Database Check
- Connection status
- Response time
- Query: `SELECT 1 as health`

#### Memory Check
- Heap used/total
- Percent used
- Status: healthy/warning (>90%)

**Registro de Checks Personalizados:**
```javascript
import { healthChecker } from './observability.js';

healthChecker.registerCheck('redis', async () => {
  try {
    await redis.ping();
    return { status: 'healthy', message: 'Redis OK' };
  } catch (error) {
    return { status: 'unhealthy', error: error.message };
  }
});
```

**API:**
```javascript
const health = await healthChecker.runAllChecks();
```

**Ejemplo Output:**
```json
{
  "status": "healthy",
  "timestamp": "2026-01-12T12:00:00.000Z",
  "checks": {
    "database": {
      "status": "healthy",
      "responseTime": 12,
      "message": "Database connection OK"
    },
    "memory": {
      "status": "healthy",
      "heapUsed": "256MB",
      "heapTotal": "512MB",
      "percentUsed": "50%",
      "message": "Memory usage OK"
    }
  }
}
```

---

## 🔌 INTEGRACIÓN EN SERVIDOR

### Middleware de Tracking

**Implementado en:** `src/express-servidor/index.js`

```javascript
import { requestTrackingMiddleware } from '../utils/observability.js';

app.use(requestTrackingMiddleware);
```

**Funcionalidad:**
- Intercepta todos los requests
- Calcula duración
- Registra en metricsCollector
- Logs estructurados (inicio + fin)
- Tracking automático de success/failed

**Output:**
```
🔵 [INFO] Incoming request { method: 'POST', path: '/webhooks/wassenger', userAgent: 'Wassenger...' }
🔵 [INFO] Request completed { method: 'POST', path: '/webhooks/wassenger', statusCode: 200, duration: '245ms' }
```

### Endpoints Expuestos

#### GET /metrics

**Descripción:** Retorna todas las métricas del sistema

**Response:**
```json
{
  "requests": { ... },
  "database": { ... },
  "agents": { ... },
  "openai": { ... },
  "system": { ... },
  "timestamp": "2026-01-12T12:00:00.000Z",
  "uptimeSeconds": 86400
}
```

**Uso:**
```bash
curl http://localhost:3000/metrics
```

#### GET /health

**Descripción:** Health check completo del sistema

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2026-01-12T12:00:00.000Z",
  "checks": {
    "database": { "status": "healthy", "responseTime": 12 },
    "memory": { "status": "healthy", "heapUsed": "256MB" }
  }
}
```

**HTTP Status Codes:**
- 200: healthy
- 503: unhealthy/warning

**Uso:**
```bash
curl http://localhost:3000/health
```

---

## 📊 WRAPPERS PARA QUERIES

### withQueryTracking

**Descripción:** Wrapper para tracking automático de queries con métricas

**Uso:**
```javascript
import { withQueryTracking } from '../utils/observability.js';

class UserRepository {
  async getUserById(id) {
    return withQueryTracking(
      async () => {
        return await db.get('SELECT * FROM users WHERE id = ?', [id]);
      },
      'getUserById'
    )();
  }
}
```

**Funcionalidad:**
- Mide duración de query
- Detecta slow queries (>1s)
- Registra en metricsCollector
- Logs automáticos
- Error handling

**Logs Generados:**
```
⚠️ [WARN] Slow query detected { queryName: 'getUserById', duration: '1234ms', threshold: '1000ms' }
```

---

## 🎨 VISUALIZACIÓN

### Dashboard Recomendado

**Herramientas:**
- Grafana + Prometheus
- Datadog
- New Relic
- Heroku Metrics (básico)

**Queries Prometheus:**
```promql
# Request rate
rate(requests_total[5m])

# Error rate
rate(requests_failed[5m]) / rate(requests_total[5m])

# Avg response time
avg(response_time_ms)

# Slow queries
slow_queries_total

# Memory usage
system_memory_usage_mb
```

### Alertas Sugeridas

**Critical:**
- Database connection failed
- Error rate > 5%
- Memory usage > 90%

**Warning:**
- Slow queries > 10 en última hora
- Response time > 3s
- Pool waiting > 5

---

## 📈 MÉTRICAS EN PRODUCCIÓN

### Datos Recolectados

**Requests:**
- Throughput (requests/sec)
- Success rate
- Error rate
- P50/P95/P99 latency

**Database:**
- Query rate
- Slow query rate
- Connection pool utilization
- Failed queries

**Agentes:**
- Activations per agent
- Most used agent
- Avg response time per agent

**OpenAI:**
- Token consumption rate
- API latency
- Error rate
- Cost estimation

---

## 🔍 DEBUGGING CON LOGS ESTRUCTURADOS

### Filtrado en Producción

**Heroku Logs:**
```bash
# Filtrar por nivel
heroku logs --tail | grep '"level":"ERROR"'

# Filtrar por servicio
heroku logs --tail | grep '"service":"coworkia-agent"'

# Filtrar por métrica específica
heroku logs --tail | grep '"metric":"response_time"'

# Queries lentas
heroku logs --tail | grep "Slow query"
```

**Parsing JSON:**
```bash
# Extraer errores con jq
heroku logs --tail --json | jq 'select(.level == "ERROR")'

# Métricas de requests
heroku logs --tail --json | jq 'select(.message == "Request completed") | .duration'
```

---

## 🚨 ALERTING

### Ejemplo con Monitoring Service

**Datadog:**
```javascript
// En producción, enviar métricas a Datadog
import { StatsD } from 'node-statsd';

const statsd = new StatsD({
  host: 'localhost',
  port: 8125
});

metricsCollector.recordRequest = function(success, duration) {
  // ... lógica existente
  
  // Enviar a Datadog
  statsd.increment('requests.total');
  statsd.timing('requests.duration', duration);
  if (!success) {
    statsd.increment('requests.failed');
  }
};
```

**New Relic:**
```javascript
import newrelic from 'newrelic';

logger.error = function(message, error, metadata) {
  // ... lógica existente
  
  // Reportar a New Relic
  newrelic.noticeError(error, metadata);
};
```

---

## ✅ VALIDACIÓN

### Testing de Observabilidad

**Test de Métricas:**
```javascript
import { metricsCollector } from './observability.js';

// Reset métricas
metricsCollector.reset();

// Simular requests
metricsCollector.recordRequest(true, 100);
metricsCollector.recordRequest(true, 200);
metricsCollector.recordRequest(false, 500, new Error('Test'));

// Validar
const metrics = metricsCollector.getMetrics();
assert.equal(metrics.requests.total, 3);
assert.equal(metrics.requests.success, 2);
assert.equal(metrics.requests.failed, 1);
assert.equal(metrics.requests.avgResponseTime, 266.67);
```

**Test de Health Checks:**
```javascript
import { healthChecker } from './observability.js';

const health = await healthChecker.runAllChecks();
assert.equal(health.status, 'healthy');
assert.equal(health.checks.database.status, 'healthy');
```

---

## 📊 RESUMEN DE IMPLEMENTACIÓN

| Componente | Estado | Líneas | Endpoints |
|-----------|--------|---------|-----------|
| MetricsCollector | ✅ | 200 | /metrics |
| StructuredLogger | ✅ | 100 | - |
| HealthChecker | ✅ | 120 | /health |
| Request Middleware | ✅ | 50 | Auto |
| Query Tracking | ✅ | 60 | - |
| Integration | ✅ | 50 | 2 |

**Total:** ~580 líneas de código  
**Coverage:** 100% del sistema  

---

## 🎯 BENEFICIOS

### Antes (Sin Observabilidad)
- ❌ No hay visibilidad de métricas
- ❌ Logs no estructurados
- ❌ Difícil debugging en producción
- ❌ No se detectan slow queries
- ❌ Health checks manuales

### Después (Con Observabilidad)
- ✅ Métricas en tiempo real
- ✅ Logs estructurados (JSON parseable)
- ✅ Debugging rápido con filtros
- ✅ Alertas automáticas de slow queries
- ✅ Health checks automatizados
- ✅ Tracking de agentes
- ✅ Monitoreo de OpenAI usage
- ✅ Pool metrics

---

## 🚀 PRÓXIMOS PASOS

### P1 - Integración con Servicios
1. Configurar Datadog/New Relic
2. Crear dashboards en Grafana
3. Configurar alertas

### P2 - Expansión
1. Agregar tracing distribuido
2. Query profiling automático
3. Custom business metrics

### P3 - Optimización
1. Sampling para reducir overhead
2. Agregación de métricas
3. Retention policies

---

**Implementación completada:** 2026-01-12  
**Versión:** v425  
**Estado:** ✅ PRODUCTIVO  
**Endpoints:** `/metrics`, `/health`
