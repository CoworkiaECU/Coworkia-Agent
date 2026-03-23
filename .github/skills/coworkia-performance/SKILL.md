# 📈 Skill: coworkia-performance

## Propósito
Sistema de observabilidad de performance para Coworkia Agent. Rastrea requests HTTP, queries de base de datos, activaciones de agentes y métricas de sistema en tiempo real.

---

## Archivos clave

| Archivo | Rol |
|---------|-----|
| `src/utils/observability.js` | `MetricsCollector`, `requestTrackingMiddleware`, `withQueryTracking`, `metricsCollector` singleton |
| `src/database/postgres-adapter.js` | Llama `metricsCollector.recordQuery()` en `run()`, `get()`, `all()` |
| `src/express-servidor/index.js` | Monta `requestTrackingMiddleware` (línea ~96) |
| `src/cron/daily-report.js` | `sendWeeklyPerfReport()` — lunes 09:00 Ecuador |

---

## Métricas disponibles

### `metricsCollector.getMetrics()` — estructura completa

```js
{
  requests: {
    total: 0,
    success: 0,
    failed: 0,
    avgResponseTime: 0,      // ms
    lastError: null,
    lastErrorTime: null
  },
  database: {
    queriesTotal: 0,
    queriesSuccess: 0,
    queriesFailed: 0,
    slowQueries: 0,           // queries > 500ms
    avgQueryTime: 0,          // ms
    poolActive: 0,
    poolIdle: 0,
    poolWaiting: 0
  },
  agents: {
    AURORA: { activations: 0, avgResponseTime: 0 },
    ALUNA:  { activations: 0, avgResponseTime: 0 },
    // ... ENZO, ADRIANA, ANGELA, AXEL, GABI, PAULA
  },
  openai: {
    requestsTotal: 0,
    requestsSuccess: 0,
    requestsFailed: 0,
    tokensUsed: 0,
    avgLatency: 0
  },
  system: {
    uptime: <timestamp ms>,
    memoryUsage: 0,
    cpuUsage: 0,
    activeConnections: 0
  },
  timestamp: "<ISO string>",
  uptimeSeconds: 0
}
```

---

## Comando WhatsApp: `/perf`

Solo `DIEGO_PERSONAL_PHONE` puede ejecutarlo.

Respuesta de ejemplo:
```
📈 Performance Snapshot

📥 Requests: 1432 total | 12 fallidos
⏱️ Avg response: 245ms
🗄️ Queries: 5892 | Lentas: 3
💾 RAM heap: 187MB
🕐 Ahora: 09:14:32
```

---

## Reporte semanal automático

Se envía por WhatsApp a Diego todos los **lunes a las 09:00** hora Ecuador.

Ejemplo de mensaje:
```
📊 Reporte Semanal de Performance

🔢 Requests totales: 8451
✅ Exitosos: 8390
❌ Fallidos: 61
⏱️ Avg response time: 312ms

🗄️ Queries totales: 24109
🐢 Queries lentas (+500ms): 7
⏱️ Avg query time: 48ms

💾 RAM actual: 198MB
🕐 Período: últimos 7 días
```

---

## HTTP endpoint

```
GET /metrics
```
Retorna el mismo objeto que `getMetrics()`. Accesible en producción para debug.

---

## Detección de slow queries

Umbral: **500ms**. Cuando una query supera este umbral:
1. `metricsCollector.database.slowQueries` se incrementa
2. Se emite `console.warn('[POSTGRES SLOW] run/get/all() Xms — SQL...')`

Para cambiar el umbral:
```js
// En postgres-adapter.js, métodos run(), get(), all()
const _slow = _dur > 500;  // ← cambiar este valor
```

---

## Añadir métricas personalizadas

```js
import { metricsCollector } from '../utils/observability.js';

// Registrar una activación de agente
metricsCollector.recordAgentActivation('AURORA', responseTimeMs);

// Registrar request HTTP manualmente
metricsCollector.recordRequest(true, durationMs);

// Registrar query manualmente
metricsCollector.recordQuery(true, durationMs, isSlow);
```

---

## Config vars relevantes

| Variable | Efecto |
|----------|--------|
| `DEBUG_MODE=true` | Activa logs detallados de queries en postgres-adapter |
| `NODE_ENV=production` | Evitar logs excesivos, protege rollback de migraciones |
