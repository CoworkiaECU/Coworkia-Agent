# 🔍 Auditoría de Duplicados — Coworkia Agent

**Fecha:** 6 abril 2026  
**Alcance:** Todo el repositorio (`src/`, `scripts/`)  
**Objetivo:** Identificar código duplicado, lógica repetida, archivos muertos  
**Estado:** Solo auditoría — NO refactorizar todavía

---

## 📊 Resumen Ejecutivo

| Categoría | Hallazgos | Prioridad |
|-----------|-----------|-----------|
| 🔴 Crons ejecutándose por triplicado | 3 sistemas paralelos | CRÍTICO |
| 🔴 Aurora cron viejo (993L) duplica servicios nuevos | ~800 líneas eliminables | CRÍTICO |
| 🟡 `ensureInitialized()` antipatrón | 38+ ocurrencias en 6 archivos | ALTO |
| 🟡 `normalizePhone()` duplicada | 2 implementaciones distintas | ALTO |
| 🟡 `serviceLabel` inline repetido | 9 veces en 2 archivos | ALTO |
| 🟡 Email templates fuera del sistema central | 2 agentes (Enzo, Aluna) | ALTO |
| 🟡 `sendWhatsApp()` local vs `enviarWhatsApp()` | 2 APIs distintas para lo mismo | ALTO |
| 🟠 Archivos de código muerto | 3 archivos, ~150L | MEDIO |
| 🟠 Archivos .old/.backup sin limpiar | 3 archivos | MEDIO |
| 🟢 Seed-demo endpoints repetidos | 3 dashboards con patrón similar | BAJO |
| 🟢 Confirmation flows: 2 sistemas | confirmation-flow.js + generic | BAJO |

**Líneas potencialmente eliminables/consolidables: ~2,500–3,000**

---

## 🔴 CRÍTICO — Tres Sistemas de Cron Paralelos

### Descripción
El servidor inicia **TRES** sistemas de scheduling en `src/express-servidor/index.js`:

1. **`initScheduler()`** (línea 297) — desde `src/servicios/cron-scheduler.js`
   - Usa `follow-up-service.js` genérico (841L)
   - Registra: followUpJob, membershipRenewalJob, rebookReminderJob, axelReminderJob, paulaFollowUpJob
   
2. **`startAuroraEnzoCronJobs()`** (línea 306) — desde `src/servicios/aurora-enzo-followup-cron.js` (180L)
   - Registra: Aurora +1h, Aurora D+7, Enzo D+1/D+3/D+7, Adriana S1/S2/S3
   - Usa los service files dedicados (aurora-followup-service.js, enzo-followup-service.js, adriana-followup-service.js)

3. **`startAuroraFollowupCrons()`** (línea 325) — desde `src/cron/aurora-followup-cron.js` (993L)
   - Sistema monolítico viejo con SQL inline, sendWhatsApp propio, buildEmailTemplate
   - Implementa: +1h, D+1, D+3, D+7 rebooking, 24h reminder, 2h reminder, no-show detection, NPS, recurrentes

### ⚠️ CONFLICTOS ACTIVOS

| Follow-up | Sistema 1 (cron-scheduler) | Sistema 2 (aurora-enzo-cron) | Sistema 3 (aurora-cron viejo) |
|-----------|---------------------------|------------------------------|------------------------------|
| Aurora +1h | `processFollowUps()` | `sendOneHourFollowups()` | `sendOneHourFollowups()` |
| Aurora D+7 rebook | `processAuroraRebookReminders()` | `sendRebookingReminders()` | `sendRebookingReminders()` |
| Aluna D+1 | `processAlunaLeadFollowUps()` | — | — |
| Axel reminders | `processAxelQuoteReminders()` | — | — |
| Paula followup | `processPaulaFollowUps()` | — | — |
| Enzo D+1/D+3/D+7 | — | ✅ 3 jobs | — |
| Adriana S1/S2/S3 | — | ✅ 3 jobs | — |
| Aurora D+1 | — | — | `sendD1Followups()` |
| Aurora D+3 FOMO | — | — | `sendD3Followups()` |
| Aurora 24h reminder | — | — | `sendReminder24h()` |
| Aurora 2h reminder | — | — | `sendReminder2h()` |
| Aurora no-show | — | — | `detectNoShows()` |

**Resultado:** Aurora +1h y D+7 rebooking se ejecutan desde **3 code paths distintos**. Los clientes pueden recibir mensajes duplicados.

### Archivos involucrados
- `src/express-servidor/index.js:297,306,325` — los 3 starts
- `src/servicios/cron-scheduler.js` — 270L
- `src/servicios/follow-up-service.js` — 841L
- `src/servicios/aurora-enzo-followup-cron.js` — 180L
- `src/cron/aurora-followup-cron.js` — 993L
- `src/servicios/aurora-followup-service.js` — 194L
- `src/servicios/enzo-followup-service.js` — 305L
- `src/servicios/adriana-followup-service.js` — 294L
- `src/servicios/aluna-followup-service.js` — 386L
- `src/servicios/aluna-followup-cron.js` — 127L (+ su propio cron con D+1, D+3, stats)
- `src/servicios/axel-followup-cron.js` — 149L (+ su propio cron con reminders)
- `src/servicios/adriana-followup-cron.js` — 49L
- `src/servicios/paula-followup-cron.js` — 27L

### Sugerencia de consolidación
1. Definir UNA arquitectura de cron: un solo scheduler que orqueste todos los jobs
2. Eliminar `src/cron/aurora-followup-cron.js` (993L) — es una versión vieja monolítica
3. Migrar los jobs únicos que tenga (24h reminder, 2h reminder, no-show, NPS) a services dedicados
4. Consolidar `follow-up-service.js` (genérico) con los services por agente

---

## 🟡 ALTO — `ensureInitialized()` Antipatrón

### Descripción
`ensureInitialized()` es una función de **validación** (throw si no está lista), NO de inicialización. Debería ser `await databaseService.initialize()` que es idempotente y realmente conecta.

### Ocurrencias (38+ total)

| Archivo | Count |
|---------|-------|
| `src/cron/aurora-followup-cron.js` | 10 |
| `src/cron/daily-report.js` | 5 |
| `src/cron/self-healing-cron.js` | 2 |
| `src/express-servidor/endpoints-api/aluna-dashboard.js` | 21 |
| `src/express-servidor/endpoints-api/aurora-dashboard.js` | ~15 |
| `src/express-servidor/endpoints-api/enzo-dashboard.js` | 5 |
| `src/express-servidor/endpoints-api/adriana-dashboard.js` | 7 |
| `src/express-servidor/endpoints-api/axel-dashboard.js` | 4 |
| `src/express-servidor/endpoints-api/gabi-dashboard.js` | 4 |
| `src/utils/code-generator.js` | 1 |
| `src/servicios/email.js` | 1 |

### Ya corregido
- ✅ `src/servicios/paula-followup-service.js` — 5 ocurrencias fijadas (commit `262ffcd`)
- ✅ `src/express-servidor/endpoints-api/paula-dashboard.js` — 5 ocurrencias fijadas (commit `262ffcd`)

### Sugerencia
Buscar-reemplazar global: `ensureInitialized()` → `initialize()` en todos los archivos listados.

---

## 🟡 ALTO — `normalizePhone()` Duplicada

### Dos implementaciones distintas

1. **`src/utils/validators.js:13`** — versión centralizada completa:
   ```js
   export function normalizePhone(phone) { ... }
   ```

2. **`src/express-servidor/endpoints-api/wassenger.js:88`** — versión inline:
   ```js
   const normalizePhone = (p) => p ? String(p).replace(/[\s+\-().]/g, '') : '';
   ```

3. **`src/servicios/axel-followup-cron.js:29`** — `isAdminPhone()` define su propia normalización inline:
   ```js
   const diegoNorm = (process.env.DIEGO_PERSONAL_PHONE || '').replace(/\D/g, '');
   ```

### Sugerencia
Eliminar las versiones locales. Importar desde `src/utils/validators.js` en todos los archivos que la usen.

---

## 🟡 ALTO — `serviceLabel` Mapping Inline (9 repeticiones)

### Descripción
El mapeo `service_type → label humano` se repite como ternario inline 9 veces:

```js
reservation.service_type === 'hot_desk' ? 'Hot Desk' :
  reservation.service_type === 'private_office' ? 'Oficina Privada' :
  reservation.service_type === 'meeting_room' ? 'Sala de Reuniones' :
  reservation.service_type;
```

### Ubicaciones
| Archivo | Líneas |
|---------|--------|
| `src/cron/aurora-followup-cron.js` | 95, 179, 257, 344, 439, 526, 757, 828 |
| `src/servicios/email-reply-reader.js` | 519 |

### Ya existe la versión centralizada
`src/servicios/aurora-followup-service.js:143` ya tiene `getServiceLabel(serviceType)`.

### Sugerencia
Mover `getServiceLabel()` a `src/utils/` y usarla desde todos los archivos.

---

## 🟡 ALTO — Email Templates Fuera del Sistema Central

### Descripción
Existen **DOS** sistemas de templates de email:

1. **`email-template-system.js`** (1351L) — sistema centralizado con `buildEmailTemplate(agent, type, data)`
   - Usado por: 13 archivos
   - Tiene templates para todos los agentes

2. **`generic-email-templates.js`** (1978L) — otro sistema con `generateEmailForAgent()`
   - Usado por: 9 archivos
   - Tiene templates por agente

### Agentes que NO usan ninguno de los dos:

| Agente | Archivo | Problema |
|--------|---------|----------|
| **Enzo followups** | `enzo-followup-service.js:232` | Define su propia `emailWrapper()` (90 líneas de HTML inline) |
| **Aluna followups** | `aluna-followup-service.js:216-386` | HTML inline completo en `buildD1EmailHTML()` y `buildD3EmailHTML()` (~170L de HTML raw) |
| **Adriana followups** | `adriana-followup-service.js:119-232` | HTML inline en `buildEmailS1HTML()`, `buildEmailS2HTML()`, `buildEmailS3HTML()` (~115L) |

### Sugerencia
Migrar los templates inline de Enzo, Aluna, y Adriana followup services al sistema centralizado `email-template-system.js`.

---

## 🟡 ALTO — `sendWhatsApp()` vs `enviarWhatsApp()`

### Descripción
Dos funciones distintas para enviar WhatsApp:

1. **`enviarWhatsApp()`** — exportada desde `wassenger.js`, usada por la mayoría de servicios
2. **`sendWhatsApp()`** — función local en `src/cron/aurora-followup-cron.js:23`, usa `dispatchHttpRequest` directo a Wassenger API

### Ubicaciones de `sendWhatsApp()` local
- `src/cron/aurora-followup-cron.js:23` (definición)
- Usada 11 veces dentro del mismo archivo (líneas 111, 197, 275, 371, 455, 539, 618, 699, 771, 854)

### Sugerencia
Al eliminar el archivo viejo, este problema se resuelve automáticamente.

---

## 🟠 MEDIO — Archivos de Código Muerto

### Archivos sin importación activa

| Archivo | Líneas | Evidencia |
|---------|--------|-----------|
| `src/servicios/marketing-confirmation.js` | ~60L | 0 imports. No se importa en ningún lado |
| `src/servicios/collision-confirmation.js` | ~60L | Solo referenciada en 1 comentario (axel-quote-code.js:11) |
| `src/servicios/adriana-followup-cron.js` | 49L | Las funciones S1/S2/S3 ya están registradas en `aurora-enzo-followup-cron.js` — ¿se usa ambas? |

### Archivos .old/.backup

| Archivo | Descripción |
|---------|-------------|
| `src/deteccion-intenciones/enzo.js.old` | Versión anterior del prompt Enzo |
| `src/deteccion-intenciones/enzo-knowledge.js.backup` | Knowledge base vieja |
| `src/express-servidor/endpoints-api/wassenger.js.backup` | Backup del handler principal |

### Sugerencia
Verificar que no hay dependencias ocultas y eliminar. Git preserva el historial.

---

## 🟠 MEDIO — Cron por Agente Fragmentados (patrón idéntico)

### Descripción
Cada agente tiene su propio archivo de cron con el **MISMO** boilerplate:

```js
new CronJob(cronExpr, async () => {
  try {
    const result = await processorFn();
    logger.info(`[AGENT] ✅ ${result.sent} enviados`);
  } catch (err) {
    logger.error(`[AGENT] ❌ Error:`, err);
  }
}, null, true, 'America/Guayaquil');
```

### Archivos con este patrón idéntico
- `src/servicios/adriana-followup-cron.js` — 3 jobs, 49 líneas
- `src/servicios/paula-followup-cron.js` — 1 job, 27 líneas
- `src/servicios/aluna-followup-cron.js` — 3 jobs, 127 líneas
- `src/servicios/axel-followup-cron.js` — 2 jobs, 149 líneas
- `src/servicios/aurora-enzo-followup-cron.js` — 8 jobs, 180 líneas

**Total: 532 líneas** de boilerplate repetitivo.

### Sugerencia
Crear un factory:
```js
function registerAgentCron(tag, cronExpr, processorFn) {
  return new CronJob(cronExpr, async () => {
    try {
      const result = await processorFn();
      logger.info(`[CRON-${tag}] ✅ ${result.sent} enviados`);
    } catch (err) { logger.error(`[CRON-${tag}] ❌`, err); }
  }, null, true, 'America/Guayaquil');
}
```

---

## 🟠 MEDIO — Aluna DB Access Inconsistente

### Descripción
`aluna-followup-service.js` usa `import { query } from '../database/database.js'` (la función `query` directa), mientras todos los demás servicios usan `import databaseService from '../database/database.js'` y llaman `databaseService.all()`, `databaseService.get()`, etc.

| Archivo | Patrón |
|---------|--------|
| `aluna-followup-service.js` | `const leads = await query(...)` → `leads.rows` |
| Todos los demás | `const leads = await databaseService.all(...)` → `leads` |

Esto causa diferencias sutiles: `query()` devuelve `{ rows }`, `databaseService.all()` devuelve el array directamente.

---

## 🟢 BAJO — Seed-Demo Endpoints Repetidos

Tres dashboards tienen endpoints `/seed-demo` con la misma estructura:
- `adriana-dashboard.js:152`
- `aluna-dashboard.js:614`
- `paula-dashboard.js:128`

Cada uno inserta datos de demo diferentes pero el patrón es idéntico. Bajo impacto, cada agente tiene datos distintos.

---

## 🟢 BAJO — Dos Confirmation Flow Systems

1. `src/servicios/confirmation-flow.js` (1136L) — Aurora-specific confirmation
2. `src/servicios/generic-confirmation-flow.js` (620L) — Generic for all agents

`confirmation-flow.js` ya importa `isPositiveResponse` y `isNegativeResponse` desde `generic-confirmation-flow.js`, lo cual sugiere que se intentó consolidar pero quedó a medias. El refactor aquí es complejo y de bajo riesgo funcional.

---

## 📈 Plan de Acción Recomendado (ordenado por impacto)

### Sprint 1 — Desduplicar Crons (CRÍTICO, ~2h)
1. Elegir UNA arquitectura de scheduling
2. Deshabilitar `startAuroraFollowupCrons()` de index.js
3. Migrar jobs únicos (24h, 2h, no-show, NPS) del cron viejo a services
4. Eliminar `src/cron/aurora-followup-cron.js` (993 líneas liberadas)

### Sprint 2 — Fix ensureInitialized global (~1h)
1. Buscar-reemplazar en 6 archivos: `ensureInitialized()` → `initialize()`
2. Verificar con `node --check`

### Sprint 3 — Consolidar utilidades (~1h)
1. Mover `getServiceLabel()` a `src/utils/formatters.js`
2. Eliminar `normalizePhone` local de wassenger.js, importar de validators.js
3. Eliminar `isAdminPhone` local de axel-followup-cron.js, importar de validators.js o wassenger.js

### Sprint 4 — Limpiar código muerto (~30min)
1. Eliminar `marketing-confirmation.js`, `collision-confirmation.js`
2. Eliminar archivos `.old` y `.backup`
3. Verificar y limpiar `adriana-followup-cron.js` (si está duplicado por aurora-enzo-cron)

### Sprint 5 — Email templates (~2h)
1. Migrar Enzo emailWrapper → buildEmailTemplate
2. Migrar Aluna HTML inline → buildEmailTemplate
3. Migrar Adriana followup HTML → buildEmailTemplate

---

## 📏 Métricas del Repo

| Concepto | Valor |
|----------|-------|
| Archivos en `src/servicios/` | 102 |
| Líneas en `src/servicios/` | 39,603 |
| Líneas en wassenger.js | 4,331 |
| Followup code total | ~3,100L |
| Dashboard endpoints total | ~4,000L |
| Email template code total | ~4,525L |
| Líneas potencialmente eliminables | ~2,500–3,000 |
