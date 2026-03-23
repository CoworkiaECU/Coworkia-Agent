# 🛠️ Plan de Vuelo — Nuevos Skills del Sistema
**Fecha:** 23 Mar 2026  
**Activar con:** `autopilot verde nena`  
**Control desde celular:** Sí — cada bloque notifica por WA con opciones Si/No/Review  
**Duración estimada:** ~2h autónomo

---

## 🔍 Estado del Repo ANTES de Empezar

Ya existe (NO reinventar):
- `src/servicios/health-monitor.js` — Checks OpenAI + DB cada 5min → WA
- `src/express-servidor/endpoints-api/healthcheck.js` — `/health`, `/health/detailed`, `/ping`
- `src/cron/daily-report.js` — Reporte diario 9am Ecuador por WA
- `src/utils/observability.js` — MetricsCollector, StructuredLogger, HealthChecker, requestTrackingMiddleware
- `src/servicios/notification-service.js` — `notifyDiego()`, `notifyAutopilotComplete()`, `notifyCriticalError()`

Los nuevos skills DEBEN referenciar lo existente, no copiarlo.

---

## 📦 SKILL 1 — coworkia-monitoring

**Objetivo:** Ampliar el health-monitor existente con alertas más inteligentes + comando desde celular para ver estado en tiempo real.

### Qué hacer

**B1 — Extender `health-monitor.js`**
- Agregar check de Wassenger (POST `/v1/messages` con body vacío, esperar 4xx != 5xx)
- Agregar check de Heroku dyno memory (ya disponible en `process.memoryUsage()` — si RSS > 450MB, warning WA)
- Cambiar intervalo a 10min (actualmente 5min) para ahorrar llamadas API en eco dyno

**B2 — Comando `/status` desde WhatsApp**
- En `wassenger.js`, el handler de mensajes de DIEGO_PERSONAL ya existe
- Agregar keyword `/status` → responde con reporte inmediato: uptime, DB latency, memoria, last error
- Usar `/health/detailed` endpoint como fuente de datos

**B3 — Crear SKILL.md documentando el sistema**
- Archivo: `.github/skills/coworkia-monitoring/SKILL.md`
- Documenta qué checks existen, cómo extenderlos, cómo interpretar alertas WA

### Archivos a modificar
- `src/servicios/health-monitor.js` (extender)
- `src/express-servidor/endpoints-api/wassenger.js` (agregar keyword `/status`)
- `.github/skills/coworkia-monitoring/SKILL.md` (crear)

---

## 📦 SKILL 2 — coworkia-database-migrations

**Objetivo:** Sistema simple de migraciones versionadas con rollback. El repo actualmente usa `IF NOT EXISTS` en postgres-adapter.js — hay que formalizarlo.

### Qué hacer

**B4 — Crear `src/database/migrations/`**
- `migration-runner.js` — lee archivos `NNN_descripcion.js` en orden, trackea últimas aplicadas en tabla `_migrations`
- `001_initial.js` — extrae las CREATE TABLE existentes de `postgres-adapter.js` para tener baseline
- `template.js` — template para futuras migraciones con `up()` y `down()`

**B5 — Comando `/migrate` desde WhatsApp**
- Keyword `/migrate status` → lista qué migraciones están aplicadas
- No ejecuta migrations automáticamente — solo informa

**B6 — Backup pre-migración**
- Función `backupSchema()` que descarga el DDL actual con `pg_dump --schema-only`
- Solo disponible en local (Heroku no tiene pg_dump directo, usa `heroku pg:backups:capture`)
- En Heroku: llamar `heroku pg:backups:capture` via Heroku API antes de migrar

**B7 — Crear SKILL.md**
- Archivo: `.github/skills/coworkia-database-migrations/SKILL.md`
- Documenta comandos, cómo crear nueva migración, cómo hacer rollback, política de backups

### Archivos a crear
- `src/database/migrations/migration-runner.js`
- `src/database/migrations/001_initial.js`  
- `src/database/migrations/template.js`
- `.github/skills/coworkia-database-migrations/SKILL.md`

### Archivos a modificar
- `src/express-servidor/index.js` (ejecutar migration-runner en boot, antes de startHealthMonitor)
- `src/express-servidor/endpoints-api/wassenger.js` (keyword `/migrate status`)

---

## 📦 SKILL 3 — coworkia-performance

**Objetivo:** Activar el `observability.js` existente (actualmente poco usado) y agregar reporte semanal de queries lentas por WA.

### Qué hacer

**B8 — Activar `requestTrackingMiddleware` globalmente**
- Ya existe en `observability.js` pero NO está montado en `index.js`
- Agregar `app.use(requestTrackingMiddleware)` en el servidor
- Esto activa tracking de tiempo de respuesta por endpoint automáticamente

**B9 — Slow query detection en postgres-adapter**
- En `src/database/postgres-adapter.js`, la función `run()` ya existe
- Wrappear con timer: si query tarda > 500ms → log + incrementar `metricsCollector.database.slowQueries`
- Ya existe `withQueryTracking()` en observability — usarlo

**B10 — Reporte semanal de performance por WA**
- Agregar a `daily-report.js` un reporte semanal (lunes 9am)
- Incluir: top 3 endpoints más lentos, slow queries count, memoria promedio
- Fuente: `metricsCollector.getSnapshot()` que ya existe

**B11 — Comando `/perf` desde WhatsApp**
- Keyword `/perf` → responde con snapshot actual de métricas
- Fuente: `metricsCollector.getSnapshot()`

**B12 — Crear SKILL.md**
- Archivo: `.github/skills/coworkia-performance/SKILL.md`
- Documenta qué métricas se trackean, cómo interpretar `/perf`, umbrales de alerta

### Archivos a modificar
- `src/express-servidor/index.js` (montar requestTrackingMiddleware)
- `src/database/postgres-adapter.js` (wrappear con withQueryTracking)
- `src/cron/daily-report.js` (agregar reporte semanal lunes)
- `src/express-servidor/endpoints-api/wassenger.js` (keywords `/perf`)
- `.github/skills/coworkia-performance/SKILL.md` (crear)

---

## 🤖 Control desde Celular — Comandos WA

Al terminar este autopilot, estos comandos estarán disponibles desde WhatsApp:

| Comando | Respuesta |
|---------|-----------|
| `/status` | Uptime, DB latency, memoria RAM, último error |
| `/migrate status` | Lista de migraciones aplicadas y pendientes |
| `/perf` | Snapshot de métricas: requests, slow queries, memoria |

---

## 🔄 Secuencia de Ejecución

```
Leer skill coworkia-notifications (WA transport ya existe)
Leer dont-repeat-yourself (no reinventar)

→ B1: Extend health-monitor.js  
  → node --check ✅  
→ B2: /status en wassenger.js  
  → node --check ✅  
→ B3: SKILL.md monitoring  
[CHECKPOINT → notifyAutopilotComplete(3, 0, 'monitoring')]

→ B4: migration-runner + 001_initial + template  
→ B5: /migrate status en wassenger.js  
→ B6: backup logic  
→ B7: SKILL.md migrations  
[CHECKPOINT → notify]

→ B8: montar requestTrackingMiddleware en index.js  
→ B9: slow query detection en postgres-adapter.js  
→ B10: reporte semanal en daily-report.js  
→ B11: /perf en wassenger.js  
→ B12: SKILL.md performance  
[CHECKPOINT → notify]

node --check en todos los archivos JS modificados ✅
git add -A && git commit -m "feat(skills): monitoring + migrations + performance (B1-B12)"
git push heroku main
notifyAutopilotComplete(12, 0, 'nuevos-skills')
```

---

## ✅ Criterios de Completado

- [ ] `node --check` pasa en todos los archivos modificados
- [ ] 3 nuevos `SKILL.md` creados en `.github/skills/`
- [ ] Comando `/status` funciona desde WA → responde con estado del sistema
- [ ] Comando `/migrate status` funciona desde WA
- [ ] Comando `/perf` funciona desde WA
- [ ] `requestTrackingMiddleware` montado en index.js
- [ ] migration-runner crea tabla `_migrations` en boot si no existe
- [ ] Deploy a Heroku exitoso
- [ ] Notificación WA al final con resumen

---

## ⚠️ Reglas Críticas

- Lee `dont-repeat-yourself` SKILL antes de escribir una línea
- NO crear nuevo servicio de notificaciones — usar `notification-service.js`
- NO crear nuevo health check — extender `health-monitor.js`
- `node --check` OBLIGATORIO antes de cualquier commit
- Wassenger keywords: solo responden a `DIEGO_PERSONAL_PHONE`
- Si algo falla, `notifyAutopilotBlocked(reason)` y detener

---

*Plan creado por GitHub Copilot — Sesión Aurora 23 Mar 2026*
