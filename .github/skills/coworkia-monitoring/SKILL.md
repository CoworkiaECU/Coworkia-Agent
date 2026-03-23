---
name: coworkia-monitoring
description: Sistema de monitoreo continuo de salud del sistema. Health checks automáticos de OpenAI, PostgreSQL, Wassenger y RAM cada 10 minutos. Alertas por WhatsApp al celular de Diego cuando algo falla. Comando /status desde celular para ver estado en tiempo real.
---

# Coworkia Monitoring — Sistema de Salud

## 🎯 Qué hace

Monitoreo continuo de 4 servicios críticos con alertas por WhatsApp:

| Servicio | Frecuencia | Alerta tras |
|----------|-----------|-------------|
| OpenAI API | cada 10min | 2 fallos consecutivos |
| PostgreSQL | cada 10min | 2 fallos consecutivos |
| Wassenger API | cada 10min | 2 fallos consecutivos |
| RAM del proceso | cada 10min | si RSS > 450MB |

---

## 📁 Archivos Clave

```
src/servicios/health-monitor.js          ← motor principal (EXTENDER AQUÍ)
src/express-servidor/endpoints-api/
  healthcheck.js                         ← endpoints HTTP /health /health/detailed /ping
  wassenger.js → handleDiegoAlwaysOnCommands()  ← comandos desde celular
src/servicios/notification-service.js   ← WA transport (no modificar)
```

---

## 📱 Comandos desde WhatsApp (solo DIEGO_PERSONAL_PHONE)

```
/status    → Estado del sistema: OpenAI ✅/❌, DB ✅/❌, Wassenger ✅/❌, RAM, uptime
STATUS     → Igual que /status (compatibilidad)
```

**Ejemplo de respuesta `/status`:**
```
🖥️ Status del Sistema

✅ OpenAI: ok
✅ DB: ok  
✅ Wassenger: ok
💾 RAM: 180MB / uptime: 2h 15m
🕐 Último check: 09:32:14

📊 Stats
🏢 Reservas hoy: 3
👥 Leads Aluna (30d): 12
🎨 Cotizaciones Axel (30d): 5
```

---

## 🔧 Cómo Agregar un Nuevo Check

1. Agregar contador en `failCounters`:
```js
const failCounters = { openai: 0, db: 0, wassenger: 0, miNuevoServicio: 0 };
```

2. Crear función `checkMiServicio()`:
```js
async function checkMiServicio() {
  try {
    // Hacer la verificación
    failCounters.miNuevoServicio = 0;
    return true;
  } catch (err) {
    failCounters.miNuevoServicio++;
    if (failCounters.miNuevoServicio >= FAIL_THRESHOLD) {
      await notifyCriticalError('Health Monitor — MiServicio', err);
      failCounters.miNuevoServicio = 0;
    }
    return false;
  }
}
```

3. Agregar al `runChecks()`:
```js
const [openaiOk, dbOk, wassengerOk, miServicioOk] = await Promise.all([
  checkOpenAI(), checkDatabase(), checkWassenger(), checkMiServicio()
]);
```

4. Actualizar `_lastStatus`:
```js
_lastStatus = { ..., miServicio: miServicioOk ? 'ok' : 'fail' };
```

---

## 📡 Endpoints HTTP

```
GET /health           → { status: 'ok', uptime, timestamp }
GET /health/detailed  → { status, db: { status, latencyMs }, memory, circuitBreakers }
GET /ping             → "pong"
GET /health/system    → estado completo con scheduler, circuit breakers
```

---

## ⚙️ Configuración

```env
DIEGO_PERSONAL_PHONE=+593XXXXXXXXX   # Quién recibe alertas WA
OPENAI_API_KEY=...                   # Check de OpenAI
WASSENGER_TOKEN=...                  # Check de Wassenger
```

**Umbrales** (en `health-monitor.js`):
```js
const CHECK_INTERVAL_MS = 10 * 60 * 1000; // 10 minutos
const FAIL_THRESHOLD    = 2;               // Alertar tras N fallos seguidos
const RAM_WARN_MB       = 450;             // Alert si RSS > 450MB
```

---

## 🚨 Formato de Alerta WA (cuando algo falla)

```
🚨 Aurora Agent: Error Crítico

❌ Health Monitor — PostgreSQL
🕐 Hora: 14:32 EC
🔍 Error: Connection refused

Verifica Heroku Dashboard y logs:
heroku logs --app coworkia-agent --num 50
```

---

## 📊 API `getLastStatus()`

```js
import { getLastStatus } from '../servicios/health-monitor.js';

const s = getLastStatus();
// {
//   checkedAt: '2026-03-23T14:32:00.000Z',
//   openai: 'ok' | 'fail' | 'unknown',
//   db: 'ok' | 'fail' | 'unknown',
//   wassenger: 'ok' | 'fail' | 'unknown',
//   ramMB: 180
// }
```

---

## 🔗 Integración con Autopilot

El autopilot usa `notifyCriticalError()` del mismo `notification-service.js`.
Si el health monitor detecta un fallo y el autopilot está activo, ambas alertas pueden llegar.
No hay conflicto: son canales independientes.
